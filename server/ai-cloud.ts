const AI_CLOUD_MODELS_BASE_URL = "https://chatgpt-api.chocode.com.vn/v1";
export const AI_CLOUD_CHAT_ENDPOINT = "https://gemini-api.chocode.com.vn/v1/chat/completions";

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

export function listAiCloudModels(): Promise<unknown> { return callAiCloud(`${AI_CLOUD_MODELS_BASE_URL}/models`, { method: "GET" }); }
export function sendAiCloudChat(payload: Record<string, unknown>): Promise<unknown> { return callAiCloud(AI_CLOUD_CHAT_ENDPOINT, { method: "POST", body: JSON.stringify(payload) }); }

export const AI_CLOUD_PROVIDER = { id: "ai-cloud", name: "AI Cloud", apiBaseUrl: AI_CLOUD_MODELS_BASE_URL, modelsUrl: `${AI_CLOUD_MODELS_BASE_URL}/models` } as const;
