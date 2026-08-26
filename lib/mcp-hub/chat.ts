import type { ChatAttachment, ChatMcpProfile } from "./chat-tools";
import type { ModelRecord, ProviderConfig } from "./types";

export type ChatRole = "user" | "assistant";
export type ChatFailure = { title: string; detail: string; action: string; providerName: string; modelId: string; retryText: string };
export type ChatMessage = { id: string; role: ChatRole; content: string; attachments?: ChatAttachment[]; mcpProfiles?: ChatMcpProfile[]; reasoning?: string; citations?: ChatCitation[]; failure?: ChatFailure };
export type ChatCitation = { title: string; url: string };
type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject { return typeof value === "object" && value !== null && !Array.isArray(value); }
function toText(value: unknown): string { if (typeof value === "string") return value; if (Array.isArray(value)) return value.map((item) => isObject(item) && typeof item.text === "string" ? item.text : "").filter(Boolean).join("\n"); return ""; }
function extractCitations(message: JsonObject): ChatCitation[] {
  const citations: ChatCitation[] = [];
  const annotations = Array.isArray(message.annotations) ? message.annotations : [];
  for (const annotation of annotations) { if (!isObject(annotation) || annotation.type !== "url_citation" || !isObject(annotation.url_citation)) continue; const url = typeof annotation.url_citation.url === "string" ? annotation.url_citation.url : ""; if (url) citations.push({ url, title: typeof annotation.url_citation.title === "string" ? annotation.url_citation.title : url }); }
  const tools = Array.isArray(message.executed_tools) ? message.executed_tools : [];
  for (const tool of tools) { if (!isObject(tool) || !isObject(tool.search_results) || !Array.isArray(tool.search_results.results)) continue; for (const result of tool.search_results.results) { if (!isObject(result) || typeof result.url !== "string") continue; citations.push({ url: result.url, title: typeof result.title === "string" ? result.title : result.url }); } }
  return [...new Map(citations.map((citation) => [citation.url, citation])).values()];
}

export function parseChatCompletion(parsed: unknown): ChatMessage {
  if (!isObject(parsed) || !Array.isArray(parsed.choices) || !isObject(parsed.choices[0]) || !isObject(parsed.choices[0].message)) throw new Error("Phản hồi chat không có choices[0].message. Kiểm tra model hoặc endpoint chat.");
  const message = parsed.choices[0].message;
  return { id: `assistant-${Date.now()}`, role: "assistant", content: toText(message.content) || "Provider không trả về nội dung văn bản.", reasoning: toText(message.reasoning) || undefined, citations: extractCitations(message) };
}

export type { ModelRecord, ProviderConfig };
