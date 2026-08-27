import { afterEach, describe, expect, it, vi } from "vitest";

import { sendAiCloudChat } from "../server/ai-cloud";

describe("AI Cloud MCP tools", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("giữ tool_choice required khi schema MCP hợp lệ", async () => {
    vi.stubEnv("AI_CLOUD_API_KEY", "test-only");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { tool_calls: [] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendAiCloudChat({ messages: [{ role: "user", content: "Dùng MCP" }], tools: [{ type: "function", function: { name: "mcp_demo__status", description: "Status", parameters: { type: "object", properties: {} } } }], tool_choice: "required" });
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.tool_choice).toBe("required");
    expect(body.tools).toHaveLength(1);
  });
});
