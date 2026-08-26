import { describe, expect, it } from "vitest";

import { normalizeChatTuning } from "../lib/mcp-hub/chat-settings";

describe("thiết lập điều chỉnh chat", () => {
  it("giữ các giá trị hợp lệ", () => { expect(normalizeChatTuning({ temperature: 0.7, maxTokens: 2048, topP: 0.8, instruction: "Trả lời ngắn gọn" })).toEqual({ temperature: 0.7, maxTokens: 2048, topP: 0.8, instruction: "Trả lời ngắn gọn" }); });
  it("giới hạn temperature, top p và max tokens", () => { expect(normalizeChatTuning({ temperature: 4, maxTokens: 99, topP: -3 })).toEqual({ temperature: 2, maxTokens: 128, topP: 0, instruction: "You are a helpful assistant." }); });
  it("dùng giá trị mặc định cho đầu vào thiếu", () => { expect(normalizeChatTuning(null)).toEqual({ temperature: 0.7, maxTokens: 1024, topP: 0.9, instruction: "You are a helpful assistant." }); });
});
