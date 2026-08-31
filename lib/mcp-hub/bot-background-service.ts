/**
 * Background Bot Service — REAL Android Foreground Service
 * v1.0.36: Fixed — request notification permission via expo-notifications FIRST,
 * then start BackgroundService (which doesn't have its own requestPermissions).
 */

import BackgroundService from "react-native-background-actions";
import * as Notifications from "expo-notifications";
import { Platform, Alert } from "react-native";
import { loadBots, updateBot, type BotConfig } from "./bot-runner";
import { sendAiCloudChatFromProxy } from "./ai-cloud-client";

const POLL_INTERVAL_MS = 5000;
let lastUpdateIds: Record<string, number> = {};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function botPollingTask(): Promise<void> {
  console.log("[BotService] Background task started");
  while (BackgroundService.isRunning()) {
    try {
      const bots = await loadBots();
      const runningBots = bots.filter((b) => b.status === "running");
      for (const bot of runningBots) {
        try {
          if (bot.platform === "telegram") { await pollTelegramBot(bot); }
        } catch (e) { console.error(`[BotService] ${bot.name}:`, e); }
      }
    } catch (e) { console.error("[BotService] poll error:", e); }
    await sleep(POLL_INTERVAL_MS);
  }
}

export async function startBackgroundBotService(): Promise<boolean> {
  try {
    // Step 1: Request notification permission (Android 13+)
    if (Platform.OS === "android") {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.warn("[BotService] Notification permission denied");
        Alert.alert(
          "Cần quyền thông báo",
          "Bot cần quyền thông báo để chạy nền. Vào Settings → Apps → MCP Hub → Notifications → Bật.",
        );
        return false;
      }
    }

    // Step 2: Create notification channel (Android)
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

    // Step 3: Start the foreground service
    // BackgroundService.start() creates the persistent notification automatically
    await BackgroundService.start(botPollingTask, {
      taskName: "MCP Hub Bot",
      taskTitle: "MCP Hub Bot đang chạy",
      taskDesc: "Bot đang lắng nghe tin nhắn mới...",
      taskIcon: { name: "icon", type: "mipmap" },
      color: "#0A84FF",
      linkingURI: "mcphub://auth",
      parameters: {},
    });
    console.log("[BotService] Foreground service started");
    return true;
  } catch (e) {
    console.error("[BotService] Failed to start:", e);
    return false;
  }
}

export async function stopBackgroundBotService(): Promise<void> {
  try { await BackgroundService.stop(); } catch {}
}

export function isBackgroundServiceRunning(): boolean {
  try { return BackgroundService.isRunning(); } catch { return false; }
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
  const updates = data.result || [];
  for (const update of updates) {
    lastUpdateIds[bot.id] = update.update_id;
    const msg = update.message;
    if (!msg || !msg.text) continue;
    if (msg.from?.is_bot) continue;
    const aiReply = await generateAiReply(bot, msg.text);
    await sendTelegramMessage(bot.token, msg.chat.id, aiReply);
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
    return `[${bot.modelId}] ${bot.systemPrompt}\n\nBạn nói: ${userMessage}`;
  } catch { return "Xin lỗi, đã có lỗi khi xử lý tin nhắn."; }
}

async function sendTelegramMessage(token: string, chatId: number | string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}
