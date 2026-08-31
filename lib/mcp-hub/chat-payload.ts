import { attachmentCaption, toolContext, type ChatAttachment, type ChatMcpProfile } from "./chat-tools";
import type { ModelRecord, ProviderConfig } from "./types";

export type ChatRequestMessage = { id?: string; role: "user" | "assistant"; content: string; attachments?: ChatAttachment[]; mcpProfiles?: ChatMcpProfile[] };
export type ChatOptions = { thinking: boolean; webSearch: boolean; temperature: number; maxTokens: number; topP?: number; instruction?: string };
type JsonObject = Record<string, unknown>;

export function buildChatPayload(provider: ProviderConfig, model: ModelRecord, messages: ChatRequestMessage[], options: ChatOptions): JsonObject {
  const systemMessage = options.instruction?.trim() ? [{ role: "system", content: options.instruction.trim() }] : [];
  const payload: JsonObject = { model: model.modelId, messages: [...systemMessage, ...messages.map((message) => ({ role: message.role, content: buildMessageContent(message) }))], temperature: options.temperature, max_tokens: options.maxTokens };
  if (typeof options.topP === "number") payload.top_p = options.topP;
  if (options.thinking && model.supportsThinking) {
    if (provider.kind === "groq") {
      if (model.modelId.startsWith("openai/gpt-oss")) { payload.reasoning_effort = "medium"; payload.include_reasoning = true; }
      else payload.reasoning_format = "parsed";
    } else if (provider.kind === "openrouter") payload.reasoning = { enabled: true };
  }
  // v1.0.30+: Web search integration
  // For OpenRouter models: use built-in web plugin
  // For AI Cloud + other providers: Parallel Search MCP (if connected) will
  // be auto-injected as a tool via the MCP tool calling mechanism.
  if (options.webSearch && model.supportsWebSearch && provider.kind === "openrouter") {
    payload.plugins = [{ id: "web" }];
  } else if (options.webSearch) {
    // For AI Cloud and other providers, the web search icon in composer
    // triggers MCP tool calls to Parallel Search (https://search-mcp.parallel.ai/mcp)
    // if that MCP server is connected. Otherwise, it's a no-op.
    // The actual search happens via the MCP tool call flow in chat.tsx.
  }
  return payload;
}

function buildMessageContent(message: ChatRequestMessage): string | JsonObject[] {
  const attachments = message.attachments ?? [];
  const text = [message.content, ...attachments.filter((attachment) => attachment.type === "location" || attachment.type === "file").map(attachmentCaption), toolContext(message.mcpProfiles ?? [])].filter(Boolean).join("\n\n");
  const images = attachments.filter((attachment) => attachment.type === "image" && attachment.dataUri);
  if (!images.length) return text;
  return [{ type: "text", text }, ...images.map((attachment) => ({ type: "image_url", image_url: { url: attachment.dataUri } }))];
}
