import { describe, expect, it } from "vitest";

import { appendMcpToolResults, extractMcpToolCalls, functionNameForMcpTool, mcpCallMayChangeExternalData, mcpStructuredFallbackInstruction, toOpenAiMcpTools } from "../lib/mcp-hub/mcp-chat";
import type { McpToolDefinition } from "../lib/mcp-hub/mcp-connection";

const tool: McpToolDefinition = { serverId: "github-main", serverName: "GitHub", name: "list_issues", description: "List issues", inputSchema: { type: "object", properties: { repo: { type: "string" } } } };

describe("MCP chat tools", () => {
  it("chuyển schema MCP thành function tool có tên ổn định", () => {
    expect(functionNameForMcpTool(tool)).toBe("mcp_github_main__list_issues");
    expect(toOpenAiMcpTools([tool])[0]).toMatchObject({ type: "function", function: { name: "mcp_github_main__list_issues" } });
  });
  it("chỉ nhận tool call khớp tool MCP đã tải", () => {
    const response = { choices: [{ message: { tool_calls: [{ id: "call-1", function: { name: functionNameForMcpTool(tool), arguments: '{"repo":"owner/repo"}' } }, { id: "ignored", function: { name: "other", arguments: "{}" } }] } }] };
    expect(extractMcpToolCalls(response, [tool])).toEqual([{ id: "call-1", functionName: "mcp_github_main__list_issues", serverId: "github-main", serverName: "GitHub", toolName: "list_issues", description: "List issues", argumentsValue: { repo: "owner/repo" } }]);
  });
  it("nhận fallback có thẻ đóng khi provider không trả tool_calls", () => {
    const response = { choices: [{ message: { content: `<mcp-call>{"name":"${functionNameForMcpTool(tool)}","arguments":{"repo":"owner/repo"}}</mcp-call>` } }] };
    expect(extractMcpToolCalls(response, [tool])[0]).toMatchObject({ toolName: "list_issues", argumentsValue: { repo: "owner/repo" } });
    expect(mcpStructuredFallbackInstruction([tool])).toContain(functionNameForMcpTool(tool));
  });
  it("nhận function_call kiểu cũ và Gemini functionCall", () => {
    const legacy = { choices: [{ message: { function_call: { name: functionNameForMcpTool(tool), arguments: '{"repo":"owner/repo"}' } } }] };
    const gemini = { candidates: [{ content: { parts: [{ functionCall: { name: functionNameForMcpTool(tool), args: { repo: "owner/repo" } } }] } }] };
    expect(extractMcpToolCalls(legacy, [tool])[0]).toMatchObject({ toolName: "list_issues" });
    expect(extractMcpToolCalls(gemini, [tool])[0]).toMatchObject({ argumentsValue: { repo: "owner/repo" } });
  });
  it("nhận JSON fallback cân bằng ngay cả khi provider bỏ thẻ đóng", () => {
    const response = { choices: [{ message: { content: `Sẽ gọi tool: <mcp-call>{"name":"${functionNameForMcpTool(tool)}","arguments":{}}` } }] };
    expect(extractMcpToolCalls(response, [tool])[0]).toMatchObject({ toolName: "list_issues", argumentsValue: {} });
  });
  it("đưa kết quả tool vào message role tool để AI tổng hợp", () => {
    const call = { id: "call-1", functionName: functionNameForMcpTool(tool), serverId: tool.serverId, serverName: tool.serverName, toolName: tool.name, description: tool.description, argumentsValue: {} };
    const next = appendMcpToolResults({ messages: [{ role: "user", content: "Liệt kê issue" }] }, { choices: [{ message: { role: "assistant", tool_calls: [] } }] }, [call], [{ serverId: tool.serverId, serverName: tool.serverName, toolName: tool.name, content: [{ type: "text", text: "one" }], isError: false }]);
    expect(next.messages).toHaveLength(3);
    expect((next.messages as Array<{ role: string }>)[2].role).toBe("tool");
  });
  it("chỉ yêu cầu xác nhận với tool có khả năng thay đổi dữ liệu", () => {
    expect(mcpCallMayChangeExternalData({ id: "read", functionName: "read", serverId: "s", serverName: "S", toolName: "list_files", description: "Read files", argumentsValue: {} })).toBe(false);
    expect(mcpCallMayChangeExternalData({ id: "write", functionName: "write", serverId: "s", serverName: "S", toolName: "create_issue", description: "Create an issue", argumentsValue: {} })).toBe(true);
  });
});
