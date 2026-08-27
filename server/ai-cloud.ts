const AI_CLOUD_MODELS_BASE_URL = "https://chatgpt-api.chocode.com.vn/v1";
export const AI_CLOUD_CHAT_ENDPOINT = "https://gemini-api.chocode.com.vn/v1/chat/completions";
export const AI_CLOUD_DEFAULT_MODEL = "gemini-1.5-flash";

const managedNhutbotModel = {
  id: AI_CLOUD_DEFAULT_MODEL,
  name: "Nhutbot 1.0 Flash",
  display_name: "Nhutbot 1.0 Flash",
  object: "model",
  owned_by: "AI Cloud",
};

function getApiKey(): string {
  const key = process.env.AI_CLOUD_API_KEY;
  if (!key) throw new Error("AI Cloud chưa được cấu hình trên máy chủ. Liên hệ quản trị viên.");
  return key;
}

async function callAiCloud(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${getApiKey()}`, Accept: "application/json", "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`AI Cloud trả về HTTP ${response.status}${raw ? `: ${raw.slice(0, 240).replace(/\s+/g, " ")}` : ""}`);
  try { return JSON.parse(raw); } catch { throw new Error("AI Cloud không trả về JSON hợp lệ."); }
}

export async function listAiCloudModels(): Promise<unknown> {
  // The legacy endpoint remains the source used to validate the managed service,
  // but chat itself is served by Gemini. Only expose a model that the Gemini proxy
  // is known to accept so users cannot pin a legacy ChatGPT-only model by mistake.
  try {
    await callAiCloud(`${AI_CLOUD_MODELS_BASE_URL}/models`, { method: "GET" });
  } catch {
    // Chat is still usable with the embedded Gemini model when the optional catalog
    // endpoint is temporarily unavailable.
  }
  return { object: "list", data: [managedNhutbotModel] };
}

export function sendAiCloudChat(payload: Record<string, unknown>): Promise<unknown> {
  const safePayload = {
    model: AI_CLOUD_DEFAULT_MODEL,
    stream: false,
    messages: payload.messages,
    temperature: payload.temperature,
    max_tokens: payload.max_tokens,
    top_p: payload.top_p,
  };
  return callAiCloud(AI_CLOUD_CHAT_ENDPOINT, { method: "POST", body: JSON.stringify(safePayload) });
}

export const AI_CLOUD_PROVIDER = { id: "ai-cloud", name: "AI Cloud", apiBaseUrl: AI_CLOUD_MODELS_BASE_URL, modelsUrl: `${AI_CLOUD_MODELS_BASE_URL}/models` } as const;
