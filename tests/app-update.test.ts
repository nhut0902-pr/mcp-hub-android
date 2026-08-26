import { describe, expect, it } from "vitest";

import { isNewerVersion, parseAppUpdate } from "../lib/mcp-hub/app-update-manifest";

describe("app update metadata", () => {
  it("chỉ chấp nhận bản phát hành mới hơn theo semantic version", () => {
    expect(isNewerVersion("1.0.5", "1.0.4")).toBe(true);
    expect(isNewerVersion("1.1.0", "1.0.4")).toBe(true);
    expect(isNewerVersion("1.0.4", "1.0.4")).toBe(false);
    expect(isNewerVersion("invalid", "1.0.4")).toBe(false);
  });

  it("chỉ nhận URL APK release HTTPS của MCP Hub", () => {
    expect(parseAppUpdate({ version: "1.0.5", apkUrl: "https://github.com/nhut0902-pr/mcp-hub-android/releases/download/v1.0.5/MCP-Hub-v1.0.5.apk", notes: "Sửa lỗi", publishedAt: "2026-08-26T10:00:00Z" })?.version).toBe("1.0.5");
    expect(parseAppUpdate({ version: "1.0.5", apkUrl: "https://example.com/app.apk", notes: "Sửa lỗi", publishedAt: "2026-08-26T10:00:00Z" })).toBeNull();
  });
});
