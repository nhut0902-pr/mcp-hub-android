type ProviderChatInput = {
  apiBaseUrl: string;
  apiKey: string;
  providerKind?: "nvidia" | "groq" | "openrouter" | "anthropic" | "gemini" | "openai" | "openclaw" | "custom";
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

type OpenAiTool = { type?: unknown; function?: { name?: unknown; description?: unknown; parameters?: unknown } };
function toAnthropicTools(value: unknown): Array<{ name: string; description: string; input_schema: Record<string, unknown> }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const tool = item as OpenAiTool;
    const name = tool?.function?.name;
    const inputSchema = tool?.function?.parameters;
    if (tool?.type !== "function" || typeof name !== "string" || !/^[a-zA-Z0-9_]{1,100}$/.test(name) || !inputSchema || typeof inputSchema !== "object" || Array.isArray(inputSchema)) return [];
    return [{ name, description: typeof tool.function?.description === "string" ? tool.function.description : "MCP tool", input_schema: inputSchema as Record<string, unknown> }];
  }).slice(0, 24);
}

function toAnthropicMessages(value: unknown): Array<{ role: "user" | "assistant"; content: unknown }> {
  if (!Array.isArray(value)) return [];
  const converted: Array<{ role: "user" | "assistant"; content: unknown }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return [];
    const message = item as { role?: unknown; content?: unknown; tool_calls?: unknown[]; tool_call_id?: unknown };
    if (message.role === "user") { converted.push({ role: "user", content: message.content ?? "" }); continue; }
    if (message.role === "assistant") {
      const toolUses = Array.isArray(message.tool_calls) ? message.tool_calls.flatMap((call) => {
        const functionValue = call && typeof call === "object" ? (call as { id?: unknown; function?: { name?: unknown; arguments?: unknown } }).function : undefined;
        const id = call && typeof call === "object" ? (call as { id?: unknown }).id : undefined;
        const name = functionValue?.name;
        if (!functionValue || typeof id !== "string" || typeof name !== "string") return [];
        try { const input = typeof functionValue.arguments === "string" ? JSON.parse(functionValue.arguments) : functionValue.arguments ?? {}; return [{ type: "tool_use", id, name, input }]; } catch { return []; }
      }) : [];
      if (!toolUses.length) { converted.push({ role: "assistant", content: message.content ?? "" }); continue; }
      const text = typeof message.content === "string" && message.content.trim() ? [{ type: "text", text: message.content }] : [];
      converted.push({ role: "assistant", content: [...text, ...toolUses] });
      continue;
    }
    if (message.role === "tool" && typeof message.tool_call_id === "string") converted.push({ role: "user", content: [{ type: "tool_result", tool_use_id: message.tool_call_id, content: typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? "") }] });
  }
  return converted;
}

function anthropicToolChoice(value: unknown): { type: "any" | "tool"; name?: string } | undefined {
  if (value === "required") return { type: "any" };
  if (value && typeof value === "object") { const name = (value as { type?: unknown; function?: { name?: unknown } }).function?.name; if ((value as { type?: unknown }).type === "function" && typeof name === "string") return { type: "tool", name }; }
  return undefined;
}

async function forwardAnthropicChat(input: ProviderChatInput): Promise<unknown> {
  const rawMessages = Array.isArray(input.payload.messages) ? input.payload.messages : [];
  const system = rawMessages.filter((message) => message && typeof message === "object" && (message as { role?: unknown }).role === "system").map((message) => (message as { content?: unknown }).content).filter((content): content is string => typeof content === "string").join("\n\n");
  const tools = toAnthropicTools(input.payload.tools);
  const toolChoice = anthropicToolChoice(input.payload.tool_choice);
  const body = { model: input.payload.model, max_tokens: input.payload.max_tokens ?? 1024, temperature: input.payload.temperature, ...(system ? { system } : {}), messages: toAnthropicMessages(rawMessages), ...(tools.length && input.payload.tool_choice !== "none" ? { tools } : {}), ...(tools.length && input.payload.tool_choice !== "none" && toolChoice ? { tool_choice: toolChoice } : {}) };
  const response = await fetch(anthropicEndpoint(input.apiBaseUrl), { method: "POST", headers: { "x-api-key": input.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) }); const raw = await response.text(); if (!response.ok) throw new Error(`Claude trả về HTTP ${response.status}${raw ? `: ${raw.slice(0, 240).replace(/\s+/g, " ")}` : ""}`);
  try {
    const result = JSON.parse(raw) as { content?: Array<{ type?: string; text?: string; id?: string; name?: string; input?: unknown }> };
    const content = result.content?.filter((item) => item.type === "text").map((item) => item.text ?? "").join("\n") ?? "";
    const toolCalls = result.content?.flatMap((item, index) => item.type === "tool_use" && typeof item.name === "string" ? [{ id: item.id ?? `claude-tool-${index}`, type: "function", function: { name: item.name, arguments: JSON.stringify(item.input ?? {}) } }] : []) ?? [];
    return { choices: [{ message: { role: "assistant", content, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) } }] };
  } catch { throw new Error("Claude không trả về JSON hợp lệ cho chat."); }
}
