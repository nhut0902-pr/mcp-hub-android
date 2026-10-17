import { afterEach, describe, expect, it, vi } from "vitest";

import { APP_VERSION } from "../lib/mcp-hub/app-update-manifest";
import { mcpCatalog } from "../lib/mcp-hub/mcp-catalog";
import { summarizeMcpResults } from "../lib/mcp-hub/mcp-chat";
import { callMcpTool, listMcpTools, testMcpConnection } from "../lib/mcp-hub/mcp-connection";
import { createInitialState, type McpServerConfig } from "../lib/mcp-hub/types";

// Catalog values fill the new-profile form; the rest are the form's empty defaults.
const preset = mcpCatalog.find((entry) => entry.id === "parallel-search-free")!;
const server: McpServerConfig = {
  ...preset, id: "saved-free-search", command: "", args: "",
  apiKeyStored: false, oauthTokenStored: false, oauthIssuer: "", oauthClientId: "", oauthScopes: "",
  enabled: true, updatedAt: "2026-10-17T00:00:00.000Z",
};

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function rpcResponse(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
}

describe("anonymous Parallel Search MCP", () => {
  it("is opt-in and keeps the existing credentialed presets", () => {
    expect(preset).toMatchObject({ endpoint: "https://search.parallel.ai/mcp", transport: "streamable-http", authMode: "none" });
    expect(createInitialState().mcpServers).toEqual([]);
    expect(mcpCatalog.find((entry) => entry.id === "parallel-search")).toMatchObject({ endpoint: "https://mcp.parallel.ai/search", authMode: "api-key", apiKeyHeader: "authorization" });
    expect(mcpCatalog.find((entry) => entry.id === "parallel-task")).toMatchObject({ endpoint: "https://mcp.parallel.ai/task", authMode: "api-key" });
  });

  it("initializes, discovers tools, searches and fetches with no credentials", async () => {
    const calls: Array<{ method: string; params?: Record<string, unknown> }> = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://search.parallel.ai/mcp");
      const headers = new Headers(init.headers);
      expect(headers.get("User-Agent")).toBe(`MCP-Hub/${APP_VERSION}`);
      expect(headers.get("Authorization")).toBeNull();
      expect(headers.get("x-api-key")).toBeNull();
      expect(headers.get("Accept")).toBe("application/json, text/event-stream");
      expect(init.method).toBe("POST");
      const request = JSON.parse(String(init.body));
      calls.push(request);
      if (request.method === "initialize") return rpcResponse({ serverInfo: { name: "Parallel Web Search MCP Server" } });
      if (request.method === "tools/list") return rpcResponse({ tools: [
        { name: "web_search", description: "Search the web", inputSchema: { type: "object", required: ["objective", "search_queries"] } },
        { name: "web_fetch", description: "Read a page", inputSchema: { type: "object", required: ["urls"] } },
      ] });
      expect(request.method).toBe("tools/call");
      return rpcResponse({ content: [{ type: "text", text: request.params.name === "web_search" ? "MCP transports: https://modelcontextprotocol.io/" : "Streamable HTTP supports JSON-RPC over HTTP." }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    // Even a stray saved token must not be sent when the selected auth mode is none.
    expect((await testMcpConnection(server, "unused-token")).status).toBe("connected");
    const tools = await listMcpTools(server, null);
    expect(tools.map((tool) => tool.name)).toEqual(["web_search", "web_fetch"]);
    const searchArgs = { objective: "Find MCP transport documentation", search_queries: ["MCP Streamable HTTP specification"] };
    const search = await callMcpTool(server, null, tools[0].name, searchArgs);
    const fetchArgs = { urls: ["https://modelcontextprotocol.io/"] };
    const fetched = await callMcpTool(server, null, tools[1].name, fetchArgs);
    expect(calls.filter((call) => call.method === "tools/call").map((call) => call.params)).toEqual([
      { name: "web_search", arguments: searchArgs }, { name: "web_fetch", arguments: fetchArgs },
    ]);
    expect(search.isError).toBe(false);
    expect(summarizeMcpResults([search, fetched])).toContain("https://modelcontextprotocol.io/");
    expect(summarizeMcpResults([fetched])).toContain("Streamable HTTP supports JSON-RPC");
  });

  it("surfaces tool errors in the existing result summary", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(rpcResponse({}))
      .mockResolvedValueOnce(rpcResponse({ isError: true, content: [{ type: "text", text: "Free usage limit reached" }] })));
    const result = await callMcpTool(server, null, "web_search", { objective: "MCP docs", search_queries: ["MCP docs"] });
    expect(result.isError).toBe(true);
    expect(summarizeMcpResults([result])).toContain("(báo lỗi)\nFree usage limit reached");
  });

  it("propagates HTTP and JSON-RPC failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(rpcResponse({})).mockResolvedValueOnce(new Response("Too many requests", { status: 429 })));
    await expect(callMcpTool(server, null, "web_fetch", { urls: ["https://example.com"] })).rejects.toThrow("HTTP 429");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(rpcResponse({})).mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: -32602, message: "Invalid params" } }), { status: 200 })));
    await expect(callMcpTool(server, null, "web_search", {})).rejects.toThrow("Invalid params");
  });

  it("reports network failure without claiming a connected profile", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")));
    expect(await testMcpConnection(server, null)).toMatchObject({ status: "failed", detail: "Network unavailable" });
  });

  it("aborts a stalled tool request after the existing 12 second timeout", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(rpcResponse({})).mockImplementationOnce((_url: string, init: RequestInit) => {
      signal = init.signal as AbortSignal;
      return new Promise((_resolve, reject) => signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
    }));
    const call = callMcpTool(server, null, "web_search", { objective: "MCP docs", search_queries: ["MCP docs"] });
    const rejected = expect(call).rejects.toThrow("12 giây");
    await vi.advanceTimersByTimeAsync(12_000);
    await rejected;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
