import { describe, expect, it } from "vitest";

import { withStartupTimeout } from "../lib/mcp-hub/startup";

describe("withStartupTimeout", () => {
  it("trả về fallback nếu thao tác khởi động bị treo", async () => {
    const neverSettles = new Promise<string>(() => undefined);
    await expect(withStartupTimeout(neverSettles, "fallback", 5)).resolves.toBe("fallback");
  });

  it("giữ kết quả hợp lệ khi storage phản hồi kịp thời", async () => {
    await expect(withStartupTimeout(Promise.resolve("saved-state"), "fallback", 50)).resolves.toBe("saved-state");
  });
});
