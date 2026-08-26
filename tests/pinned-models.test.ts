import { describe, expect, it } from "vitest";

import { getPinnedModels, normalizePinnedModelIds, updatePinnedModels } from "../lib/mcp-hub/pinned-models";
import type { ModelRecord, ProviderConfig } from "../lib/mcp-hub/types";

const provider: ProviderConfig = { id: "groq", kind: "groq", name: "Groq", apiBaseUrl: "https://api.groq.com/openai/v1", modelsUrl: "https://api.groq.com/openai/v1/models", headersJson: "{}", enabled: true, apiKeyStored: true, preferredModelId: "m1", pinnedModelIds: ["m1"], modelCount: 2, lastSyncedAt: null };
const models: ModelRecord[] = ["m1", "m2"].map((modelId) => ({ id: `groq:${modelId}`, providerId: "groq", modelId, displayName: modelId, contextLength: null, supportsThinking: false, supportsWebSearch: false, updatedAt: "2026-08-25T00:00:00.000Z" }));

describe("danh sách model đã ghim", () => {
  it("di trú model ưu tiên cũ thành danh sách ghim", () => {
    expect(normalizePinnedModelIds(undefined, "m1")).toEqual(["m1"]);
  });
  it("có thể ghim nhiều model rồi bỏ ghim từng model", () => {
    const twoPinned = updatePinnedModels(provider, "m2");
    expect(twoPinned.pinnedModelIds).toEqual(["m1", "m2"]);
    expect(updatePinnedModels(twoPinned, "m1").pinnedModelIds).toEqual(["m2"]);
  });
  it("chỉ trả các model đang tồn tại của provider", () => {
    expect(getPinnedModels({ ...provider, pinnedModelIds: ["m2", "removed"] }, models).map((model) => model.modelId)).toEqual(["m2"]);
  });
});

