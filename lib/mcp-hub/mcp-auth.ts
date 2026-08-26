import type { McpAuthMode } from "./types";

export function buildMcpAuthHeaders(authMode: McpAuthMode, credential: string | null): Record<string, string> {
  if (!credential?.trim() || authMode === "none") return {};
  return { Authorization: `Bearer ${credential.trim()}` };
}

export function mcpCredentialHint(authMode: McpAuthMode): string {
  if (authMode === "api-key") return "API key sẽ được gửi theo Authorization: Bearer <key>.";
  if (authMode === "oauth") return "Access token OAuth sẽ được gửi theo Authorization: Bearer <token>.";
  return "Endpoint sẽ được gọi mà không đính kèm thông tin xác thực.";
}
