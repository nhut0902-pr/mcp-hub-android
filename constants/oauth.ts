import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

// v1.0.23+: Deep link scheme is now hardcoded as "mcphub".
// Previously derived from bundleId (`com.app.mcpproviderconfigurator` →
// `manusmcpproviderconfigurator`) which leaked the "manus" brand name in
// OAuth consent screens. The new scheme is clean and short.
//
// If the app.config.ts `scheme` field is set, we use that; otherwise fall back
// to "mcphub".
const configuredScheme = Constants.expoConfig?.scheme;
const deepLinkScheme = (Array.isArray(configuredScheme) ? configuredScheme[0] : configuredScheme) ?? "mcphub";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  webAuthUrl?: string;
};

const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? extra.apiBaseUrl ?? "",
  webAuthUrl: process.env.EXPO_PUBLIC_WEB_AUTH_URL ?? extra.webAuthUrl ?? "https://nhutcoder-team-v2.vercel.app",
  deepLinkScheme,
};

export const API_BASE_URL = env.apiBaseUrl;
export const WEB_AUTH_URL = env.webAuthUrl;
export const DEEP_LINK_SCHEME = env.deepLinkScheme;

/**
 * Build the deep-link URL the web should redirect the browser to after the
 * one-time token is minted. We expose the scheme via the
 * `?scheme=mcphub` query param when the app opens the web's /mobile-login
 * page, so the web knows exactly which scheme to use.
 *
 * Default: `${DEEP_LINK_SCHEME}://auth?token=xxx&email=yyy&name=zzz`
 */
export function buildAuthDeepLink(token: string, opts?: { email?: string; name?: string }): string {
  const params = new URLSearchParams();
  params.set("token", token);
  if (opts?.email) params.set("email", opts.email);
  if (opts?.name) params.set("name", opts.name);
  return `${env.deepLinkScheme}://auth?${params.toString()}`;
}

/**
 * Build the URL of the web's /mobile-login bridge page. We append the app's
 * deep-link scheme as a query param so the web knows which scheme to redirect
 * back to.
 */
export function buildWebLoginUrl(): string {
  const base = env.webAuthUrl.replace(/\/$/, "");
  return `${base}/mobile-login?scheme=${encodeURIComponent(env.deepLinkScheme)}`;
}

/**
 * Get the API base URL.
 *
 * v1.0.20+: All API calls go directly to the NhutCoder Team web app on Vercel
 * (nhutcoder-team-v2.vercel.app) — no Manus backend dependency. The web's
 * /api/auth/* endpoints handle JWT verification statelessly.
 *
 * Override via `EXPO_PUBLIC_API_BASE_URL` env var if needed (e.g. for local dev).
 */
export function getApiBaseUrl(): string {
  // If API_BASE_URL is set explicitly, use it (highest priority)
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }
  // Default: the NhutCoder Team web app (handles /api/auth/me, /api/auth/logout, etc.)
  return WEB_AUTH_URL.replace(/\/$/, "");
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "mcphub-user-info";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};

/**
 * Get the redirect URI for OAuth callback.
 * - Web: uses API server callback endpoint
 * - Native: uses deep link scheme
 */
export const getRedirectUri = () => {
  if (ReactNative.Platform.OS === "web") {
    return `${getApiBaseUrl()}/api/oauth/callback`;
  } else {
    return Linking.createURL("/oauth/callback", {
      scheme: env.deepLinkScheme,
    });
  }
};
