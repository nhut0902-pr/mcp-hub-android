import { describe, expect, it } from "vitest";

import { attachmentCaption, toolContext } from "../lib/mcp-hub/chat-tools";

describe("chat tools", () => {
  it("tạo mô tả vị trí có toạ độ", () => { expect(attachmentCaption({ id: "loc", type: "location", label: "Vị trí hiện tại", latitude: 10.776889, longitude: 106.700806 })).toContain("10.776889, 106.700806"); });
  it("tạo ngữ cảnh MCP từ profile đang bật", () => { expect(toolContext([{ id: "m1", name: "Filesystem", transport: "stdio", endpoint: "" }])).toContain("Filesystem [stdio]"); });
});
