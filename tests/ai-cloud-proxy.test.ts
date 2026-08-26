import { describe, expect, it } from "vitest";

import { AI_CLOUD_CHAT_ENDPOINT, AI_CLOUD_PROVIDER } from "../server/ai-cloud";

describe("AI Cloud managed provider", () => {
  it("chỉ công khai cấu hình endpoint, không mang API key vào mô hình provider", () => {
    expect(AI_CLOUD_PROVIDER).toMatchObject({ id: "ai-cloud", apiBaseUrl: "https://chatgpt-api.chocode.com.vn/v1" });
    expect(AI_CLOUD_CHAT_ENDPOINT).toBe("https://gemini-api.chocode.com.vn/v1/chat/completions");
    expect(Object.keys(AI_CLOUD_PROVIDER)).not.toContain("apiKey");
  });
});
