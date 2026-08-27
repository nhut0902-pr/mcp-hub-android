import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import type { McpServerConfig } from "./types";

const MCP_CLIENT_ID = "https://mcp-hub-android.vercel.app/mcp-oauth-client.json";
const MCP_REDIRECT_URI = "mcphub://mcp-oauth";

type ProtectedResourceMetadata = { authorization_servers?: string[]; scopes_supported?: string[] };
type AuthorizationServerMetadata = { authorization_endpoint?: string; token_endpoint?: string; registration_endpoint?: string; client_id_metadata_document_supported?: boolean };

function base64Url(value: string): string { return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }

function bytesToBase64Url(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const value = (bytes[index] << 16) | ((bytes[index + 1] ?? 0) << 8) | (bytes[index + 2] ?? 0);
    encoded += alphabet[(value >> 18) & 63];
    encoded += alphabet[(value >> 12) & 63];
    encoded += index + 1 < bytes.length ? alphabet[(value >> 6) & 63] : "=";
    encoded += index + 2 < bytes.length ? alphabet[value & 63] : "=";
  }
  return base64Url(encoded);
}

function normalizedResource(endpoint: string): string {
  const url = new URL(endpoint);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function metadataFallbacks(endpoint: string): string[] {
  const url = new URL(endpoint);
  const path = url.pathname.replace(/\/$/, "");
  const base = `${url.protocol}//${url.host}`;
  return [...(path ? [`${base}/.well-known/oauth-protected-resource${path}`] : []), `${base}/.well-known/oauth-protected-resource`];
}

function metadataUrls(issuer: string): string[] {
  const url = new URL(issuer);
  const base = `${url.protocol}//${url.host}`;
  const path = url.pathname.replace(/\/$/, "");
  return path
    ? [`${base}/.well-known/oauth-authorization-server${path}`, `${base}/.well-known/openid-configuration${path}`, `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`]
    : [`${base}/.well-known/oauth-authorization-server`, `${base}/.well-known/openid-configuration`];
}

function getResourceMetadataUrl(header: string | null): string | null {
  const match = header?.match(/resource_metadata="([^"]+)"/i);
  return match?.[1] ?? null;
}

async function loadJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch { return null; }
}

async function discoverOAuth(server: McpServerConfig): Promise<{ resource: string; scopes: string[]; metadata: AuthorizationServerMetadata }> {
  if (server.transport !== "streamable-http") throw new Error("Đăng nhập tự động chỉ dùng được với Streamable HTTP. Hãy chọn endpoint Streamable HTTP của server.");
  const resource = normalizedResource(server.endpoint);
  const initial = await fetch(server.endpoint, {
    method: "POST",
    headers: { Accept: "application/json, text/event-stream", "Content-Type": "application/json", "MCP-Protocol-Version": "2025-03-26" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "mcp-hub-oauth-discovery", method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "MCP Hub", version: "1.0.6" } } }),
  }).catch(() => null);
  if (!initial) throw new Error("Không thể liên hệ MCP để khám phá OAuth. Kiểm tra URL và mạng rồi thử lại.");
  if (initial.status !== 401) throw new Error(initial.ok ? "MCP này không yêu cầu OAuth. Chọn Không xác thực hoặc API key rồi lưu & kiểm tra." : `MCP trả HTTP ${initial.status}; server không cung cấp thử thách OAuth chuẩn.`);

  const pointedMetadata = getResourceMetadataUrl(initial.headers.get("www-authenticate"));
  const resourceMetadata = pointedMetadata ? await loadJson<ProtectedResourceMetadata>(pointedMetadata) : await (async () => {
    for (const candidate of metadataFallbacks(server.endpoint)) {
      const found = await loadJson<ProtectedResourceMetadata>(candidate);
      if (found?.authorization_servers?.length) return found;
    }
    return null;
  })();
  const issuer = server.oauthIssuer.trim() || resourceMetadata?.authorization_servers?.[0];
  if (!issuer) throw new Error("MCP yêu cầu xác thực nhưng không công bố OAuth metadata. Dùng token/API key do nhà cung cấp cấp hoặc xem tài liệu server.");
  for (const candidate of metadataUrls(issuer)) {
    const metadata = await loadJson<AuthorizationServerMetadata>(candidate);
    if (metadata?.authorization_endpoint && metadata.token_endpoint) return { resource, scopes: resourceMetadata?.scopes_supported ?? [], metadata };
  }
  throw new Error("Không đọc được OAuth/OIDC metadata của server. Thử nhập OAuth issuer chính xác hoặc dùng token do nhà cung cấp cấp.");
}

async function clientIdFor(metadata: AuthorizationServerMetadata, server: McpServerConfig): Promise<string> {
  if (server.oauthClientId.trim()) return server.oauthClientId.trim();
  if (metadata.client_id_metadata_document_supported) return MCP_CLIENT_ID;
  if (!metadata.registration_endpoint) throw new Error("OAuth server này cần Client ID được đăng ký sẵn. Nhập Client ID do nhà cung cấp MCP cấp trong form OAuth.");
  const response = await fetch(metadata.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_name: "MCP Hub", redirect_uris: [MCP_REDIRECT_URI], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" }),
  });
  if (!response.ok) throw new Error("OAuth server không cho đăng ký client tự động. Nhập Client ID do nhà cung cấp MCP cấp.");
  const registration = await response.json() as { client_id?: string };
  if (!registration.client_id) throw new Error("OAuth server không trả Client ID sau khi đăng ký.");
  return registration.client_id;
}

export async function startMcpOAuthLogin(server: McpServerConfig): Promise<{ accessToken: string; issuer: string; clientId: string; scopes: string }> {
  const { resource, scopes, metadata } = await discoverOAuth(server);
  const clientId = await clientIdFor(metadata, server);
  const verifier = bytesToBase64Url(await Crypto.getRandomBytesAsync(48));
  const challenge = base64Url(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 }));
  const state = bytesToBase64Url(await Crypto.getRandomBytesAsync(24));
  const authorizeUrl = new URL(metadata.authorization_endpoint!);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", MCP_REDIRECT_URI);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("resource", resource);
  const scope = server.oauthScopes.trim() || scopes.join(" ");
  if (scope) authorizeUrl.searchParams.set("scope", scope);

  const authResult = await WebBrowser.openAuthSessionAsync(authorizeUrl.toString(), MCP_REDIRECT_URI);
  if (authResult.type !== "success") throw new Error(authResult.type === "cancel" ? "Bạn đã đóng trang đăng nhập trước khi hoàn tất." : "Không nhận được callback OAuth từ server.");
  const callback = new URL(authResult.url);
  if (callback.searchParams.get("state") !== state) throw new Error("OAuth state không khớp. Đăng nhập đã bị hủy để bảo vệ tài khoản.");
  const error = callback.searchParams.get("error");
  if (error) throw new Error(`Đăng nhập OAuth không thành công: ${callback.searchParams.get("error_description") ?? error}`);
  const code = callback.searchParams.get("code");
  if (!code) throw new Error("OAuth callback không có authorization code.");
  const tokenResponse = await fetch(metadata.token_endpoint!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, code, redirect_uri: MCP_REDIRECT_URI, code_verifier: verifier, resource }).toString(),
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({})) as { access_token?: string; error_description?: string; error?: string };
  if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error(`Không đổi được OAuth token: ${tokenPayload.error_description ?? tokenPayload.error ?? `HTTP ${tokenResponse.status}`}`);
  return { accessToken: tokenPayload.access_token, issuer: server.oauthIssuer.trim(), clientId, scopes: scope };
}
