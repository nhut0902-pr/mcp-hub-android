/**
 * Background Bot Service v3
 * 
 * v1.0.43: Dual-mode — tries react-native-background-actions first,
 * falls back to expo-notifications sticky + setInterval if it fails.
 * This ensures bot ALWAYS starts (at least while app is backgrounded).
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { loadBots, updateBot, type BotConfig } from "./bot-runner";
import { sendAiCloudChatFromProxy } from "./ai-cloud-client";

const POLL_INTERVAL_MS = 5000;
const NOTIFICATION_ID = "mcp-hub-bot-service";
let lastUpdateIds: Record<string, number> = {};
let pollInterval: ReturnType<typeof setInterval> | null = null;
let bsModule: any = null;
let usingForegroundService = false;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getBS() {
  if (bsModule) return bsModule;
  try { const m = await import("react-native-background-actions"); bsModule = m.default || m; return bsModule; }
  catch { return null; }
}

async function botPollingTask() {
  const bs = await getBS();
  while (bs?.isRunning?.()) { await pollAllBots(); await sleep(POLL_INTERVAL_MS); }
}

export async function startBackgroundBotService(): Promise<boolean> {
  try {
    // Step 1: Notification permission
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: ns } = await Notifications.requestPermissionsAsync();
      if (ns !== "granted") return false;
    }

    // Step 2: Channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("bot-service", {
        name: "Bot Runner", importance: Notifications.AndroidImportance.HIGH,
        description: "MCP Hub bot đang chạy nền", vibrationPattern: [0, 0],
        lightColor: "#0A84FF", showBadge: true,
      });
    }

    // Step 3: Try Foreground Service (react-native-background-actions)
    const bs = await getBS();
    if (bs) {
      try {
        await bs.start(botPollingTask, {
          taskName: "MCP Hub Bot", taskTitle: "🤖 MCP Hub Bot đang chạy",
          taskDesc: "Bot đang lắng nghe tin nhắn...", taskIcon: { name: "icon", type: "mipmap" },
          color: "#0A84FF", linkingURI: "mcphub://auth", parameters: {},
        });
        usingForegroundService = true;
        console.log("[BotService] ✅ Foreground Service started");
        return true;
      } catch (e) { console.warn("[BotService] FG service failed, fallback:", e); }
    }

    // Step 4: FALLBACK — sticky notification + setInterval
    await Notifications.scheduleNotificationAsync({
      content: { title: "🤖 MCP Hub Bot đang chạy", body: "Bot đang lắng nghe tin nhắn...", sticky: true, priority: Notifications.AndroidNotificationPriority.HIGH },
      trigger: null, identifier: NOTIFICATION_ID,
    });
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(pollAllBots, POLL_INTERVAL_MS);
    usingForegroundService = false;
    console.log("[BotService] ✅ Fallback mode (sticky notification + setInterval)");
    return true;
  } catch (e) { console.error("[BotService] ❌", e); return false; }
}

export async function stopBackgroundBotService() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  const bs = await getBS();
  if (bs?.isRunning?.()) try { await bs.stop(); } catch {}
  try { await Notifications.dismissNotificationAsync(NOTIFICATION_ID); } catch {}
  usingForegroundService = false;
}

export function isBackgroundServiceRunning() { return pollInterval !== null || (bsModule?.isRunning?.() ?? false); }

async function pollAllBots() {
  try {
    const bots = await loadBots();
    for (const bot of bots.filter(b => b.status === "running")) {
      try { if (bot.platform === "telegram") await pollTelegramBot(bot); } catch (e) { console.error(`[BotService] ${bot.name}:`, e); }
    }
  } catch (e) { console.error("[BotService] poll:", e); }
}

async function pollTelegramBot(bot: BotConfig) {
  const lastId = lastUpdateIds[bot.id] ?? 0;
  const res = await fetch(`https://api.telegram.org/bot${bot.token}/getUpdates?offset=${lastId + 1}&timeout=3&allowed_updates=["message"]`);
  if (!res.ok) return;
  const data = await res.json();
  if (!data.ok) return;
  for (const update of data.result || []) {
    lastUpdateIds[bot.id] = update.update_id;
    const msg = update.message;
    if (!msg?.text || msg.from?.is_bot) continue;
    const reply = await generateAiReply(bot, msg.text);
    await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: msg.chat.id, text: reply, parse_mode: "Markdown" }),
    });
    await updateBot(bot.id, { messageCount: bot.messageCount + 1, lastError: null });
  }
}

async function generateAiReply(bot: BotConfig, userMessage: string): Promise<string> {
  try {
    if (bot.providerId === "ai-cloud") {
      const r = await sendAiCloudChatFromProxy({ model: bot.modelId, messages: [{ role: "system", content: bot.systemPrompt }, { role: "user", content: userMessage }], max_tokens: 1024, temperature: 0.7 }) as any;
      return r?.choices?.[0]?.message?.content || "Xin lỗi, tôi không thể trả lời lúc này.";
    }
    return `[${bot.modelId}] Bạn nói: ${userMessage}`;
  } catch { return "Xin lỗi, đã có lỗi."; }
}
