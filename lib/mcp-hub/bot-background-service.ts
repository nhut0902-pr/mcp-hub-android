/**
 * Background Bot Service — REAL Android Foreground Service
 * 
 * v1.0.35: Uses react-native-background-actions for true foreground service.
 * This creates a persistent notification that Android won't kill.
 * 
 * The bot polls Telegram API every 5 seconds, even when app is backgrounded.
 */

import BackgroundService from "react-native-background-actions";
import { loadBots, updateBot, type BotConfig } from "./bot-runner";
import { sendAiCloudChatFromProxy } from "./ai-cloud-client";

const POLL_INTERVAL_MS = 5000;
let lastUpdateIds: Record<string, number> = {};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The background task — runs as an Android Foreground Service.
 * This function runs in a separate JS thread and stays alive even when app is backgrounded.
 */
async function botPollingTask(): Promise<void> {
  console.log("[BotService] Background task started");
  
  while (BackgroundService.isRunning()) {
    try {
      const bots = await loadBots();
      const runningBots = bots.filter((b) => b.status === "running");
      
      for (const bot of runningBots) {
        try {
          if (bot.platform === "telegram") {
            await pollTelegramBot(bot);
          }
        } catch (e) {
          console.error(`[BotService] Error polling ${bot.name}:`, e);
        }
      }
    } catch (e) {
      console.error("[BotService] Poll cycle error:", e);
    }
    
    await sleep(POLL_INTERVAL_MS);
  }
  
  console.log("[BotService] Background task stopped");
}

const backgroundTaskOptions = {
  taskName: "MCP Hub Bot",
  taskTitle: "MCP Hub Bot đang chạy",
  taskDesc: "Bot đang lắng nghe tin nhắn mới...",
  taskIcon: {
    name: "icon",
    type: "mipmap",
  },
  color: "#0A84FF",
  linkingURI: "mcphub://auth",
  parameters: {},
};

/**
 * Start the background bot service.
 */
export async function startBackgroundBotService(): Promise<boolean> {
  try {
    const granted = await BackgroundService.requestPermissions();
    if (!granted) {
      console.warn("[BotService] Foreground service permission not granted");
      return false;
    }
    
    await BackgroundService.start(botPollingTask, backgroundTaskOptions);
    console.log("[BotService] Foreground service started — notification should be visible");
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
  try {
    await BackgroundService.stop();
    console.log("[BotService] Foreground service stopped");
  } catch (e) {
    console.error("[BotService] Failed to stop:", e);
  }
}

/**
 * Check if background service is running.
 */
export function isBackgroundServiceRunning(): boolean {
  return BackgroundService.isRunning();
}

/**
 * Poll Telegram bot for new messages.
 */
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
    
    console.log(`[BotService] ${bot.name} received: "${msg.text}" from ${msg.from?.username || msg.from?.first_name}`);
    
    // Generate AI reply
    const aiReply = await generateAiReply(bot, msg.text);
    
    // Send reply
    await sendTelegramMessage(bot.token, msg.chat.id, aiReply);
    
    // Update count
    await updateBot(bot.id, { 
      messageCount: bot.messageCount + 1,
      lastError: null,
    });
  }
}

/**
 * Generate AI reply using the bot's configured model.
 */
async function generateAiReply(bot: BotConfig, userMessage: string): Promise<string> {
  try {
    if (bot.providerId === "ai-cloud") {
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
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}
