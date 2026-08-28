import { describe, expect, it } from "vitest";

describe("OAuth production configuration", () => {
  it("reaches the configured backend auth endpoint without exposing credentials", async () => {
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
    expect(apiBase).toBeTruthy();
    const response = await fetch(`${apiBase}/api/auth/me`, {
      headers: { Accept: "application/json" },
    });
    // A public endpoint must answer either with an authenticated user or the expected 401.
    expect([200, 401]).toContain(response.status);
  });

  it("has valid OAuth endpoint URLs and a non-empty client id", () => {
    const portal = process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL;
    const server = process.env.EXPO_PUBLIC_OAUTH_SERVER_URL;
    const appId = process.env.EXPO_PUBLIC_APP_ID;
    expect(() => new URL(portal ?? "")).not.toThrow();
    expect(() => new URL(server ?? "")).not.toThrow();
    expect(appId?.trim()).toBeTruthy();
  });
});
