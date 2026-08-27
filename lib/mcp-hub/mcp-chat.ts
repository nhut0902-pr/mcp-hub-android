import type { McpToolCallResult, McpToolDefinition } from "./mcp-connection";

export type McpProposedCall = { id: string; functionName: string; serverId: string; serverName: string; toolName: string; argumentsValue: Record<string, unknown> };

function safePart(value: string): string { return value.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 45); }
export function functionNameForMcpTool(tool: McpToolDefinition): string { return `mcp_${safePart(tool.serverId)}__${safePart(tool.name)}`; }

export function toOpenAiMcpTools(tools: McpToolDefinition[]): Array<Record<string, unknown>> {
  return tools.map((tool) => ({ type: "function", function: { name: functionNameForMcpTool(tool), description: `[${tool.serverName}] ${tool.description}`, parameters: tool.inputSchema } }));
}

export function extractMcpToolCalls(response: unknown, tools: McpToolDefinition[]): McpProposedCall[] {
  const message = (response as { choices?: Array<{ message?: { tool_calls?: unknown[] } }> })?.choices?.[0]?.message;
  const requests = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
  return requests.flatMap((request, index) => {
    const value = request as { id?: unknown; function?: { name?: unknown; arguments?: unknown } };
    const functionName = typeof value.function?.name === "string" ? value.function.name : "";
    const tool = tools.find((candidate) => functionNameForMcpTool(candidate) === functionName);
    if (!tool) return [];
    try {
      const parsed = typeof value.function?.arguments === "string" && value.function.arguments.trim() ? JSON.parse(value.function.arguments) : {};
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
      return [{ id: typeof value.id === "string" ? value.id : `mcp-call-${index}`, functionName, serverId: tool.serverId, serverName: tool.serverName, toolName: tool.name, argumentsValue: parsed as Record<string, unknown> }];
    } catch { return []; }
  });
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
