const GEMINI_ENDPOINT = "https://gemini-api.chocode.com.vn/v1/chat/completions";
const MODEL = "gemini-1.5-flash";
const MAX_MESSAGES = 24;
const MAX_TOKENS = 2048;

function normalizeMessages(input) {
  if (!Array.isArray(input)) return null;
  const messages = input.slice(-MAX_MESSAGES).filter((message) => {
    return message && (message.role === "system" || message.role === "user" || message.role === "assistant") && (typeof message.content === "string" || Array.isArray(message.content));
  });
  return messages.length ? messages : null;
}

function jsonError(response, status, message) {
  return response.status(status).json({ error: { message } });
}

export default async function handler(request, response) {
  if (request.method !== "POST") return jsonError(response, 405, "Method not allowed");
  const apiKey = process.env.AI_CLOUD_API_KEY;
  if (!apiKey) return jsonError(response, 503, "AI Cloud chưa được cấu hình trên máy chủ.");

  const messages = normalizeMessages(request.body?.messages);
  if (!messages) return jsonError(response, 400, "Tin nhắn AI Cloud không hợp lệ.");

  const requestedTokens = Number(request.body?.max_tokens);
  const maxTokens = Number.isFinite(requestedTokens) ? Math.max(16, Math.min(Math.floor(requestedTokens), MAX_TOKENS)) : 1024;
  const requestedTemperature = Number(request.body?.temperature);
  const temperature = Number.isFinite(requestedTemperature) ? Math.max(0, Math.min(requestedTemperature, 1.5)) : 0.7;

  try {
    const upstream = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, stream: false, messages, max_tokens: maxTokens, temperature, top_p: request.body?.top_p }),
    });
    const raw = await upstream.text();
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    return response.status(upstream.status).send(raw || JSON.stringify({ error: { message: "AI Cloud không trả về dữ liệu." } }));
  } catch {
    return jsonError(response, 502, "Không thể kết nối AI Cloud Gemini. Hãy thử lại sau.");
  }
}
