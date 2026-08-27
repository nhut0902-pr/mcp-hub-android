import { afterEach, describe, expect, it, vi } from "vitest";

import { callMcpTool, listMcpTools, testMcpConnection } from "../lib/mcp-hub/mcp-connection";
import { buildMcpAuthHeaders } from "../lib/mcp-hub/mcp-auth";
import { mcpCatalog } from "../lib/mcp-hub/mcp-catalog";
import type { McpServerConfig } from "../lib/mcp-hub/types";

const server: McpServerConfig = { id: "test", name: "Test MCP", transport: "streamable-http", endpoint: "https://mcp.example.com/mcp", command: "", args: "", authMode: "api-key", apiKeyStored: true, oauthTokenStored: false, oauthIssuer: "", oauthClientId: "", oauthScopes: "", connectionStatus: "idle", connectionDetail: null, lastCheckedAt: null, detectedServerName: null, enabled: true, updatedAt: "2026-08-26T00:00:00.000Z" };

afterEach(() => vi.unstubAllGlobals());

describe("MCP connection test", () => {
  it("gửi Composio API key qua x-api-key", () => {
    expect(buildMcpAuthHeaders("api-key", "composio-key", "x-api-key")).toEqual({ "x-api-key": "composio-key" });
  });

  it("sends initialize with bearer credential and reads server info", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ jsonrpc: "2.0", id: "mcp-hub-initialize", result: { serverInfo: { name: "Example MCP", version: "1.2.0" } } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await testMcpConnection(server, "secret-token");
    expect(result.status).toBe("connected");
    expect(result.detectedServerName).toBe("Example MCP");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer secret-token");
  });

  it("reports missing authorization without sending a network request", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const result = await testMcpConnection(server, null);
    expect(result.status).toBe("auth-required");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("liệt kê tools qua một phiên MCP và giữ session ID", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { serverInfo: { name: "Example" } } }), { status: 200, headers: { "Mcp-Session-Id": "session-1" } }))
      .mockResolvedValueOnce(new Response("", { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { tools: [{ name: "list_items", description: "List items", inputSchema: { type: "object" } }] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const tools = await listMcpTools(server, "secret-token");
    expect(tools).toMatchObject([{ serverId: "test", name: "list_items" }]);
    expect(fetchMock.mock.calls[2][1].headers["Mcp-Session-Id"]).toBe("session-1");
  });

  it("gọi MCP tool bằng tools/call sau initialize", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: {} }), { status: 200, headers: { "Mcp-Session-Id": "session-1" } }))
      .mockResolvedValueOnce(new Response("", { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { content: [{ type: "text", text: "done" }] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await callMcpTool(server, "secret-token", "do_work", { id: 1 });
    expect(result.content).toEqual([{ type: "text", text: "done" }]);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).params).toEqual({ name: "do_work", arguments: { id: 1 } });
  });

  it("has only valid HTTPS remote presets with an explicit auth selection", () => {
    expect(mcpCatalog.length).toBeGreaterThanOrEqual(8);
    expect(mcpCatalog.every((entry) => entry.endpoint.startsWith("https://") && entry.authMode !== "none")).toBe(true);
  });
});
