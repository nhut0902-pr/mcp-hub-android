import { describe, expect, it } from "vitest";

describe("production OAuth route configuration", () => {
  it("uses the verified Manus portal and OAuth API server", async () => {
    const portal = process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL;
    const server = process.env.EXPO_PUBLIC_OAUTH_SERVER_URL;
    const appId = process.env.EXPO_PUBLIC_APP_ID;

    expect(portal).toBe("https://manus.im");
    expect(server).toBe("https://api.manus.im");
    expect(appId).toBeTruthy();

    const portalResponse = await fetch(`${portal}/app-auth?appId=${encodeURIComponent(appId!)}&redirectUri=manusconfigurator%3A%2F%2Foauth%2Fcallback&state=test&type=signIn`);
    expect(portalResponse.status).not.toBe(404);

    const serverResponse = await fetch(`${server}/webdev.v1.WebDevAuthPublicService/GetUserInfo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessToken: "invalid-test-token" }),
    });
    expect(serverResponse.status).not.toBe(404);
  }, 15_000);
});
