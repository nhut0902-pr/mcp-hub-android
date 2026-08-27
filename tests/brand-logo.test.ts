import { describe, expect, it } from "vitest";
import { brandMonogram, mcpLogoUrl, providerLogoUrl } from "../lib/mcp-hub/brand-logo";

describe("brand logos", () => {
  it("maps known provider brands to their logo assets", () => {
    expect(providerLogoUrl("openai", "OpenAI")).toContain("/openai.png");
    expect(providerLogoUrl("anthropic", "Claude")).toContain("/anthropic.png");
    expect(providerLogoUrl("custom", "Nội bộ")).toBeNull();
  });
  it("maps MCP presets and preserves a visible fallback for unknown servers", () => {
    expect(mcpLogoUrl("Notion", "https://mcp.notion.com/mcp")).toContain("/notion.png");
    expect(mcpLogoUrl("GitHub", "https://api.githubcopilot.com/mcp")).toContain("/github.png");
    expect(mcpLogoUrl("Máy chủ nội bộ", "https://mcp.example.com")).toBeNull();
    expect(brandMonogram("Máy chủ nội bộ")).toBe("MC");
  });
});
