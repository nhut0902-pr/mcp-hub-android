import { describe, expect, it } from "vitest";

import { getSendState } from "../lib/mcp-hub/send-state";

describe("trạng thái nút gửi", () => {
  it("cho phép gửi khi có nội dung và không đang gửi", () => {
    expect(getSendState("Xin chào", false)).toEqual({ canSend: true, message: null });
  });

  it("trả hướng dẫn khi nội dung trống", () => {
    expect(getSendState("  ", false)).toMatchObject({ canSend: false, message: "Nhập nội dung trước khi gửi." });
  });

  it("khoá duy nhất trong lúc đang gửi", () => {
    expect(getSendState("Xin chào", true)).toMatchObject({ canSend: false, message: "Đang chờ phản hồi từ provider." });
  });
});

