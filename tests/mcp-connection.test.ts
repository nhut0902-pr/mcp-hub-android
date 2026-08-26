import { afterEach, describe, expect, it, vi } from "vitest";

import { testMcpConnection } from "../lib/mcp-hub/mcp-connection";
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

  it("has only valid HTTPS remote presets with an explicit auth selection", () => {
    expect(mcpCatalog.length).toBeGreaterThanOrEqual(8);
    expect(mcpCatalog.every((entry) => entry.endpoint.startsWith("https://") && entry.authMode !== "none")).toBe(true);
  });
});
