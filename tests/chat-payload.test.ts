import { describe, expect, it } from "vitest";

import { buildChatPayload } from "../lib/mcp-hub/chat-payload";
import type { ModelRecord, ProviderConfig } from "../lib/mcp-hub/types";

const provider: ProviderConfig = { id: "openrouter", kind: "openrouter", name: "OpenRouter", apiBaseUrl: "https://openrouter.ai/api/v1", modelsUrl: "https://openrouter.ai/api/v1/models", headersJson: "{}", enabled: true, apiKeyStored: true, preferredModelId: "openai/gpt-test", pinnedModelIds: ["openai/gpt-test"], modelCount: 1, lastSyncedAt: null };
const model: ModelRecord = { id: "openrouter:openai/gpt-test", providerId: "openrouter", modelId: "openai/gpt-test", displayName: "GPT Test", contextLength: null, supportsThinking: true, supportsWebSearch: true, updatedAt: "2026-08-25T00:00:00.000Z" };

describe("buildChatPayload", () => {
  it("bật reasoning và plugin web cho model OpenRouter có hỗ trợ", () => {
    expect(buildChatPayload(provider, model, [{ id: "u1", role: "user", content: "Tin mới?" }], { thinking: true, webSearch: true, temperature: 0.7, maxTokens: 2048 })).toMatchObject({ model: "openai/gpt-test", reasoning: { enabled: true }, plugins: [{ id: "web" }], temperature: 0.7, max_tokens: 2048 });
  });
  it("không gửi tham số năng lực khi model không hỗ trợ", () => {
    const limited = { ...model, supportsThinking: false, supportsWebSearch: false };
    expect(buildChatPayload(provider, limited, [{ id: "u1", role: "user", content: "Hi" }], { thinking: true, webSearch: true, temperature: 0.3, maxTokens: 512 })).toMatchObject({ temperature: 0.3, max_tokens: 512 });
    expect(buildChatPayload(provider, limited, [{ id: "u1", role: "user", content: "Hi" }], { thinking: true, webSearch: true, temperature: 0.3, maxTokens: 512 })).not.toHaveProperty("plugins");
  });
  it("đưa ảnh và vị trí vào nội dung đa phương thức", () => {
    const payload = buildChatPayload(provider, model, [{ role: "user", content: "Phân tích ảnh", attachments: [{ id: "img", type: "image", label: "Ảnh", dataUri: "data:image/jpeg;base64,AAA" }, { id: "loc", type: "location", label: "Vị trí", latitude: 10.7, longitude: 106.6 }] }], { thinking: false, webSearch: false, temperature: 0.7, maxTokens: 1024 });
    const content = (payload.messages as { content: { type: string; text?: string }[] }[])[0].content;
    expect(content).toHaveLength(2);
    expect(content[0].text).toContain("10.700000, 106.600000");
  });
  it("đưa instruction, top p và metadata tệp vào ngữ cảnh", () => {
    const payload = buildChatPayload(provider, model, [{ role: "user", content: "Tóm tắt", attachments: [{ id: "file", type: "file", label: "brief.pdf", mimeType: "application/pdf" }] }], { thinking: false, webSearch: false, temperature: 0.7, maxTokens: 1024, topP: 0.8, instruction: "Trả lời bằng tiếng Việt." });
    expect(payload).toMatchObject({ top_p: 0.8 });
    const messages = payload.messages as { role: string; content: string }[];
    expect(messages[0]).toMatchObject({ role: "system", content: "Trả lời bằng tiếng Việt." });
    expect(messages[1].content).toContain("brief.pdf");
  });
});
