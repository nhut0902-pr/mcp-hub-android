import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchProviderModels } from "./model-sync";
import { testMcpConnection } from "./mcp-connection";
import { normalizePinnedModelIds } from "./pinned-models";
import { clearAllAppData, getMcpApiKey, getMcpOAuthToken, loadAppState, refreshSecretStatus, removeMcpApiKey, removeMcpOAuthToken, removeProviderApiKey, saveAppState, saveMcpApiKey, saveMcpOAuthToken, saveProviderApiKey } from "./storage";
import { AppState, createInitialState, McpConnectionResult, McpServerConfig, ModelRecord, ProviderConfig } from "./types";

type HubContextValue = {
  state: AppState;
  isLoading: boolean;
  syncingProviderId: string | null;
  saveProvider: (provider: ProviderConfig, apiKey?: string) => Promise<void>;
  removeProvider: (providerId: string) => Promise<void>;
  clearProviderKey: (providerId: string) => Promise<void>;
  toggleProvider: (providerId: string, enabled: boolean) => Promise<void>;
  syncProvider: (providerId: string, configuredProvider?: ProviderConfig, suppliedModels?: ModelRecord[]) => Promise<{ count: number; message: string; preview: ModelRecord[] }>;
  syncAll: () => Promise<{ successCount: number; failureCount: number }>;
  saveMcpServer: (server: McpServerConfig, apiKey?: string, oauthToken?: string) => Promise<void>;
  removeMcpServer: (serverId: string) => Promise<void>;
  toggleMcpServer: (serverId: string, enabled: boolean) => Promise<void>;
  testingMcpId: string | null;
  testMcpServer: (serverId: string, override?: McpServerConfig) => Promise<McpConnectionResult>;
  clearAll: () => Promise<void>;
};

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(createInitialState);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null);
  const [testingMcpId, setTestingMcpId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let secretRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    const hydrate = async () => {
      const loaded = await loadAppState();
      if (!active) return;

      // Render saved data immediately. SecureStore verification is useful, but must never block entering Chat.
      setState(loaded);
      setIsLoading(false);

      secretRefreshTimer = setTimeout(() => {
        void refreshSecretStatus(loaded)
          .then((hydrated) => {
            if (active) setState(hydrated);
          })
          .catch((error) => console.warn("[MCP Hub] Không thể làm mới trạng thái khoá bảo mật:", error));
      }, 350);
    };

    void hydrate();
    return () => {
      active = false;
      if (secretRefreshTimer) clearTimeout(secretRefreshTimer);
    };
  }, []);
  const persist = useCallback(async (nextState: AppState) => { setState(nextState); await saveAppState(nextState); }, []);

  const saveProvider = useCallback(async (provider: ProviderConfig, apiKey?: string) => {
    const pinnedModelIds = normalizePinnedModelIds(provider.pinnedModelIds, provider.preferredModelId);
    const nextProvider = { ...provider, pinnedModelIds, preferredModelId: pinnedModelIds[0] ?? null, apiKeyStored: apiKey?.trim() ? true : provider.apiKeyStored };
    const exists = state.providers.some((item) => item.id === provider.id);
    if (apiKey?.trim()) await saveProviderApiKey(provider.id, apiKey.trim());
    await persist({ ...state, providers: exists ? state.providers.map((item) => item.id === provider.id ? nextProvider : item) : [...state.providers, nextProvider] });
  }, [persist, state]);
  const removeProvider = useCallback(async (providerId: string) => { await removeProviderApiKey(providerId); await persist({ ...state, providers: state.providers.filter((provider) => provider.id !== providerId), models: state.models.filter((model) => model.providerId !== providerId) }); }, [persist, state]);
  const clearProviderKey = useCallback(async (providerId: string) => { await removeProviderApiKey(providerId); await persist({ ...state, providers: state.providers.map((provider) => provider.id === providerId ? { ...provider, apiKeyStored: false } : provider) }); }, [persist, state]);
  const toggleProvider = useCallback(async (providerId: string, enabled: boolean) => { await persist({ ...state, providers: state.providers.map((provider) => provider.id === providerId ? { ...provider, enabled } : provider) }); }, [persist, state]);

  const syncProvider = useCallback(async (providerId: string, configuredProvider?: ProviderConfig, suppliedModels?: ModelRecord[]) => {
    const provider = configuredProvider ?? state.providers.find((item) => item.id === providerId);
    if (!provider) throw new Error("Không tìm thấy provider.");
    setSyncingProviderId(providerId);
    try {
      const models = suppliedModels ?? await fetchProviderModels(provider);
      const syncedAt = new Date().toISOString();
      const savedProviders = state.providers.some((item) => item.id === providerId)
        ? state.providers.map((item) => item.id === providerId ? { ...item, ...provider, modelCount: models.length, lastSyncedAt: syncedAt } : item)
        : [{ ...provider, modelCount: models.length, lastSyncedAt: syncedAt }, ...state.providers];
      await persist({ ...state, providers: savedProviders, models: [...state.models.filter((model) => model.providerId !== providerId), ...models] });
      return { count: models.length, message: `Đã nhận ${models.length} model từ ${provider.name}.`, preview: models.slice(0, 3) };
    } finally { setSyncingProviderId(null); }
  }, [persist, state]);

  const syncAll = useCallback(async () => {
    const enabled = state.providers.filter((provider) => provider.enabled);
    if (!enabled.length) throw new Error("Hãy bật ít nhất một provider trước khi đồng bộ.");
    setSyncingProviderId("all"); let workingState = state; let successCount = 0; let failureCount = 0;
    try {
      for (const provider of enabled) {
        try { const models = await fetchProviderModels(provider); const syncedAt = new Date().toISOString(); workingState = { ...workingState, providers: workingState.providers.map((item) => item.id === provider.id ? { ...item, modelCount: models.length, lastSyncedAt: syncedAt } : item), models: [...workingState.models.filter((model) => model.providerId !== provider.id), ...models] }; successCount += 1; } catch { failureCount += 1; }
      }
      await persist(workingState); return { successCount, failureCount };
    } finally { setSyncingProviderId(null); }
  }, [persist, state]);

  const saveMcpServer = useCallback(async (server: McpServerConfig, apiKey?: string, oauthToken?: string) => {
    const existing = state.mcpServers.find((item) => item.id === server.id);
    if (server.authMode === "api-key" && apiKey?.trim()) await saveMcpApiKey(server.id, apiKey.trim());
    if (server.authMode === "oauth" && oauthToken?.trim()) await saveMcpOAuthToken(server.id, oauthToken.trim());
    if (server.authMode !== "api-key") await removeMcpApiKey(server.id);
    if (server.authMode !== "oauth") await removeMcpOAuthToken(server.id);
    const nextServer: McpServerConfig = { ...server, apiKeyStored: server.authMode === "api-key" ? Boolean(apiKey?.trim() || existing?.apiKeyStored) : false, oauthTokenStored: server.authMode === "oauth" ? Boolean(oauthToken?.trim() || existing?.oauthTokenStored) : false };
    await persist({ ...state, mcpServers: existing ? state.mcpServers.map((item) => item.id === server.id ? nextServer : item) : [...state.mcpServers, nextServer] });
  }, [persist, state]);
  const removeMcpServer = useCallback(async (serverId: string) => { await Promise.all([removeMcpApiKey(serverId), removeMcpOAuthToken(serverId)]); await persist({ ...state, mcpServers: state.mcpServers.filter((server) => server.id !== serverId) }); }, [persist, state]);
  const toggleMcpServer = useCallback(async (serverId: string, enabled: boolean) => { await persist({ ...state, mcpServers: state.mcpServers.map((server) => server.id === serverId ? { ...server, enabled } : server) }); }, [persist, state]);
  const testMcpServer = useCallback(async (serverId: string, override?: McpServerConfig) => {
    const server = override ?? state.mcpServers.find((item) => item.id === serverId);
    if (!server) throw new Error("Không tìm thấy MCP server.");
    setTestingMcpId(serverId);
    try {
      const credential = server.authMode === "api-key" ? await getMcpApiKey(server.id) : server.authMode === "oauth" ? await getMcpOAuthToken(server.id) : null;
      const result = await testMcpConnection(server, credential);
      const checkedServer: McpServerConfig = { ...server, connectionStatus: result.status, connectionDetail: result.detail, lastCheckedAt: new Date().toISOString(), detectedServerName: result.detectedServerName ?? null };
      const exists = state.mcpServers.some((item) => item.id === serverId);
      await persist({ ...state, mcpServers: exists ? state.mcpServers.map((item) => item.id === serverId ? checkedServer : item) : [...state.mcpServers, checkedServer] });
      return result;
    } finally { setTestingMcpId(null); }
  }, [persist, state]);
  const clearAll = useCallback(async () => { await clearAllAppData(state); await persist(createInitialState()); }, [persist, state]);
  const value = useMemo<HubContextValue>(() => ({ state, isLoading, syncingProviderId, saveProvider, removeProvider, clearProviderKey, toggleProvider, syncProvider, syncAll, saveMcpServer, removeMcpServer, toggleMcpServer, testingMcpId, testMcpServer, clearAll }), [clearAll, clearProviderKey, isLoading, removeMcpServer, removeProvider, saveMcpServer, saveProvider, state, syncAll, syncProvider, syncingProviderId, testMcpServer, testingMcpId, toggleMcpServer, toggleProvider]);
  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub(): HubContextValue { const context = useContext(HubContext); if (!context) throw new Error("useHub phải được dùng bên trong HubProvider."); return context; }
export function getProviderName(state: AppState, providerId: string): string { return state.providers.find((provider) => provider.id === providerId)?.name ?? "Provider không xác định"; }
export function latestSync(models: ModelRecord[]): string | null { return models.length ? [...models].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0].updatedAt : null; }
