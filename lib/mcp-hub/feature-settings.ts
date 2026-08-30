import AsyncStorage from "@react-native-async-storage/async-storage";

export type WebSearchSettings = { enabledByDefault: boolean; scope: "web" | "news"; language: "vi" | "auto" };
export const DEFAULT_WEB_SEARCH_SETTINGS: WebSearchSettings = { enabledByDefault: false, scope: "web", language: "vi" };
const WEB_SEARCH_KEY = "mcp-hub.web-search.v1";

export async function loadWebSearchSettings(): Promise<WebSearchSettings> {
  try { const raw = await AsyncStorage.getItem(WEB_SEARCH_KEY); const value = raw ? JSON.parse(raw) as Partial<WebSearchSettings> : {}; return { enabledByDefault: Boolean(value.enabledByDefault), scope: value.scope === "news" ? "news" : "web", language: value.language === "auto" ? "auto" : "vi" }; } catch { return DEFAULT_WEB_SEARCH_SETTINGS; }
}
export async function saveWebSearchSettings(value: WebSearchSettings): Promise<void> { await AsyncStorage.setItem(WEB_SEARCH_KEY, JSON.stringify(value)); }

export type GeneralSettings = { theme: "dark" | "light" | "system"; fontSize: "small" | "medium" | "large"; accent: string };
export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = { theme: "dark", fontSize: "medium", accent: "#2996F3" };
const GENERAL_SETTINGS_KEY = "mcp-hub.general-settings.v1";
export async function loadGeneralSettings(): Promise<GeneralSettings> { try { const raw = await AsyncStorage.getItem(GENERAL_SETTINGS_KEY); const value = raw ? JSON.parse(raw) as Partial<GeneralSettings> : {}; return { theme: value.theme === "light" || value.theme === "system" ? value.theme : "dark", fontSize: value.fontSize === "small" || value.fontSize === "large" ? value.fontSize : "medium", accent: typeof value.accent === "string" ? value.accent : DEFAULT_GENERAL_SETTINGS.accent }; } catch { return DEFAULT_GENERAL_SETTINGS; } }
export async function saveGeneralSettings(value: GeneralSettings): Promise<void> { await AsyncStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(value)); }
