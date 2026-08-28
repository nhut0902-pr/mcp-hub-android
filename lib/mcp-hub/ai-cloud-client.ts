import Constants from "expo-constants";
import * as Auth from "@/lib/_core/auth";

const fallbackUrl = "https://mcp-hub-ai-cloud.vercel.app";
export const AI_CLOUD_PROXY_URL = String(Constants.expoConfig?.extra?.aiCloudProxyUrl ?? fallbackUrl).replace(/\/$/, "");

export class AiCloudAuthenticationRequiredError extends Error {
  constructor() {
    super("Bạn cần đăng nhập để sử dụng Nhutbot 1.0 Flash.");
    this.name = "AiCloudAuthenticationRequiredError";
  }
}

async function callAiCloud(path: string, init: RequestInit = {}): Promise<unknown> {
  const sessionToken = await Auth.getSessionToken();
  if (!sessionToken) throw new AiCloudAuthenticationRequiredError();
  const response = await fetch(`${AI_CLOUD_PROXY_URL}${path}`, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}`, ...(init.headers ?? {}) },
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`AI Cloud trả về HTTP ${response.status}${raw ? `: ${raw.slice(0, 240).replace(/\s+/g, " ")}` : ""}`);
  try { return JSON.parse(raw); } catch { throw new Error("AI Cloud không trả về JSON hợp lệ."); }
}

export function listAiCloudModelsFromProxy(): Promise<unknown> {
  return callAiCloud("/api/models");
}

export function sendAiCloudChatFromProxy(payload: Record<string, unknown>): Promise<unknown> {
  return callAiCloud("/api/chat", { method: "POST", body: JSON.stringify(payload) });
}
