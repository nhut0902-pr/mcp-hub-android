import { describe, expect, it } from "vitest";

import { normaliseModelsResponse } from "../lib/mcp-hub/model-normalizer";

describe("normaliseModelsResponse", () => {
  it("đọc payload kiểu OpenAI data và loại bản ghi trùng", () => {
    const records = normaliseModelsResponse({ data: [{ id: "llama-3.3", name: "Llama 3.3", context_length: 131072 }, { id: "llama-3.3", name: "Llama cập nhật" }, { id: "qwen" }] }, "groq", "2026-08-25T00:00:00.000Z");
    expect(records).toHaveLength(2);
    expect(records.find((record) => record.modelId === "llama-3.3")).toMatchObject({ displayName: "Llama cập nhật", contextLength: null, supportsThinking: false });
  });

  it("hỗ trợ payload models với schema provider tuỳ chỉnh", () => {
    const records = normaliseModelsResponse({ models: [{ model_id: "internal-chat", display_name: "Internal Chat", contextWindow: "32000" }] }, "internal");
    expect(records[0]).toMatchObject({ providerId: "internal", modelId: "internal-chat", displayName: "Internal Chat", contextLength: 32000 });
  });

  it("đọc URL logo model từ metadata provider khi có", () => {
    const records = normaliseModelsResponse({ data: [{ id: "vision-pro", name: "Vision Pro", metadata: { icon_url: "https://cdn.example.com/vision.png" } }] }, "cloud");
    expect(records[0]).toMatchObject({ modelId: "vision-pro", imageUrl: "https://cdn.example.com/vision.png" });
  });

  it("trả mảng rỗng khi không tìm thấy danh sách model", () => {
    expect(normaliseModelsResponse({ status: "ok" }, "test")).toEqual([]);
  });
});
