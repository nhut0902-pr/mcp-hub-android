/**
 * Background Bot Service — TRUE Android Foreground Service
 * 
 * v1.0.38: Uses react-native-background-actions + Expo config plugin.
 * The config plugin (plugins/foreground-service-plugin.js) adds the <service>
 * declaration to AndroidManifest.xml — without it, the service can't start.
 * 
 * This is a REAL Android Foreground Service, not a workaround.
 */
import BackgroundService from "react-native-background-actions";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { loadBots, updateBot, type BotConfig } from "./bot-runner";
import { sendAiCloudChatFromProxy } from "./ai-cloud-client";

const POLL_INTERVAL_MS = 5000;
let lastUpdateIds: Record<string, number> = {};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Background task — runs in a separate thread, survives app being backgrounded.
 */
async function botPollingTask(): Promise<void> {
  console.log("[BotService] Background task started");
  while (BackgroundService.isRunning()) {
    try {
      const bots = await loadBots();
      const running = bots.filter((b) => b.status === "running");
      for (const bot of running) {
        try {
          if (bot.platform === "telegram") await pollTelegramBot(bot);
        } catch (e) {
          console.error(`[BotService] ${bot.name}:`, e);
        }
      }
    } catch (e) {
      console.error("[BotService] poll error:", e);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  console.log("[BotService] Background task stopped");
}

export async function startBackgroundBotService(): Promise<boolean> {
  try {
    // Step 1: Check if already running
    if (BackgroundService.isRunning()) {
      console.log("[BotService] Already running");
      return true;
    }

    // Step 2: Request notification permission (Android 13+)
    if (Platform.OS === "android") {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== "granted") {
          console.warn("[BotService] Notification permission denied");
          return false;
        }
      }
    }

    // Step 3: Create notification channel
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

    // Step 4: Start the foreground service
    // BackgroundService.start() creates the persistent notification automatically
    // and starts the Android Foreground Service.
    await BackgroundService.start(botPollingTask, {
      taskName: "MCP Hub Bot",
      taskTitle: "🤖 MCP Hub Bot đang chạy",
      taskDesc: "Bot đang lắng nghe tin nhắn Telegram...",
      taskIcon: {
        name: "icon",
        type: "mipmap",
      },
      color: "#0A84FF",
      linkingURI: "mcphub://auth",
      parameters: {},
    });

    console.log("[BotService] ✅ Foreground service started — notification visible");
    return true;
  } catch (e) {
    console.error("[BotService] ❌ Failed to start:", e);
    return false;
  }
}

export async function stopBackgroundBotService(): Promise<void> {
  try {
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
      console.log("[BotService] Foreground service stopped");
    }
  } catch (e) {
    console.error("[BotService] Stop error:", e);
  }
}

export function isBackgroundServiceRunning(): boolean {
  try {
    return BackgroundService.isRunning();
  } catch {
    return false;
  }
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
    console.log(`[BotService] ${bot.name}: received "${msg.text?.substring(0, 50)}"`);
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
        max_tokens: 1024,
        temperature: 0.7,
      }) as { choices?: Array<{ message?: { content?: string } }> };
      return result?.choices?.[0]?.message?.content || "Xin lỗi, tôi không thể trả lời lúc này.";
    }
    return `[${bot.modelId}] Bạn nói: ${userMessage}`;
  } catch {
    return "Xin lỗi, đã có lỗi khi xử lý tin nhắn.";
  }
}

async function sendTelegramMessage(token: string, chatId: number | string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}
