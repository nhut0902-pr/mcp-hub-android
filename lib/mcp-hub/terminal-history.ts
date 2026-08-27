import AsyncStorage from "@react-native-async-storage/async-storage";

export type TerminalCommandStatus = "prepared" | "opened" | "error";
export type TerminalCommandEntry = { id: string; command: string; status: TerminalCommandStatus; detail: string; createdAt: string; risk: "normal" | "caution" };

const HISTORY_KEY = "mcp-hub-terminal-history-v1";
const MAX_HISTORY = 60;

export function classifyTerminalCommand(command: string): TerminalCommandEntry["risk"] {
  return /\b(rm\s+-[a-z]*r[a-z]*|mkfs|dd\s+if=|sudo\b|curl[^\n]*\|\s*(sh|bash)|wget[^\n]*\|\s*(sh|bash)|chmod\s+777)\b/i.test(command) ? "caution" : "normal";
}

export async function loadTerminalHistory(): Promise<TerminalCommandEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is TerminalCommandEntry => Boolean(item && typeof item === "object" && typeof (item as TerminalCommandEntry).id === "string" && typeof (item as TerminalCommandEntry).command === "string")).slice(-MAX_HISTORY) : [];
  } catch { return []; }
}

export async function saveTerminalHistory(entries: TerminalCommandEntry[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-MAX_HISTORY)));
}
