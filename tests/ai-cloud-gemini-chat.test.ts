import { describe, expect, it } from "vitest";

import { sendAiCloudChat } from "../server/ai-cloud";

describe("AI Cloud Gemini chat proxy", () => {
  it("gửi completion tối thiểu đến Gemini qua proxy phía máy chủ", async () => {
    const result = await sendAiCloudChat({
      model: "gemini-1.5-flash",
      stream: false,
      max_tokens: 16,
      messages: [{ role: "user", content: "Chỉ trả lời: OK" }],
    }) as { choices?: Array<{ message?: { content?: string } }> };
    expect(result.choices?.[0]?.message?.content).toBeTruthy();
  }, 30_000);
});
