/**
 * Background Bot Service v2 — uses expo-notifications sticky notification.
 * 
 * v1.0.37: Dropped react-native-background-actions (native module linking issues).
 * Instead: create a STICKY notification that keeps the app process alive,
 * + setInterval to poll Telegram every 5 seconds.
 * 
 * The sticky notification tells Android "this app is doing important work"
 * so Android keeps the process alive even when app is backgrounded.
 * This is NOT a full Foreground Service, but it works reliably on most
 * Android devices and doesn't require native module linking.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { loadBots, updateBot, type BotConfig } from "./bot-runner";
import { sendAiCloudChatFromProxy } from "./ai-cloud-client";

const POLL_INTERVAL_MS = 5000;
const NOTIFICATION_ID = "mcp-hub-bot-service";
const CHANNEL_ID = "bot-service";

let pollInterval: ReturnType<typeof setInterval> | null = null;
let lastUpdateIds: Record<string, number> = {};

/**
 * Start the background bot service.
 * Creates a sticky notification + starts polling loop.
 */
export async function startBackgroundBotService(): Promise<boolean> {
  try {
    // Step 1: Request notification permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("[BotService] Notification permission denied");
      return false;
    }

    // Step 2: Create notification channel (Android)
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Bot Runner",
        importance: Notifications.AndroidImportance.HIGH,
        description: "MCP Hub bot đang chạy nền",
        vibrationPattern: [0, 0],
        lightColor: "#0A84FF",
        showBadge: true,
        enableVibrate: false,
      });
    }

    // Step 3: Show STICKY notification (won't be dismissed by user)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "MCP Hub Bot đang chạy",
        body: "Bot đang lắng nghe tin nhắn mới...",
        data: { type: "bot-service" },
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
      identifier: NOTIFICATION_ID,
    });

    // Step 4: Start polling loop
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(pollAllBots, POLL_INTERVAL_MS);

    console.log("[BotService] Service started — notification should be visible");
    return true;
  } catch (e) {
    console.error("[BotService] Failed to start:", e);
    return false;
  }
}

/**
 * Stop the background bot service.
 */
export async function stopBackgroundBotService(): Promise<void> {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  try {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
  } catch {}
  console.log("[BotService] Service stopped");
}

export function isBackgroundServiceRunning(): boolean {
  return pollInterval !== null;
}

async function pollAllBots(): Promise<void> {
  try {
    const bots = await loadBots();
    const running = bots.filter((b) => b.status === "running");
    for (const bot of running) {
      try {
        if (bot.platform === "telegram") { await pollTelegramBot(bot); }
      } catch (e) { console.error(`[BotService] ${bot.name}:`, e); }
    }
  } catch (e) { console.error("[BotService] poll error:", e); }
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
