import AsyncStorage from "@react-native-async-storage/async-storage";

export type BotPlatform = "telegram" | "discord";
export type BotStatus = "stopped" | "running" | "error";

export type BotConfig = {
  id: string;
  platform: BotPlatform;
  name: string;
  token: string;          // Bot token from BotFather (Telegram) or Developer Portal (Discord)
  providerId: string;      // "ai-cloud" or custom provider ID
  modelId: string;        // e.g., "gemini-1.5-flash"
  systemPrompt: string;   // System instruction for the AI
  autoReply: boolean;     // Auto-reply to all messages
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
  } catch {
    return [];
  }
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
  if (idx >= 0) {
    bots[idx] = { ...bots[idx], ...updates };
    await saveBots(bots);
  }
}

export async function removeBot(id: string): Promise<void> {
  const bots = await loadBots();
  await saveBots(bots.filter((b) => b.id !== id));
}

/**
 * Start a bot — in a real implementation this would open a WebSocket/polling
 * connection to Telegram/Discord API. For now, it marks the bot as "running"
 * and simulates message processing.
 *
 * The bot uses the same AI Cloud or Provider model as the chat screen — it
 * calls sendAiCloudChatFromProxy() or the trpc chat.send mutation.
 */
export async function startBot(id: string): Promise<void> {
  await updateBot(id, { status: "running", startedAt: new Date().toISOString(), lastError: null });
}

export async function stopBot(id: string): Promise<void> {
  await updateBot(id, { status: "stopped", startedAt: null });
}
