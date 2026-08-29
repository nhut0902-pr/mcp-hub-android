import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url).pathname, "utf8");

describe("Supabase Auth bridge", () => {
  it("keeps the server-side token exchange route and Supabase verification", () => {
    const oauth = source("server/_core/oauth.ts");
    expect(oauth).toContain('/api/auth/supabase/session');
    expect(oauth).toContain('/auth/v1/user');
    expect(oauth).toContain("supabase:${profile.id}");
    expect(oauth).toContain("sdk.createSessionToken");
  });

  it("uses Supabase email/password and the existing MCP Hub session contract", () => {
    const login = source("app/login.tsx");
    expect(login).toContain("signInWithPassword");
    expect(login).toContain("signUp");
    expect(login).toContain("establishSupabaseSession");
    expect(login).not.toContain("startOAuthLogin");
  });
});
