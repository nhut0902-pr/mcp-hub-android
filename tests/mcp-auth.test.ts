import { describe, expect, it } from "vitest";

import { buildMcpAuthHeaders, mcpCredentialHint } from "../lib/mcp-hub/mcp-auth";

describe("xác thực MCP", () => {
  it("dùng Bearer token cho API key", () => {
    expect(buildMcpAuthHeaders("api-key", " api_123 ")).toEqual({ Authorization: "Bearer api_123" });
  });

  it("dùng Bearer token cho OAuth access token", () => {
    expect(buildMcpAuthHeaders("oauth", "oauth_token")).toEqual({ Authorization: "Bearer oauth_token" });
    expect(mcpCredentialHint("oauth")).toContain("OAuth");
  });

  it("không gửi header khi không xác thực hoặc token trống", () => {
    expect(buildMcpAuthHeaders("none", "secret")).toEqual({});
    expect(buildMcpAuthHeaders("api-key", null)).toEqual({});
  });
});

