import { describe, expect, it, vi } from "vitest";

import { forwardProviderChat } from "../server/chat-proxy";

describe("proxy chat provider", () => {
  it("gửi payload tới endpoint chat hoàn chỉnh và trả JSON", async () => {
    const response = { choices: [{ message: { content: "Xin chào" } }] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(forwardProviderChat({ apiBaseUrl: "https://api.example.com/v1", apiKey: "secret", payload: { model: "demo", messages: [] } })).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/v1/chat/completions", expect.objectContaining({ method: "POST" }));
    vi.unstubAllGlobals();
  });

  it("từ chối endpoint không bảo mật", async () => {
    await expect(forwardProviderChat({ apiBaseUrl: "http://api.example.com/v1", apiKey: "secret", payload: {} })).rejects.toThrow("HTTPS");
  });

  it("chuyển MCP tool schema và tool-use của Claude về định dạng OpenAI", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "tool_use", id: "toolu-1", name: "mcp_demo__status", input: { verbose: true } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await forwardProviderChat({ apiBaseUrl: "https://api.anthropic.com/v1", apiKey: "secret", providerKind: "anthropic", payload: { model: "claude-demo", messages: [{ role: "user", content: "Kiểm tra" }], tools: [{ type: "function", function: { name: "mcp_demo__status", description: "Status", parameters: { type: "object", properties: {} } } }], tool_choice: "required" } });
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.tools).toEqual([expect.objectContaining({ name: "mcp_demo__status" })]);
    expect(body.tool_choice).toEqual({ type: "any" });
    expect(result).toMatchObject({ choices: [{ message: { tool_calls: [{ function: { name: "mcp_demo__status", arguments: JSON.stringify({ verbose: true }) } }] } }] });
    vi.unstubAllGlobals();
  });
});
