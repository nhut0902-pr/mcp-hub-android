import { buildMcpAuthHeaders } from "./mcp-auth";
import type { McpConnectionResult, McpServerConfig } from "./types";

const TIMEOUT_MS = 12_000;
const MCP_PROTOCOL_VERSION = "2025-03-26";

export type McpToolDefinition = {
  serverId: string;
  serverName: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type McpToolCallResult = {
  serverId: string;
  serverName: string;
  toolName: string;
  content: unknown[];
  isError: boolean;
};

type RpcEnvelope = { result?: Record<string, unknown>; error?: unknown };
type RpcResponse = { payload: RpcEnvelope | null; sessionId: string | null; httpStatus: number };

function responseDetail(status: number, body: string): string {
  if (status === 401) return "Server yêu cầu xác thực. Hãy nhấn Đăng nhập OAuth hoặc kiểm tra API key rồi thử lại.";
  if (status === 403) return "Token hợp lệ nhưng chưa có quyền hoặc scope cần thiết.";
  if (status === 404 || status === 405) return "URL hoặc transport chưa đúng. Hãy thử Streamable HTTP thay vì SSE (hoặc ngược lại).";
  if (status === 406) return "Server không chấp nhận kiểu phản hồi MCP. Hãy kiểm tra lại transport.";
  const safeBody = body.replace(/\s+/g, " ").trim().slice(0, 170);
  return safeBody ? `Server trả HTTP ${status}: ${safeBody}` : `Server trả HTTP ${status}.`;
}

function parseJsonRpcResponse(body: string): RpcEnvelope | null {
  const candidates = [body, ...body.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim())];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as RpcEnvelope;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // Streamable HTTP may use SSE framing or send an empty 202 response.
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

function ensureRunnableServer(server: McpServerConfig): void {
  if (server.transport === "stdio") throw new Error("Android không chạy command stdio cục bộ. Hãy dùng Streamable HTTP/SSE hoặc chạy stdio trên máy tính.");
  if (server.transport === "sse") throw new Error("SSE profile đã kết nối nhưng chưa hỗ trợ gọi tool trực tiếp trên Android. Hãy dùng endpoint Streamable HTTP của server nếu có.");
  if (!isValidRemoteEndpoint(server.endpoint)) throw new Error("URL MCP không hợp lệ. URL phải bắt đầu bằng https:// hoặc http://.");
}

async function postRpc(server: McpServerConfig, credential: string | null, request: Record<string, unknown>, sessionId?: string | null): Promise<RpcResponse> {
  ensureRunnableServer(server);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(server.endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
        "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
        ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
        ...buildMcpAuthHeaders(server.authMode, credential, server.apiKeyHeader),
      },
      signal: controller.signal,
      body: JSON.stringify(request),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(responseDetail(response.status, body));
    return { payload: parseJsonRpcResponse(body), sessionId: response.headers.get("mcp-session-id"), httpStatus: response.status };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("MCP phản hồi quá chậm. Không có phản hồi trong 12 giây; kiểm tra mạng, URL và transport.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function initializeSession(server: McpServerConfig, credential: string | null): Promise<RpcResponse> {
  const initialized = await postRpc(server, credential, {
    jsonrpc: "2.0",
    id: `mcp-hub-init-${Date.now()}`,
    method: "initialize",
    params: { protocolVersion: MCP_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "MCP Hub", version: "1.0.9" } },
  });
  if (initialized.payload?.error) throw new Error(`MCP từ chối initialize: ${JSON.stringify(initialized.payload.error).slice(0, 180)}`);
  if (initialized.sessionId) {
    // Notification is best-effort; older stateless servers do not require it.
    await postRpc(server, credential, { jsonrpc: "2.0", method: "notifications/initialized", params: {} }, initialized.sessionId).catch(() => undefined);
  }
  return initialized;
}

function parseTools(server: McpServerConfig, payload: RpcEnvelope | null): McpToolDefinition[] {
  if (payload?.error) throw new Error(`MCP không thể liệt kê tools: ${JSON.stringify(payload.error).slice(0, 180)}`);
  const candidates = (payload?.result?.tools ?? []) as unknown[];
  if (!Array.isArray(candidates)) throw new Error("MCP trả tools/list không đúng định dạng.");
  return candidates
    .filter((tool): tool is Record<string, unknown> => {
      if (!tool || typeof tool !== "object") return false;
      return typeof (tool as Record<string, unknown>).name === "string";
    })
    .slice(0, 24)
    .map((tool) => ({
      serverId: server.id,
      serverName: server.name,
      name: String(tool.name),
      description: typeof tool.description === "string" ? tool.description : "MCP tool",
      inputSchema: tool.inputSchema && typeof tool.inputSchema === "object" ? tool.inputSchema as Record<string, unknown> : { type: "object", properties: {} },
    }));
}

export async function listMcpTools(server: McpServerConfig, credential: string | null): Promise<McpToolDefinition[]> {
  const initialized = await initializeSession(server, credential);
  const response = await postRpc(server, credential, { jsonrpc: "2.0", id: `mcp-hub-tools-${Date.now()}`, method: "tools/list", params: {} }, initialized.sessionId);
  return parseTools(server, response.payload);
}

export async function callMcpTool(server: McpServerConfig, credential: string | null, toolName: string, argumentsValue: Record<string, unknown>): Promise<McpToolCallResult> {
  const initialized = await initializeSession(server, credential);
  const response = await postRpc(server, credential, { jsonrpc: "2.0", id: `mcp-hub-call-${Date.now()}`, method: "tools/call", params: { name: toolName, arguments: argumentsValue } }, initialized.sessionId);
  if (response.payload?.error) throw new Error(`MCP không thể chạy ${toolName}: ${JSON.stringify(response.payload.error).slice(0, 180)}`);
  const result = response.payload?.result ?? {};
  return { serverId: server.id, serverName: server.name, toolName, content: Array.isArray(result.content) ? result.content : [], isError: result.isError === true };
}

export async function testMcpConnection(server: McpServerConfig, credential: string | null): Promise<McpConnectionResult> {
  if (server.transport === "stdio") return { status: "unsupported", title: "Profile stdio đã lưu", detail: "Android không chạy command cục bộ. Hãy dùng Streamable HTTP/SSE cho kết nối từ app, hoặc chạy stdio trên máy tính." };
  if (!isValidRemoteEndpoint(server.endpoint)) return { status: "failed", title: "URL MCP không hợp lệ", detail: "Nhập URL đầy đủ bắt đầu bằng https:// hoặc http://." };
  if (server.authMode !== "none" && !credential?.trim()) return { status: "auth-required", title: "Thiếu thông tin xác thực", detail: server.authMode === "oauth" ? "Nhấn Đăng nhập OAuth để cấp quyền, hoặc dán access token do server cấp." : "Lưu API key trước khi kiểm tra kết nối." };

  if (server.transport === "sse") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(server.endpoint, { method: "GET", headers: { Accept: "text/event-stream", ...buildMcpAuthHeaders(server.authMode, credential, server.apiKeyHeader) }, signal: controller.signal });
      if (!response.ok) return { status: response.status === 401 ? "auth-required" : "failed", title: response.status === 401 ? "Cần xác thực MCP" : "Không thể kết nối MCP", detail: responseDetail(response.status, await response.text()), httpStatus: response.status };
      return { status: "connected", title: "Kết nối SSE sẵn sàng", detail: "Đã mở endpoint SSE. Nếu server có Streamable HTTP, dùng transport đó để Chat gọi tool.", httpStatus: response.status };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      return { status: "failed", title: timedOut ? "MCP phản hồi quá chậm" : "Không thể kết nối MCP", detail: timedOut ? "Không có phản hồi trong 12 giây. Kiểm tra mạng, URL và transport." : error instanceof Error ? error.message : "Lỗi mạng không xác định." };
    } finally { clearTimeout(timer); }
  }

  try {
    const initialized = await initializeSession(server, credential);
    const info = initialized.payload?.result?.serverInfo as { name?: string; version?: string } | undefined;
    const serverName = info?.name?.trim() || server.name;
    const version = info?.version ? ` · v${info.version}` : "";
    return { status: "connected", title: "Kết nối MCP thành công", detail: `Đã hoàn tất initialize với ${serverName}${version}. Chat có thể tải danh sách tool khi bạn gửi yêu cầu.`, httpStatus: initialized.httpStatus, detectedServerName: serverName };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Lỗi mạng không xác định.";
    return { status: detail.includes("xác thực") || detail.includes("OAuth") ? "auth-required" : "failed", title: detail.includes("xác thực") || detail.includes("OAuth") ? "Cần xác thực MCP" : "Không thể kết nối MCP", detail };
  }
}
