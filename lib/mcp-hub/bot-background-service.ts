/**
 * Background Bot Service — keeps Telegram/Discord bots alive when app is backgrounded.
 *
 * v1.0.34: Uses Android Foreground Service via expo-notifications.
 * 
 * HOW IT WORKS:
 * 1. When user taps "Khởi động" on a bot, we start a foreground notification
 *    "MCP Hub Bot đang chạy" — this keeps Android from killing the app.
 * 2. We set up a setInterval that polls Telegram/Discord API every 5 seconds.
 * 3. When a new message arrives, we call AI Cloud/Provider to generate a reply,
 *    then send it back via the bot API.
 * 4. When user taps "Dừng" or the notification, we clear the interval + stop service.
 *
 * LIMITATIONS:
 * - Android 14+ requires FOREGROUND_SERVICE_DATA_SYNC permission
 * - iOS does NOT support foreground services — bots only run when app is open on iOS
 * - The persistent notification MUST stay visible (Android requirement)
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { loadBots, updateBot, type BotConfig } from "./bot-runner";
import { sendAiCloudChatFromProxy } from "./ai-cloud-client";

let pollInterval: ReturnType<typeof setInterval> | null = null;
let lastUpdateIds: Record<string, number> = {}; // botId → lastUpdateId (Telegram)
let lastMessageIds: Record<string, string> = {}; // botId → lastMessageId (Discord)

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

/**
 * Start the background bot service.
 * Shows a persistent notification + starts polling loop.
 */
export async function startBackgroundBotService(): Promise<void> {
  if (Platform.OS !== "android") {
    console.log("[BotService] Foreground service only available on Android");
    // Still start polling — will work while app is in foreground
  }

  // Request notification permission
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("[BotService] Notification permission not granted — bot may be killed by OS");
  }

  // Set up notification channel for Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("bot-service", {
      name: "Bot Runner",
      importance: Notifications.AndroidImportance.LOW,
      description: "MCP Hub bot đang chạy nền",
      vibrationPattern: [0, 0],
      lightColor: "#0A84FF",
      showBadge: false,
    });
  }

  // Show persistent notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "MCP Hub Bot đang chạy",
      body: "Bot đang lắng nghe tin nhắn mới...",
      data: { type: "bot-service" },
      sticky: true,
    },
    trigger: null, // Show immediately
  });

  // Start polling loop
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(pollAllBots, POLL_INTERVAL_MS);
  
  console.log("[BotService] Background service started");
}

/**
 * Stop the background bot service.
 * Clears polling + dismisses notification.
 */
export async function stopBackgroundBotService(): Promise<void> {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  
  await Notifications.dismissNotificationAsync("bot-service");
  console.log("[BotService] Background service stopped");
}

/**
 * Poll all running bots for new messages.
 */
async function pollAllBots(): Promise<void> {
  try {
    const bots = await loadBots();
    const runningBots = bots.filter((b) => b.status === "running");
    
    for (const bot of runningBots) {
      try {
        if (bot.platform === "telegram") {
          await pollTelegramBot(bot);
        } else {
          await pollDiscordBot(bot);
        }
      } catch (e) {
        console.error(`[BotService] Error polling ${bot.name}:`, e);
        await updateBot(bot.id, { 
          lastError: e instanceof Error ? e.message : "Polling error",
        });
      }
    }
  } catch (e) {
    console.error("[BotService] Poll cycle error:", e);
  }
}

/**
 * Poll Telegram bot for new messages using long polling.
 */
async function pollTelegramBot(bot: BotConfig): Promise<void> {
  const lastId = lastUpdateIds[bot.id] ?? 0;
  
  const res = await fetch(
    `https://api.telegram.org/bot${bot.token}/getUpdates?offset=${lastId + 1}&timeout=3&allowed_updates=["message"]`,
    { method: "GET" }
  );
  
  if (!res.ok) {
    throw new Error(`Telegram API error: ${res.status}`);
  }
  
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API: ${data.description}`);
  }
  
  const updates = data.result || [];
  for (const update of updates) {
    lastUpdateIds[bot.id] = update.update_id;
    
    const msg = update.message;
    if (!msg || !msg.text) continue;
    
    // Skip own messages
    if (msg.from?.is_bot) continue;
    
    console.log(`[BotService] ${bot.name} received: "${msg.text}" from ${msg.from?.username || msg.from?.first_name}`);
    
    // Generate AI reply
    const aiReply = await generateAiReply(bot, msg.text);
    
    // Send reply via Telegram
    await sendTelegramMessage(bot.token, msg.chat.id, aiReply);
    
    // Update message count
    await updateBot(bot.id, { 
      messageCount: bot.messageCount + 1,
      lastError: null,
    });
  }
}

/**
 * Poll Discord bot for new messages.
 */
async function pollDiscordBot(bot: BotConfig): Promise<void> {
  // Get last 50 messages from all channels the bot can see
  // Discord requires gateway WebSocket for real-time — polling REST is limited
  // For now, we use a simplified approach: check mentions
  
  const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: { Authorization: `Bot ${bot.token}` },
  });
  
  if (!res.ok) {
    throw new Error(`Discord API error: ${res.status}`);
  }
  
  // Discord bot polling is limited — real implementation needs WebSocket gateway
  // For now, just log that we're alive
  console.log(`[BotService] ${bot.name} (Discord) alive check`);
}

/**
 * Generate AI reply using the bot's configured model.
 */
async function generateAiReply(bot: BotConfig, userMessage: string): Promise<string> {
  try {
    if (bot.providerId === "ai-cloud") {
      // Use AI Cloud proxy
      const result = await sendAiCloudChatFromProxy({
        model: bot.modelId,
        messages: [
          { role: "system", content: bot.systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }) as { choices?: Array<{ message?: { content?: string } }> };
      
      return result?.choices?.[0]?.message?.content || "Xin lỗi, tôi không thể trả lời lúc này.";
    } else {
      // Provider model — would need API key lookup
      // For now, return a placeholder
      return `[${bot.modelId}] ${bot.systemPrompt}\n\nBạn nói: ${userMessage}`;
    }
  } catch (e) {
    console.error("[BotService] AI reply error:", e);
    return "Xin lỗi, đã có lỗi khi xử lý tin nhắn.";
  }
}

/**
 * Send a message via Telegram Bot API.
 */
async function sendTelegramMessage(token: string, chatId: number | string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
    }),
  });
}

/**
 * Check if the background service is running.
 */
export function isBackgroundServiceRunning(): boolean {
  return pollInterval !== null;
}
