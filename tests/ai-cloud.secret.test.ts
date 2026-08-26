import { describe, expect, it } from "vitest";

describe("AI Cloud managed provider credential", () => {
  it("xác thực API key bằng endpoint danh sách model", async () => {
    const apiKey = process.env.AI_CLOUD_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://chatgpt-api.chocode.com.vn/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });

    expect(response.status).toBe(200);
  }, 15_000);
});
