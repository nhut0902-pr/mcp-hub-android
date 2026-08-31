/**
 * Bot Runner library — manages Telegram/Discord bot configs
 *
 * v1.0.32: Added token validation + model/provider support
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type BotPlatform = "telegram" | "discord";
export type BotStatus = "stopped" | "running" | "error";

export type BotConfig = {
  id: string;
  platform: BotPlatform;
  name: string;
  token: string;
  providerId: string;      // "ai-cloud" or custom provider ID
  modelId: string;         // e.g., "gemini-1.5-flash"
  systemPrompt: string;
  autoReply: boolean;
  status: BotStatus;
  lastError: string | null;
  startedAt: string | null;
  messageCount: number;
};

const BOT_KEY = "mcp-hub.bot-runners.v1";

export async function loadBots(): Promise<BotConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(BOT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveBots(bots: BotConfig[]): Promise<void> {
  await AsyncStorage.setItem(BOT_KEY, JSON.stringify(bots));
}

export async function addBot(bot: Omit<BotConfig, "id" | "status" | "lastError" | "startedAt" | "messageCount">): Promise<BotConfig> {
  const bots = await loadBots();
  const newBot: BotConfig = {
    ...bot,
    id: `bot_${Date.now()}`,
    status: "stopped",
    lastError: null,
    startedAt: null,
    messageCount: 0,
  };
  bots.push(newBot);
  await saveBots(bots);
  return newBot;
}

export async function updateBot(id: string, updates: Partial<BotConfig>): Promise<void> {
  const bots = await loadBots();
  const idx = bots.findIndex((b) => b.id === id);
  if (idx >= 0) { bots[idx] = { ...bots[idx], ...updates }; await saveBots(bots); }
}

export async function removeBot(id: string): Promise<void> {
  const bots = await loadBots();
  await saveBots(bots.filter((b) => b.id !== id));
}

/**
 * Validate bot token by calling Telegram/Discord API.
 * Returns true if token is valid, false otherwise.
 */
export async function validateBotToken(platform: BotPlatform, token: string): Promise<boolean> {
  try {
    if (platform === "telegram") {
      // Telegram Bot API: getMe endpoint
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { method: "GET" });
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data?.ok && data?.result?.username);
    } else {
      // Discord Bot API: get current user
      const res = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bot ${token}` },
      });
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data?.id && data?.username);
    }
  } catch {
    return false;
  }
}

export async function startBot(id: string): Promise<void> {
  await updateBot(id, { status: "running", startedAt: new Date().toISOString(), lastError: null });
}

export async function stopBot(id: string): Promise<void> {
  await updateBot(id, { status: "stopped", startedAt: null });
}
