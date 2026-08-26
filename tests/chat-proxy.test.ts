import { describe, expect, it, vi } from "vitest";

import { forwardProviderChat } from "../server/chat-proxy";

describe("proxy chat provider", () => {
  it("gửi payload tới endpoint chat hoàn chỉnh và trả JSON", async () => {
    const response = { choices: [{ message: { content: "Xin chào" } }] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(forwardProviderChat({ apiBaseUrl: "https://api.example.com/v1", apiKey: "secret", payload: { model: "demo", messages: [] } })).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/v1/chat/completions", expect.objectContaining({ method: "POST" }));
    vi.unstubAllGlobals();
  });

  it("từ chối endpoint không bảo mật", async () => {
    await expect(forwardProviderChat({ apiBaseUrl: "http://api.example.com/v1", apiKey: "secret", payload: {} })).rejects.toThrow("HTTPS");
  });
});

