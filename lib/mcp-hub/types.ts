export type ProviderKind = "nvidia" | "groq" | "openrouter" | "anthropic" | "gemini" | "openai" | "custom";
export type McpTransport = "streamable-http" | "sse" | "stdio";
export type McpAuthMode = "none" | "api-key" | "oauth";
export type McpApiKeyHeader = "authorization" | "x-api-key";
export type McpConnectionStatus = "idle" | "checking" | "connected" | "auth-required" | "failed" | "unsupported";

export interface McpConnectionResult {
  status: Exclude<McpConnectionStatus, "idle" | "checking">;
  title: string;
  detail: string;
  httpStatus?: number;
  detectedServerName?: string;
}

export interface ProviderConfig {
  id: string;
  kind: ProviderKind;
  name: string;
  apiBaseUrl: string;
  modelsUrl: string;
  headersJson: string;
  managedByApp?: boolean;
  enabled: boolean;
  apiKeyStored: boolean;
  preferredModelId: string | null;
  pinnedModelIds: string[];
  modelCount: number;
  lastSyncedAt: string | null;
}

export interface ModelRecord {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string;
  imageUrl?: string | null;
  contextLength: number | null;
  supportsThinking: boolean;
  supportsWebSearch: boolean;
  updatedAt: string;
}

export interface McpServerConfig {
  id: string;
  name: string;
  transport: McpTransport;
  endpoint: string;
  command: string;
  args: string;
  authMode: McpAuthMode;
  apiKeyHeader?: McpApiKeyHeader;
  apiKeyStored: boolean;
  oauthTokenStored: boolean;
  oauthIssuer: string;
  oauthClientId: string;
  oauthScopes: string;
  connectionStatus?: McpConnectionStatus;
  connectionDetail?: string | null;
  lastCheckedAt?: string | null;
  detectedServerName?: string | null;
  enabled: boolean;
  updatedAt: string;
}

export interface AppState {
  providers: ProviderConfig[];
  models: ModelRecord[];
  mcpServers: McpServerConfig[];
}

const createProvider = (id: string, kind: ProviderKind, name: string, apiBaseUrl: string, modelsUrl: string): ProviderConfig => ({
  id,
  kind,
  name,
  apiBaseUrl,
  modelsUrl,
  headersJson: "{}",
  enabled: false,
  apiKeyStored: false,
  preferredModelId: null,
  pinnedModelIds: [],
  modelCount: 0,
  lastSyncedAt: null,
});

export function createInitialState(): AppState {
  return {
    providers: [
      createProvider("nvidia-nim", "nvidia", "NVIDIA NIM", "https://integrate.api.nvidia.com/v1", "https://integrate.api.nvidia.com/v1/models"),
      createProvider("groq", "groq", "Groq", "https://api.groq.com/openai/v1", "https://api.groq.com/openai/v1/models"),
      createProvider("openrouter", "openrouter", "OpenRouter", "https://openrouter.ai/api/v1", "https://openrouter.ai/api/v1/models"),
      createProvider("openai", "openai", "OpenAI", "https://api.openai.com/v1", "https://api.openai.com/v1/models"),
      createProvider("gemini", "gemini", "Google Gemini", "https://generativelanguage.googleapis.com/v1beta/openai", "https://generativelanguage.googleapis.com/v1beta/models"),
      createProvider("claude", "anthropic", "Claude", "https://api.anthropic.com/v1", "https://api.anthropic.com/v1/models"),
      { ...createProvider("ai-cloud", "custom", "AI Cloud", "https://chatgpt-api.chocode.com.vn/v1", "https://chatgpt-api.chocode.com.vn/v1/models"), managedByApp: true, enabled: true, preferredModelId: "gemini-1.5-flash", pinnedModelIds: ["gemini-1.5-flash"], modelCount: 1 },
    ],
    models: [{ id: "ai-cloud:gemini-1.5-flash", providerId: "ai-cloud", modelId: "gemini-1.5-flash", displayName: "Nhutbot 1.0 Flash", imageUrl: null, contextLength: null, supportsThinking: false, supportsWebSearch: false, updatedAt: new Date().toISOString() }],
    mcpServers: [],
  };
}

export const providerKindLabel: Record<ProviderKind, string> = { nvidia: "NVIDIA NIM", groq: "Groq", openrouter: "OpenRouter", anthropic: "Claude", gemini: "Google Gemini", openai: "OpenAI", custom: "Tuỳ chỉnh" };
export const mcpTransportLabel: Record<McpTransport, string> = { "streamable-http": "Streamable HTTP", sse: "Server-Sent Events", stdio: "stdio (cục bộ)" };
export const mcpAuthLabel: Record<McpAuthMode, string> = { none: "Không xác thực", "api-key": "API key", oauth: "OAuth" };
export const mcpApiKeyHeaderLabel: Record<McpApiKeyHeader, string> = { authorization: "Authorization: Bearer", "x-api-key": "x-api-key" };
