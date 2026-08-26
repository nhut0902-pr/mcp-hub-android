import AsyncStorage from "@react-native-async-storage/async-storage";

export type ChatTuning = { temperature: number; maxTokens: number; topP: number; instruction: string };
export const DEFAULT_CHAT_TUNING: ChatTuning = { temperature: 0.7, maxTokens: 1024, topP: 0.9, instruction: "You are a helpful assistant." };
const CHAT_TUNING_KEY = "mcp-hub.chat-tuning.v2";

export function normalizeChatTuning(input: Partial<ChatTuning> | null | undefined): ChatTuning {
  const temperature = typeof input?.temperature === "number" && Number.isFinite(input.temperature) ? Math.min(2, Math.max(0, Math.round(input.temperature * 10) / 10)) : DEFAULT_CHAT_TUNING.temperature;
  const maxTokens = typeof input?.maxTokens === "number" && Number.isFinite(input.maxTokens) ? Math.min(8192, Math.max(128, Math.round(input.maxTokens))) : DEFAULT_CHAT_TUNING.maxTokens;
  const topP = typeof input?.topP === "number" && Number.isFinite(input.topP) ? Math.min(1, Math.max(0, Math.round(input.topP * 10) / 10)) : DEFAULT_CHAT_TUNING.topP;
  const instruction = typeof input?.instruction === "string" && input.instruction.trim() ? input.instruction.trim().slice(0, 1000) : DEFAULT_CHAT_TUNING.instruction;
  return { temperature, maxTokens, topP, instruction };
}

export async function loadChatTuning(): Promise<ChatTuning> {
  try { const raw = await AsyncStorage.getItem(CHAT_TUNING_KEY); return normalizeChatTuning(raw ? JSON.parse(raw) : null); } catch { return DEFAULT_CHAT_TUNING; }
}

export async function saveChatTuning(settings: ChatTuning): Promise<void> { await AsyncStorage.setItem(CHAT_TUNING_KEY, JSON.stringify(normalizeChatTuning(settings))); }
