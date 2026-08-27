import type { McpToolCallResult, McpToolDefinition } from "./mcp-connection";

export type McpProposedCall = { id: string; functionName: string; serverId: string; serverName: string; toolName: string; description: string; argumentsValue: Record<string, unknown> };

function safePart(value: string): string { return value.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 45); }
export function functionNameForMcpTool(tool: McpToolDefinition): string { return `mcp_${safePart(tool.serverId)}__${safePart(tool.name)}`; }

export function toOpenAiMcpTools(tools: McpToolDefinition[]): Array<Record<string, unknown>> {
  return tools.map((tool) => ({ type: "function", function: { name: functionNameForMcpTool(tool), description: `[${tool.serverName}] ${tool.description}`, parameters: tool.inputSchema } }));
}

export function mcpStructuredFallbackInstruction(tools: McpToolDefinition[]): string {
  if (!tools.length) return "";
  const functions = tools.map((tool) => functionNameForMcpTool(tool)).join(", ");
  return `Bạn có thể gọi các MCP function sau: ${functions}. Nếu API không hỗ trợ trường tool_calls nhưng yêu cầu của người dùng cần một MCP tool, chỉ trả về đúng một thẻ <mcp-call>{"name":"TÊN_FUNCTION","arguments":{}}</mcp-call> với name thuộc danh sách trên và arguments phù hợp JSON Schema. Không nói rằng MCP chỉ là ngữ cảnh, không bịa kết quả tool, không trả lời thường trước thẻ.`;
}

function parseArguments(value: unknown): Record<string, unknown> | null {
  try {
    const parsed = typeof value === "string" && value.trim() ? JSON.parse(value) : value && typeof value === "object" ? value : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}

function proposedCallFromFunction(value: { id?: unknown; name?: unknown; arguments?: unknown }, index: number, tools: McpToolDefinition[]): McpProposedCall[] {
  const functionName = typeof value.name === "string" ? value.name : "";
  const tool = tools.find((candidate) => functionNameForMcpTool(candidate) === functionName);
  const argumentsValue = parseArguments(value.arguments);
  if (!tool || !argumentsValue) return [];
  return [{ id: typeof value.id === "string" ? value.id : `mcp-call-${index}`, functionName, serverId: tool.serverId, serverName: tool.serverName, toolName: tool.name, description: tool.description, argumentsValue }];
}

function textForFallback(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? String((part as { text: string }).text) : "").join("\n");
  return "";
}

function jsonObjectAfterMarker(content: string): string | null {
  const marker = content.toLowerCase().indexOf("<mcp-call>");
  if (marker < 0) return null;
  const start = content.indexOf("{", marker);
  if (start < 0) return null;
  let depth = 0; let quoted = false; let escaped = false;
  for (let index = start; index < content.length; index += 1) {
    const char = content[index];
    if (quoted) { if (escaped) escaped = false; else if (char === "\\") escaped = true; else if (char === '"') quoted = false; continue; }
    if (char === '"') quoted = true;
    else if (char === "{") depth += 1;
    else if (char === "}") { depth -= 1; if (depth === 0) return content.slice(start, index + 1); }
  }
  return null;
}

export function extractMcpToolCalls(response: unknown, tools: McpToolDefinition[]): McpProposedCall[] {
  const message = (response as { choices?: Array<{ message?: { tool_calls?: unknown[]; function_call?: unknown } }> })?.choices?.[0]?.message;
  const requests = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
  const nativeCalls = requests.flatMap((request, index) => {
    const value = request as { id?: unknown; function?: { name?: unknown; arguments?: unknown } };
    return proposedCallFromFunction({ id: value.id, name: value.function?.name, arguments: value.function?.arguments }, index, tools);
  });
  if (nativeCalls.length) return nativeCalls;
  const legacy = (message as { function_call?: { name?: unknown; arguments?: unknown } } | undefined)?.function_call;
  if (legacy) { const calls = proposedCallFromFunction(legacy, 0, tools); if (calls.length) return calls; }
  const geminiParts = (response as { candidates?: Array<{ content?: { parts?: Array<{ functionCall?: { name?: unknown; args?: unknown } }> } }> })?.candidates?.[0]?.content?.parts ?? [];
  const geminiCalls = geminiParts.flatMap((part, index) => proposedCallFromFunction({ name: part.functionCall?.name, arguments: part.functionCall?.args }, index, tools));
  if (geminiCalls.length) return geminiCalls;
  const rawFallback = jsonObjectAfterMarker(textForFallback(message));
  if (!rawFallback) return [];
  try {
    const parsed = JSON.parse(rawFallback) as { name?: unknown; arguments?: unknown };
    return proposedCallFromFunction({ id: `mcp-fallback-${Date.now()}`, name: parsed.name, arguments: parsed.arguments }, 0, tools);
  } catch { return []; }
}

export function appendMcpToolResults(payload: Record<string, unknown>, response: unknown, calls: McpProposedCall[], results: McpToolCallResult[]): Record<string, unknown> {
  const message = (response as { choices?: Array<{ message?: unknown }> })?.choices?.[0]?.message;
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const toolMessages = calls.map((call) => {
    const result = results.find((item) => item.serverId === call.serverId && item.toolName === call.toolName);
    return { role: "tool", tool_call_id: call.id, content: JSON.stringify(result?.content ?? [{ type: "text", text: "Tool không trả kết quả." }]) };
  });
  return { ...payload, messages: [...messages, message ?? { role: "assistant", tool_calls: calls.map((call) => ({ id: call.id, type: "function", function: { name: call.functionName, arguments: JSON.stringify(call.argumentsValue) } })) }, ...toolMessages] };
}

export function summarizeMcpResults(results: McpToolCallResult[]): string {
  return results.map((result) => {
    const text = result.content.map((item) => typeof item === "object" && item && "text" in item ? String((item as { text?: unknown }).text ?? "") : JSON.stringify(item)).filter(Boolean).join("\n").slice(0, 1200);
    return `**${result.serverName} · ${result.toolName}**${result.isError ? " (báo lỗi)" : ""}\n${text || "Tool đã hoàn tất nhưng không có nội dung văn bản."}`;
  }).join("\n\n");
}

export function mcpCallMayChangeExternalData(call: McpProposedCall): boolean {
  return /\b(create|update|delete|remove|archive|send|post|publish|write|edit|invite|share|upload|payment|transfer|cancel|close)\b/i.test(`${call.toolName} ${call.description}`);
}
