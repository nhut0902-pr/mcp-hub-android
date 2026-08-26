type ProviderChatInput = {
  apiBaseUrl: string;
  apiKey: string;
  payload: Record<string, unknown>;
};

function endpointForChat(apiBaseUrl: string): string {
  const normalized = apiBaseUrl.trim().replace(/\/+$/, "");
  const url = new URL(normalized);
  if (url.protocol !== "https:") throw new Error("API base URL phải dùng HTTPS để gửi chat an toàn.");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

export async function forwardProviderChat(input: ProviderChatInput): Promise<unknown> {
  const response = await fetch(endpointForChat(input.apiBaseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input.payload),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Provider trả về HTTP ${response.status}${raw ? `: ${raw.slice(0, 240).replace(/\s+/g, " ")}` : ""}`);
  try { return JSON.parse(raw); } catch { throw new Error("Provider không trả về JSON hợp lệ cho chat."); }
}
