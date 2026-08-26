import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AppState, McpServerConfig, ProviderConfig } from "./types";
import { createInitialState } from "./types";
import { normalizePinnedModelIds } from "./pinned-models";
import { withStartupTimeout } from "./startup";

const STATE_KEY = "mcp-hub.state.v1";
const keyForProvider = (providerId: string) => `mcp-hub.key.${providerId}`;
const keyForMcp = (serverId: string, kind: "api" | "oauth") => `mcp-hub.mcp.${kind}.${serverId}`;

function getWebStore(): Storage | null { return typeof localStorage === "undefined" ? null : localStorage; }
async function readSecret(key: string): Promise<string | null> { return Platform.OS === "web" ? getWebStore()?.getItem(key) ?? null : SecureStore.getItemAsync(key); }
async function writeSecret(key: string, value: string): Promise<void> { if (Platform.OS === "web") { getWebStore()?.setItem(key, value); return; } await SecureStore.setItemAsync(key, value); }
async function removeSecret(key: string): Promise<void> { if (Platform.OS === "web") { getWebStore()?.removeItem(key); return; } await SecureStore.deleteItemAsync(key); }

function normalizeMcpServer(server: McpServerConfig): McpServerConfig {
  return {
    ...server,
    authMode: server.authMode ?? "none",
    apiKeyStored: server.apiKeyStored ?? false,
    oauthTokenStored: server.oauthTokenStored ?? false,
    oauthIssuer: server.oauthIssuer ?? "",
    oauthClientId: server.oauthClientId ?? "",
    oauthScopes: server.oauthScopes ?? "",
  };
}

function normalizeProvider(provider: ProviderConfig): ProviderConfig {
  const pinnedModelIds = normalizePinnedModelIds(provider.pinnedModelIds, provider.preferredModelId);
  return { ...provider, managedByApp: provider.managedByApp ?? provider.id === "ai-cloud", pinnedModelIds, preferredModelId: pinnedModelIds[0] ?? null };
}

function ensureManagedProviders(providers: ProviderConfig[]): ProviderConfig[] {
  const managed = createInitialState().providers.filter((provider) => provider.managedByApp);
  return [
    ...providers.map((provider) => provider.id === "ai-cloud"
      ? { ...provider, enabled: true, preferredModelId: "gemini-1.5-flash", pinnedModelIds: ["gemini-1.5-flash"] }
      : provider),
    ...managed.filter((provider) => !providers.some((existing) => existing.id === provider.id)),
  ];
}

function parseState(value: string | null): AppState {
  if (!value) return createInitialState();
  try {
    const parsed = JSON.parse(value) as Partial<AppState>;
    if (!Array.isArray(parsed.providers) || !Array.isArray(parsed.models) || !Array.isArray(parsed.mcpServers)) return createInitialState();
    return {
      providers: ensureManagedProviders((parsed.providers as ProviderConfig[]).map(normalizeProvider)),
      models: ensureAiCloudModel((parsed.models as AppState["models"]).map((model) => ({ ...model, supportsThinking: model.supportsThinking ?? false, supportsWebSearch: model.supportsWebSearch ?? false }))),
      mcpServers: (parsed.mcpServers as McpServerConfig[]).map(normalizeMcpServer),
    };
  } catch { return createInitialState(); }
}

function ensureAiCloudModel(models: AppState["models"]): AppState["models"] {
  const defaults = createInitialState().models.filter((model) => model.providerId === "ai-cloud");
  const nonCloudModels = models.filter((model) => model.providerId !== "ai-cloud");
  return [...nonCloudModels, ...defaults];
}

export async function loadAppState(): Promise<AppState> {
  const storedState = await withStartupTimeout(AsyncStorage.getItem(STATE_KEY), null);
  return parseState(storedState);
}
export async function saveAppState(state: AppState): Promise<void> { await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state)); }
export async function getProviderApiKey(providerId: string): Promise<string | null> { return readSecret(keyForProvider(providerId)); }
export async function saveProviderApiKey(providerId: string, apiKey: string): Promise<void> { await writeSecret(keyForProvider(providerId), apiKey); }
export async function removeProviderApiKey(providerId: string): Promise<void> { await removeSecret(keyForProvider(providerId)); }
export async function saveMcpApiKey(serverId: string, value: string): Promise<void> { await writeSecret(keyForMcp(serverId, "api"), value); }
export async function saveMcpOAuthToken(serverId: string, value: string): Promise<void> { await writeSecret(keyForMcp(serverId, "oauth"), value); }
export async function removeMcpApiKey(serverId: string): Promise<void> { await removeSecret(keyForMcp(serverId, "api")); }
export async function removeMcpOAuthToken(serverId: string): Promise<void> { await removeSecret(keyForMcp(serverId, "oauth")); }

export async function refreshSecretStatus(state: AppState): Promise<AppState> {
  const providers = await Promise.all(state.providers.map(async (provider) => ({ ...provider, apiKeyStored: provider.managedByApp ? false : Boolean(await getProviderApiKey(provider.id)) })));
  const mcpServers = await Promise.all(state.mcpServers.map(async (server) => ({
    ...server,
    apiKeyStored: server.authMode === "api-key" ? Boolean(await readSecret(keyForMcp(server.id, "api"))) : false,
    oauthTokenStored: server.authMode === "oauth" ? Boolean(await readSecret(keyForMcp(server.id, "oauth"))) : false,
  })));
  return { ...state, providers, mcpServers };
}

export async function clearAllAppData(state: AppState): Promise<void> {
  await Promise.all([
    ...state.providers.map((provider) => removeProviderApiKey(provider.id)),
    ...state.mcpServers.flatMap((server) => [removeMcpApiKey(server.id), removeMcpOAuthToken(server.id)]),
  ]);
  await AsyncStorage.removeItem(STATE_KEY);
}
