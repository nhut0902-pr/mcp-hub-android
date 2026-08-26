import { describe, expect, it } from "vitest";

import { classifyProviderError } from "../lib/mcp-hub/provider-error";

describe("phân loại lỗi provider", () => {
  it("nhận diện API key thiếu", () => { expect(classifyProviderError(new Error("Chưa có API key cho Groq")).kind).toBe("missing-key"); });
  it("nhận diện API key không hợp lệ", () => { expect(classifyProviderError(new Error("Provider trả về HTTP 401: invalid API key")).kind).toBe("invalid-key"); });
  it("nhận diện key không có quyền model", () => { expect(classifyProviderError(new Error("Provider trả về HTTP 403: forbidden")).kind).toBe("forbidden"); });
  it("nhận diện quota", () => { expect(classifyProviderError(new Error("Provider trả về HTTP 429")).kind).toBe("quota"); });
});
