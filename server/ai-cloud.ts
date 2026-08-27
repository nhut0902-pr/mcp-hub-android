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

function normalizeAiCloudTools(input: unknown): unknown[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const tools = input.filter((tool): tool is { type?: unknown; function?: { name?: unknown; parameters?: unknown } } => Boolean(tool) && typeof tool === "object" && (tool as { type?: unknown }).type === "function" && typeof (tool as { function?: { name?: unknown } }).function?.name === "string" && /^[a-zA-Z0-9_]{1,100}$/.test((tool as { function: { name: string } }).function.name) && typeof (tool as { function?: { parameters?: unknown } }).function?.parameters === "object").slice(0, 24);
  return JSON.stringify(tools).length <= 80_000 ? tools : undefined;
}

function normalizeAiCloudToolChoice(input: unknown, tools: unknown[] | undefined): unknown {
  if (!tools?.length) return undefined;
  if (input === "auto" || input === "none" || input === "required") return input;
  if (!input || typeof input !== "object") return undefined;
  const value = input as { type?: unknown; function?: { name?: unknown } };
  const name = value.function?.name;
  const validName = typeof name === "string" && tools.some((tool) => {
    const functionName = tool && typeof tool === "object" ? (tool as { function?: { name?: unknown } }).function?.name : undefined;
    return functionName === name;
  });
  return value.type === "function" && validName ? { type: "function", function: { name } } : undefined;
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
  const tools = normalizeAiCloudTools(payload.tools);
  const toolChoice = normalizeAiCloudToolChoice(payload.tool_choice, tools);
  const safePayload = {
    model: AI_CLOUD_DEFAULT_MODEL,
    stream: false,
    messages: payload.messages,
    temperature: payload.temperature,
    max_tokens: payload.max_tokens,
    top_p: payload.top_p,
    ...(tools ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
  };
  return callAiCloud(AI_CLOUD_CHAT_ENDPOINT, { method: "POST", body: JSON.stringify(safePayload) });
}

export const AI_CLOUD_PROVIDER = { id: "ai-cloud", name: "AI Cloud", apiBaseUrl: AI_CLOUD_MODELS_BASE_URL, modelsUrl: `${AI_CLOUD_MODELS_BASE_URL}/models` } as const;
