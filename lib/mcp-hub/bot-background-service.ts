/**
 * Background Bot Service — Android Foreground Service
 * 
 * v1.0.40: Lazy import of react-native-background-actions to prevent crash
 * when opening Bot Runner screen. The native module is only loaded when
 * user actually taps "Khởi động".
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { loadBots, updateBot, type BotConfig } from "./bot-runner";
import { sendAiCloudChatFromProxy } from "./ai-cloud-client";

const POLL_INTERVAL_MS = 5000;
let lastUpdateIds: Record<string, number> = {};
let pollInterval: ReturnType<typeof setInterval> | null = null;
let BackgroundServiceMod: any = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lazy load BackgroundService — only when needed.
 * This prevents crash if native module has issues.
 */
async function getBackgroundService(): Promise<any | null> {
  if (BackgroundServiceMod) return BackgroundServiceMod;
  try {
    const mod = await import("react-native-background-actions");
    BackgroundServiceMod = mod.default || mod;
    return BackgroundServiceMod;
  } catch (e) {
    console.error("[BotService] Cannot load react-native-background-actions:", e);
    return null;
  }
}

async function botPollingTask(): Promise<void> {
  console.log("[BotService] Background task started");
  const bs = await getBackgroundService();
  if (!bs) return;
  while (bs.isRunning()) {
    try {
      const bots = await loadBots();
      const running = bots.filter((b) => b.status === "running");
      for (const bot of running) {
        try {
          if (bot.platform === "telegram") await pollTelegramBot(bot);
        } catch (e) { console.error(`[BotService] ${bot.name}:`, e); }
      }
    } catch (e) { console.error("[BotService] poll error:", e); }
    await sleep(POLL_INTERVAL_MS);
  }
}

export async function startBackgroundBotService(): Promise<boolean> {
  try {
    const bs = await getBackgroundService();
    if (!bs) {
      console.error("[BotService] Native module not available");
      return false;
    }

    if (bs.isRunning()) return true;

    // Request notification permission
    if (Platform.OS === "android") {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        const { status: ns } = await Notifications.requestPermissionsAsync();
        if (ns !== "granted") return false;
      }
    }

    // Create channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("bot-service", {
        name: "Bot Runner",
        importance: Notifications.AndroidImportance.HIGH,
        description: "MCP Hub bot đang chạy nền",
        vibrationPattern: [0, 0],
        lightColor: "#0A84FF",
        showBadge: true,
      });
    }

    // Start foreground service
    await bs.start(botPollingTask, {
      taskName: "MCP Hub Bot",
      taskTitle: "🤖 MCP Hub Bot đang chạy",
      taskDesc: "Bot đang lắng nghe tin nhắn Telegram...",
      taskIcon: { name: "icon", type: "mipmap" },
      color: "#0A84FF",
      linkingURI: "mcphub://auth",
      parameters: {},
    });
    console.log("[BotService] ✅ Foreground service started");
    return true;
  } catch (e) {
    console.error("[BotService] ❌ Failed:", e);
    return false;
  }
}

export async function stopBackgroundBotService(): Promise<void> {
  try {
    const bs = await getBackgroundService();
    if (bs && bs.isRunning()) await bs.stop();
  } catch {}
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

export function isBackgroundServiceRunning(): boolean {
  if (!BackgroundServiceMod) return false;
  try { return BackgroundServiceMod.isRunning(); } catch { return false; }
}

async function pollTelegramBot(bot: BotConfig): Promise<void> {
  const lastId = lastUpdateIds[bot.id] ?? 0;
  const res = await fetch(
    `https://api.telegram.org/bot${bot.token}/getUpdates?offset=${lastId + 1}&timeout=3&allowed_updates=["message"]`,
    { method: "GET" }
  );
  if (!res.ok) return;
  const data = await res.json();
  if (!data.ok) return;
  for (const update of data.result || []) {
    lastUpdateIds[bot.id] = update.update_id;
    const msg = update.message;
    if (!msg?.text || msg.from?.is_bot) continue;
    const reply = await generateAiReply(bot, msg.text);
    await sendTelegramMessage(bot.token, msg.chat.id, reply);
    await updateBot(bot.id, { messageCount: bot.messageCount + 1, lastError: null });
  }
}

async function generateAiReply(bot: BotConfig, userMessage: string): Promise<string> {
  try {
    if (bot.providerId === "ai-cloud") {
      const result = await sendAiCloudChatFromProxy({
        model: bot.modelId,
        messages: [{ role: "system", content: bot.systemPrompt }, { role: "user", content: userMessage }],
        max_tokens: 1024, temperature: 0.7,
      }) as { choices?: Array<{ message?: { content?: string } }> };
      return result?.choices?.[0]?.message?.content || "Xin lỗi, tôi không thể trả lời lúc này.";
    }
    return `[${bot.modelId}] Bạn nói: ${userMessage}`;
  } catch { return "Xin lỗi, đã có lỗi."; }
}

async function sendTelegramMessage(token: string, chatId: number | string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}
