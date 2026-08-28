import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("native OAuth redirect configuration", () => {
  const appConfig = readFileSync(resolve(process.cwd(), "app.config.ts"), "utf8");
  const oauthConstants = readFileSync(resolve(process.cwd(), "constants/oauth.ts"), "utf8");

  it("registers both production schemes with the OAuth callback host", () => {
    expect(appConfig).toContain('scheme: [`manus${timestamp}`, "mcphub"]');
    expect(appConfig).toContain('scheme: `manus${timestamp}`, host: "mcp-oauth"');
    expect(appConfig).toContain('scheme: "mcphub", host: "mcp-oauth"');
  });

  it("uses manus.im for the authorize portal and resolves the runtime Expo scheme", () => {
    expect(appConfig).toContain('oauthPortalUrl: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "https://manus.im"');
    expect(oauthConstants).toContain('extra.oauthPortalUrl ?? "https://manus.im"');
    expect(oauthConstants).toContain("const configuredScheme = Constants.expoConfig?.scheme;");
    expect(oauthConstants).toContain("scheme: env.deepLinkScheme");
    expect(oauthConstants).not.toContain('portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? extra.oauthPortalUrl ?? "https://api.manus.im"');
  });
});
