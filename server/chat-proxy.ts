type ProviderChatInput = {
  apiBaseUrl: string;
  apiKey: string;
  providerKind?: "nvidia" | "groq" | "openrouter" | "anthropic" | "gemini" | "openai" | "custom";
  payload: Record<string, unknown>;
};

function endpointForChat(apiBaseUrl: string): string {
  const normalized = apiBaseUrl.trim().replace(/\/+$/, "");
  const url = new URL(normalized);
  if (url.protocol !== "https:") throw new Error("API base URL phải dùng HTTPS để gửi chat an toàn.");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

export async function forwardProviderChat(input: ProviderChatInput): Promise<unknown> {
  if (input.providerKind === "anthropic") return forwardAnthropicChat(input);
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (input.providerKind === "gemini") headers["x-goog-api-key"] = input.apiKey;
  else headers.Authorization = `Bearer ${input.apiKey}`;
  const response = await fetch(endpointForChat(input.apiBaseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify(input.payload),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Provider trả về HTTP ${response.status}${raw ? `: ${raw.slice(0, 240).replace(/\s+/g, " ")}` : ""}`);
  try { return JSON.parse(raw); } catch { throw new Error("Provider không trả về JSON hợp lệ cho chat."); }
}

function anthropicEndpoint(apiBaseUrl: string): string { const normalized = apiBaseUrl.trim().replace(/\/+$/, ""); const url = new URL(normalized); if (url.protocol !== "https:") throw new Error("API base URL phải dùng HTTPS để gửi chat an toàn."); return normalized.endsWith("/messages") ? normalized : `${normalized}/messages`; }
async function forwardAnthropicChat(input: ProviderChatInput): Promise<unknown> {
  const messages = Array.isArray(input.payload.messages) ? input.payload.messages : []; const system = messages.filter((message) => message && typeof message === "object" && (message as { role?: unknown }).role === "system").map((message) => (message as { content?: unknown }).content).filter((content): content is string => typeof content === "string").join("\n\n"); const cleaned = messages.filter((message) => message && typeof message === "object" && ["user", "assistant"].includes(String((message as { role?: unknown }).role))).map((message) => ({ role: (message as { role: "user" | "assistant" }).role, content: (message as { content?: unknown }).content }));
  const body = { model: input.payload.model, max_tokens: input.payload.max_tokens ?? 1024, temperature: input.payload.temperature, ...(system ? { system } : {}), messages: cleaned };
  const response = await fetch(anthropicEndpoint(input.apiBaseUrl), { method: "POST", headers: { "x-api-key": input.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) }); const raw = await response.text(); if (!response.ok) throw new Error(`Claude trả về HTTP ${response.status}${raw ? `: ${raw.slice(0, 240).replace(/\s+/g, " ")}` : ""}`); try { const result = JSON.parse(raw) as { content?: Array<{ type?: string; text?: string }> }; return { choices: [{ message: { role: "assistant", content: result.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n") ?? "" } }] }; } catch { throw new Error("Claude không trả về JSON hợp lệ cho chat."); }
}
