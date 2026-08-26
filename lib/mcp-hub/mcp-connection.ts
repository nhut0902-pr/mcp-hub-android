import { buildMcpAuthHeaders } from "./mcp-auth";
import type { McpConnectionResult, McpServerConfig } from "./types";

const TIMEOUT_MS = 12_000;
const MCP_PROTOCOL_VERSION = "2025-03-26";

function responseDetail(status: number, body: string): string {
  if (status === 401) return "Server yêu cầu xác thực. Kiểm tra API key/OAuth token rồi thử lại.";
  if (status === 403) return "Token hợp lệ nhưng chưa có quyền hoặc scope cần thiết.";
  if (status === 404 || status === 405) return "URL hoặc transport chưa đúng. Hãy thử Streamable HTTP thay vì SSE (hoặc ngược lại).";
  if (status === 406) return "Server không chấp nhận kiểu phản hồi MCP. Hãy kiểm tra lại transport.";
  const safeBody = body.replace(/\s+/g, " ").trim().slice(0, 170);
  return safeBody ? `Server trả HTTP ${status}: ${safeBody}` : `Server trả HTTP ${status}.`;
}

function parseJsonRpcResponse(body: string): Record<string, unknown> | null {
  const candidates = [body, ...body.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim())];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // A Streamable HTTP endpoint may return an empty 202 response or SSE framing.
    }
  }
  return null;
}

function isValidRemoteEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function testMcpConnection(server: McpServerConfig, credential: string | null): Promise<McpConnectionResult> {
  if (server.transport === "stdio") {
    return {
      status: "unsupported",
      title: "Profile stdio đã lưu",
      detail: "Android không chạy command cục bộ. Hãy dùng Streamable HTTP/SSE cho kết nối từ app, hoặc chạy stdio trên máy tính.",
    };
  }
  if (!isValidRemoteEndpoint(server.endpoint)) {
    return { status: "failed", title: "URL MCP không hợp lệ", detail: "Nhập URL đầy đủ bắt đầu bằng https:// hoặc http://." };
  }
  if (server.authMode !== "none" && !credential?.trim()) {
    return { status: "auth-required", title: "Thiếu thông tin xác thực", detail: "Lưu API key hoặc OAuth access token trước khi kiểm tra kết nối." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const headers = {
    Accept: "application/json, text/event-stream",
    ...buildMcpAuthHeaders(server.authMode, credential, server.apiKeyHeader),
  };

  try {
    if (server.transport === "sse") {
      const response = await fetch(server.endpoint, { method: "GET", headers: { ...headers, Accept: "text/event-stream" }, signal: controller.signal });
      if (!response.ok) return { status: response.status === 401 ? "auth-required" : "failed", title: response.status === 401 ? "Cần xác thực MCP" : "Không thể kết nối MCP", detail: responseDetail(response.status, await response.text()) };
      return { status: "connected", title: "Kết nối SSE sẵn sàng", detail: "Đã mở được endpoint SSE. Server sẽ nhận lệnh MCP khi agent gọi tool.", httpStatus: response.status };
    }

    const response = await fetch(server.endpoint, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json", "MCP-Protocol-Version": MCP_PROTOCOL_VERSION },
      signal: controller.signal,
      body: JSON.stringify({ jsonrpc: "2.0", id: "mcp-hub-initialize", method: "initialize", params: { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "MCP Hub", version: "1.0.4" } } }),
    });
    const body = await response.text();
    if (!response.ok) return { status: response.status === 401 ? "auth-required" : "failed", title: response.status === 401 ? "Cần xác thực MCP" : "Không thể kết nối MCP", detail: responseDetail(response.status, body), httpStatus: response.status };
    if (response.status === 202 && !body.trim()) return { status: "connected", title: "MCP đã nhận yêu cầu", detail: "Endpoint chấp nhận initialize (HTTP 202).", httpStatus: response.status };

    const payload = parseJsonRpcResponse(body);
    const result = payload?.result as { serverInfo?: { name?: string; version?: string } } | undefined;
    if (result) {
      const serverName = result.serverInfo?.name?.trim() || server.name;
      const version = result.serverInfo?.version ? ` · v${result.serverInfo.version}` : "";
      return { status: "connected", title: "Kết nối MCP thành công", detail: `Đã hoàn tất initialize với ${serverName}${version}.`, httpStatus: response.status, detectedServerName: serverName };
    }
    if (payload?.error) return { status: "failed", title: "Server từ chối initialize", detail: `MCP trả JSON-RPC error: ${JSON.stringify(payload.error).slice(0, 180)}`, httpStatus: response.status };
    return { status: "connected", title: "Endpoint MCP phản hồi", detail: "Server phản hồi HTTP thành công nhưng không trả metadata initialize. Hãy thử gọi tool sau khi chat hỗ trợ MCP.", httpStatus: response.status };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return { status: "failed", title: timedOut ? "MCP phản hồi quá chậm" : "Không thể kết nối MCP", detail: timedOut ? "Không có phản hồi trong 12 giây. Kiểm tra mạng, URL và transport." : error instanceof Error ? error.message : "Lỗi mạng không xác định." };
  } finally {
    clearTimeout(timer);
  }
}
