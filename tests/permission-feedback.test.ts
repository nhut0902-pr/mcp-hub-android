import { describe, expect, it } from "vitest";

import { permissionFeedback } from "../lib/mcp-hub/permission-feedback";

describe("permissionFeedback", () => {
  it("hướng dẫn thử lại khi hệ thống còn có thể hỏi quyền", () => {
    expect(permissionFeedback("Vị trí", true)).toMatchObject({ action: "Thử lại", openSettings: false });
  });
  it("hướng dẫn mở cài đặt khi hệ thống không thể hỏi lại", () => {
    expect(permissionFeedback("Camera", false)).toMatchObject({ action: "Mở cài đặt", openSettings: true });
  });
});

