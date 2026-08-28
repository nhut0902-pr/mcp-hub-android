import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

import { AI_CLOUD_CHAT_ENDPOINT, AI_CLOUD_DEFAULT_MODEL, AI_CLOUD_PROVIDER } from "../server/ai-cloud";

describe("AI Cloud managed provider", () => {
  it("chỉ công khai cấu hình endpoint, không mang API key vào mô hình provider", () => {
    expect(AI_CLOUD_PROVIDER).toMatchObject({ id: "ai-cloud", apiBaseUrl: "https://chatgpt-api.chocode.com.vn/v1" });
    expect(AI_CLOUD_CHAT_ENDPOINT).toBe("https://gemini-api.chocode.com.vn/v1/chat/completions");
    expect(Object.keys(AI_CLOUD_PROVIDER)).not.toContain("apiKey");
  });

  it("cố định model Gemini đã xác thực cho AI Cloud", () => {
    expect(AI_CLOUD_DEFAULT_MODEL).toBe("gemini-1.5-flash");
  });

  it("yêu cầu session Bearer ở client và proxy trước khi gọi upstream", () => {
    const client = source("lib/mcp-hub/ai-cloud-client.ts");
    const proxy = source("ai-cloud-proxy/api/chat.js");
    const models = source("ai-cloud-proxy/api/models.js");
    expect(client).toContain("AiCloudAuthenticationRequiredError");
    expect(client).toContain("Authorization: `Bearer ${sessionToken}`");
    expect(proxy).toContain("hasAuthenticatedUser(request)");
    expect(models).toContain("hasAuthenticatedUser(request)");
    expect(proxy).toContain("Bạn cần đăng nhập");
  });
});
