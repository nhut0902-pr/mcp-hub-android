import type { McpApiKeyHeader, McpAuthMode } from "./types";

export function buildMcpAuthHeaders(authMode: McpAuthMode, credential: string | null, apiKeyHeader: McpApiKeyHeader = "authorization"): Record<string, string> {
  if (!credential?.trim() || authMode === "none") return {};
  if (authMode === "api-key" && apiKeyHeader === "x-api-key") return { "x-api-key": credential.trim() };
  return { Authorization: `Bearer ${credential.trim()}` };
}

export function mcpCredentialHint(authMode: McpAuthMode, apiKeyHeader: McpApiKeyHeader = "authorization"): string {
  if (authMode === "api-key") return apiKeyHeader === "x-api-key" ? "API key sẽ được gửi theo header x-api-key (dùng cho Composio)." : "API key sẽ được gửi theo Authorization: Bearer <key>.";
  if (authMode === "oauth") return "Access token OAuth sẽ được gửi theo Authorization: Bearer <token>.";
  return "Endpoint sẽ được gọi mà không đính kèm thông tin xác thực.";
}
