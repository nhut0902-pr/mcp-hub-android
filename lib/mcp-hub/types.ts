export type ProviderKind = "nvidia" | "groq" | "openrouter" | "custom";
export type McpTransport = "streamable-http" | "sse" | "stdio";
export type McpAuthMode = "none" | "api-key" | "oauth";

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
  apiKeyStored: boolean;
  oauthTokenStored: boolean;
  oauthIssuer: string;
  oauthClientId: string;
  oauthScopes: string;
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
      { ...createProvider("ai-cloud", "custom", "AI Cloud", "https://chatgpt-api.chocode.com.vn/v1", "https://chatgpt-api.chocode.com.vn/v1/models"), managedByApp: true, enabled: true },
    ],
    models: [],
    mcpServers: [],
  };
}

export const providerKindLabel: Record<ProviderKind, string> = { nvidia: "NVIDIA NIM", groq: "Groq", openrouter: "OpenRouter", custom: "Tuỳ chỉnh" };
export const mcpTransportLabel: Record<McpTransport, string> = { "streamable-http": "Streamable HTTP", sse: "Server-Sent Events", stdio: "stdio (cục bộ)" };
export const mcpAuthLabel: Record<McpAuthMode, string> = { none: "Không xác thực", "api-key": "API key", oauth: "OAuth" };
