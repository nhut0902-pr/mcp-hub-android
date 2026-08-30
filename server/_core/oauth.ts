import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? null,
      lastSignedIn,
    }
  );
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

async function getSupabaseUser(accessToken: string) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase Auth server configuration is missing");
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase user verification failed (${response.status})`);
  }

  const profile = (await response.json()) as {
    id?: string;
    email?: string;
    user_metadata?: { full_name?: string; name?: string };
  };
  if (!profile.id) throw new Error("Supabase user id is missing");
  return profile;
}

export function registerOAuthRoutes(app: Express) {
  // Exchange a Supabase Auth bearer token for the existing MCP Hub session.
  // This keeps all existing protected routes and AI Cloud proxy compatible.
  app.post("/api/auth/supabase/session", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Supabase Bearer token required" });
        return;
      }
      const accessToken = authHeader.slice("Bearer ".length).trim();
      const profile = await getSupabaseUser(accessToken);
      const user = await syncUser({
        openId: `supabase:${profile.id}`,
        name: profile.user_metadata?.full_name || profile.user_metadata?.name || profile.email || null,
        email: profile.email || null,
        loginMethod: "supabase",
      });
      const sessionToken = await sdk.createSessionToken(`supabase:${profile.id}`, {
        name: profile.user_metadata?.full_name || profile.user_metadata?.name || profile.email || "",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ app_session_id: sessionToken, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] Supabase session exchange failed:", error);
      res.status(401).json({ error: "Invalid Supabase session" });
    }
  });

  // Exchange a one-time NhutCoder Team web auth token for an MCP Hub session.
  // The mobile app opens the web's /mobile-login page in a browser; the web
  // mints a one-time token via /api/auth/mobile/token and redirects the
  // browser back to the deep link `mcphub://auth?token=xxx`. The app then
  // POSTs here with that token as the Bearer credential, the backend calls
  // the web's /api/auth/mobile/verify endpoint to redeem it (single-use),
  // and finally creates the long-lived app_session_id.
  app.post("/api/auth/web/session", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Web auth Bearer token required" });
        return;
      }
      const webToken = authHeader.slice("Bearer ".length).trim();

      const webAuthUrl = (
        process.env.EXPO_PUBLIC_WEB_AUTH_URL ||
        "https://nhutcoder-team-v2.vercel.app"
      ).replace(/\/$/, "");

      const verifyUrl = `${webAuthUrl}/api/auth/mobile/verify?token=${encodeURIComponent(webToken)}`;
      const verifyHeaders: Record<string, string> = {
        Accept: "application/json",
      };
      const sharedSecret = process.env.MCP_HUB_AUTH_SECRET;
      if (sharedSecret) {
        verifyHeaders["X-Auth-Secret"] = sharedSecret;
      }

      const verifyRes = await fetch(verifyUrl, { headers: verifyHeaders });
      if (!verifyRes.ok) {
        const errBody = (await verifyRes.json().catch(() => ({}))) as { error?: string };
        console.error("[Auth] Web token verify failed:", verifyRes.status, errBody?.error);
        res.status(401).json({
          error: errBody?.error || `Web token verification failed (${verifyRes.status})`,
        });
        return;
      }
      const verifyPayload = (await verifyRes.json()) as {
        ok: boolean;
        user?: { id: string; email?: string | null; name?: string | null; avatarUrl?: string | null };
      };
      if (!verifyPayload.ok || !verifyPayload.user?.id) {
        res.status(401).json({ error: "Web token returned no user" });
        return;
      }

      const webUser = verifyPayload.user;
      const openId = `web:${webUser.id}`;
      const displayName = webUser.name || webUser.email || "MCP Hub User";
      const user = await syncUser({
        openId,
        name: webUser.name ?? null,
        email: webUser.email ?? null,
        loginMethod: "nhutcoder-web",
      });
      const sessionToken = await sdk.createSessionToken(openId, {
        name: displayName,
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ app_session_id: sessionToken, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] Web session exchange failed:", error);
      res.status(401).json({ error: "Invalid web auth session" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to the frontend URL (Expo web on port 8081)
      // Cookie is set with parent domain so it works across both 3000 and 8081 subdomains
      const frontendUrl =
        process.env.EXPO_WEB_PREVIEW_URL ||
        process.env.EXPO_PACKAGER_PROXY_URL ||
        "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);

      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user),
      });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // Get current authenticated user - works with both cookie (web) and Bearer token (mobile)
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  // Establish session cookie from Bearer token
  // Used by iframe preview: frontend receives token via postMessage, then calls this endpoint
  // to get a proper Set-Cookie response from the backend (3000-xxx domain)
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      // Authenticate using Bearer token from Authorization header
      const user = await sdk.authenticateRequest(req);

      // Get the token from the Authorization header to set as cookie
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();

      // Set cookie for this domain (3000-xxx)
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
