import { describe, expect, it } from "vitest";

describe("Supabase Auth configuration", () => {
  it("has a reachable Auth settings endpoint", async () => {
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(baseUrl).toMatch(/^https:\/\/[^\s/]+\.supabase\.co\/?$/);
    expect(publishableKey).toMatch(/^sb_(publishable|anon)_/);

    const response = await fetch(`${baseUrl!.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: {
        apikey: publishableKey!,
        Authorization: `Bearer ${publishableKey}`,
      },
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.ok).toBe(true);
    const body = (await response.json()) as { external?: Record<string, boolean> };
    expect(body).toHaveProperty("external");
  }, 20_000);
});
