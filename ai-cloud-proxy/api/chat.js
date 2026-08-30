const GEMINI_ENDPOINT = "https://gemini-api.chocode.com.vn/v1/chat/completions";
const MODEL = "gemini-1.5-flash";
const MAX_MESSAGES = 24;
const MAX_TOKENS = 2048;
// v1.0.22+: Verify JWT against the NhutCoder Team web app (which signs the JWT
// with AUTH_SECRET and exposes /api/auth/me). Previously defaulted to the
// Manus backend which used a different session secret — JWT verification
// always failed with "Not authenticated".
const AUTH_VERIFY_URL = process.env.AUTH_VERIFY_URL || "https://nhutcoder-team-v2.vercel.app/api/auth/me";

async function hasAuthenticatedUser(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return false;
  try {
    const verification = await fetch(AUTH_VERIFY_URL, {
      headers: { Accept: "application/json", Authorization: authorization },
    });
    if (!verification.ok) return false;
    const body = await verification.json();
    return Boolean(body?.user);
  } catch {
    return false;
  }
}

function normalizeMessages(input) {
  if (!Array.isArray(input)) return null;
  const messages = input.slice(-MAX_MESSAGES).filter((message) => {
    if (!message || !["system", "user", "assistant", "tool"].includes(message.role)) return false;
    if (typeof message.content === "string" || Array.isArray(message.content)) return true;
    return message.role === "assistant" && Array.isArray(message.tool_calls);
  });
  return messages.length ? messages : null;
}

function normalizeTools(input) {
  if (!Array.isArray(input)) return undefined;
  const tools = input.filter((tool) => tool && tool.type === "function" && typeof tool.function?.name === "string" && /^[a-zA-Z0-9_]{1,100}$/.test(tool.function.name) && typeof tool.function?.parameters === "object").slice(0, 24);
  return JSON.stringify(tools).length <= 80_000 ? tools : undefined;
}

function jsonError(response, status, message) {
  return response.status(status).json({ error: { message } });
}

export default async function handler(request, response) {
  if (request.method !== "POST") return jsonError(response, 405, "Method not allowed");
  if (!(await hasAuthenticatedUser(request))) return jsonError(response, 401, "Bạn cần đăng nhập để sử dụng Nhutbot 1.0 Flash.");
  const apiKey = process.env.AI_CLOUD_API_KEY;
  if (!apiKey) return jsonError(response, 503, "AI Cloud chưa được cấu hình trên máy chủ.");

  const messages = normalizeMessages(request.body?.messages);
  if (!messages) return jsonError(response, 400, "Tin nhắn AI Cloud không hợp lệ.");

  const requestedTokens = Number(request.body?.max_tokens);
  const maxTokens = Number.isFinite(requestedTokens) ? Math.max(16, Math.min(Math.floor(requestedTokens), MAX_TOKENS)) : 1024;
  const requestedTemperature = Number(request.body?.temperature);
  const temperature = Number.isFinite(requestedTemperature) ? Math.max(0, Math.min(requestedTemperature, 1.5)) : 0.7;
  const tools = normalizeTools(request.body?.tools);
  const toolChoice = tools && (["auto", "none", "required"].includes(request.body?.tool_choice) || (request.body?.tool_choice && typeof request.body.tool_choice === "object")) ? request.body.tool_choice : undefined;

  try {
    const upstream = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, stream: false, messages, max_tokens: maxTokens, temperature, top_p: request.body?.top_p, ...(tools ? { tools } : {}), ...(toolChoice ? { tool_choice: toolChoice } : {}) }),
    });
    const raw = await upstream.text();
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    return response.status(upstream.status).send(raw || JSON.stringify({ error: { message: "AI Cloud không trả về dữ liệu." } }));
  } catch {
    return jsonError(response, 502, "Không thể kết nối AI Cloud Gemini. Hãy thử lại sau.");
  }
}
