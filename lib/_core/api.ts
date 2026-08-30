import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "./auth";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Determine the auth method:
  // - Native platform: use stored session token as Bearer auth
  // - Web (including iframe): use cookie-based auth (browser handles automatically)
  //   Cookie is set on backend domain via POST /api/auth/session after receiving token via postMessage
  if (Platform.OS !== "web") {
    const sessionToken = await Auth.getSessionToken();
    console.log("[API] apiCall:", {
      endpoint,
      hasToken: !!sessionToken,
      method: options.method || "GET",
    });
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
      console.log("[API] Authorization header added");
    }
  } else {
    console.log("[API] apiCall:", { endpoint, platform: "web", method: options.method || "GET" });
  }

  const baseUrl = getApiBaseUrl();
  // Ensure no double slashes between baseUrl and endpoint
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${cleanBaseUrl}${cleanEndpoint}` : endpoint;
  console.log("[API] Full URL:", url);

  try {
    console.log("[API] Making request...");
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    console.log("[API] Response status:", response.status, response.statusText);
    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log("[API] Response headers:", responseHeaders);

    // Check if Set-Cookie header is present (cookies are automatically handled in React Native)
    const setCookie = response.headers.get("Set-Cookie");
    if (setCookie) {
      console.log("[API] Set-Cookie header received:", setCookie);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API] Error response:", errorText);
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        // Not JSON, use text as is
      }
      throw new Error(errorMessage || `API call failed: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log("[API] JSON response received");
      return data as T;
    }

    const text = await response.text();
    console.log("[API] Text response received");
    return (text ? JSON.parse(text) : {}) as T;
  } catch (error) {
    console.error("[API] Request failed:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}

// OAuth callback handler - exchange code for session token
// Calls /api/oauth/mobile endpoint which returns JSON with app_session_id and user
export async function exchangeOAuthCode(
  code: string,
  state: string,
): Promise<{ sessionToken: string; user: any }> {
  console.log("[API] exchangeOAuthCode called");
  // Use GET with query params
  const params = new URLSearchParams({ code, state });
  const endpoint = `/api/oauth/mobile?${params.toString()}`;
  console.log("[API] Calling OAuth mobile endpoint:", endpoint);
  const result = await apiCall<{ app_session_id: string; user: any }>(endpoint);

  // Convert app_session_id to sessionToken for compatibility
  const sessionToken = result.app_session_id;
  console.log("[API] OAuth exchange result:", {
    hasSessionToken: !!sessionToken,
    hasUser: !!result.user,
    sessionToken: sessionToken ? `${sessionToken.substring(0, 50)}...` : null,
  });

  return {
    sessionToken,
    user: result.user,
  };
}

// Logout
export async function logout(): Promise<void> {
  await apiCall<void>("/api/auth/logout", {
    method: "POST",
  });
}

// Get current authenticated user (web uses cookie-based auth)
export async function getMe(): Promise<{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: string;
  role?: "user" | "admin";
} | null> {
  try {
    const result = await apiCall<{ user: any }>("/api/auth/me");
    return result.user || null;
  } catch (error) {
    console.error("[API] getMe failed:", error);
    return null;
  }
}

// Establish session cookie on the backend (3000-xxx domain)
// Called after receiving token via postMessage to get a proper Set-Cookie from the backend
export async function establishSession(token: string): Promise<boolean> {
  try {
    console.log("[API] establishSession: setting cookie on backend...");
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/auth/session`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include", // Important: allows Set-Cookie to be stored
    });

    if (!response.ok) {
      console.error("[API] establishSession failed:", response.status);
      return false;
    }

    console.log("[API] establishSession: cookie set successfully");
    return true;
  } catch (error) {
    console.error("[API] establishSession error:", error);
    return false;
  }
}


/** Exchange a Supabase Auth access token for the existing MCP Hub session contract. */
export async function establishSupabaseSession(
  accessToken: string,
): Promise<{ sessionToken: string; user: any }> {
  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const response = await fetch(`${cleanBaseUrl}/api/auth/supabase/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    app_session_id?: string;
    user?: any;
    error?: string;
  };
  if (!response.ok || !payload.app_session_id) {
    throw new Error(payload.error || "Không thể tạo phiên MCP Hub từ Supabase");
  }

  return { sessionToken: payload.app_session_id, user: payload.user };
}

/**
 * Exchange a NhutCoder Team web auth JWT for the app's session.
 *
 * v1.0.20+: Stateless JWT flow. The web's /mobile-login mints a JWT signed
 * with AUTH_SECRET (TTL 7 days), then redirects the browser to
 * `${DEEP_LINK_SCHEME}://auth?token=jwt`. The app stores the JWT in
 * SecureStore and uses it as Bearer for all subsequent API calls to
 * /api/auth/me, /api/auth/logout, etc. on the web (nhutcoder-team-v2.vercel.app).
 *
 * No Manus backend dependency — all on Vercel. No DB lookup on subsequent
 * requests — the JWT itself contains user info, verified by the web's
 * verifyToken() helper.
 *
 * To preserve backward compatibility with the existing app_session_id
 * contract used throughout the app, this function returns the JWT as
 * `sessionToken` and synthesizes a user object by calling /api/auth/me.
 */
export async function establishWebSession(
  webToken: string,
): Promise<{ sessionToken: string; user: any }> {
  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  console.log("[establishWebSession] baseUrl:", cleanBaseUrl);
  console.log("[establishWebSession] token length:", webToken.length);
  console.log("[establishWebSession] token preview:", webToken.slice(0, 40) + "..." + webToken.slice(-20));
  console.log("[establishWebSession] token has period:", webToken.includes("."));
  console.log("[establishWebSession] token parts count:", webToken.split(".").length);

  // Verify the JWT by calling /api/auth/me on the web — if it's valid,
  // we get back the user info. If not, we throw.
  const meResponse = await fetch(`${cleanBaseUrl}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${webToken}`,
      Accept: "application/json",
    },
  });

  console.log("[establishWebSession] /api/auth/me status:", meResponse.status);

  if (!meResponse.ok) {
    const errBody = (await meResponse.json().catch(() => ({}))) as {
      error?: string;
      reason?: string;
      decodedBody?: unknown;
      tokenPreview?: string;
      tokenLength?: number;
      hasAuthSecret?: boolean;
    };
    console.error("[establishWebSession] verify failed:", JSON.stringify(errBody));
    // Build a detailed error message so the user can see what went wrong
    const reason = errBody?.reason || "unknown";
    const detail = errBody?.reason === "verify_failed"
      ? `JWT signature mismatch (tokenLength=${errBody.tokenLength}, hasAuthSecret=${errBody.hasAuthSecret})`
      : errBody?.reason === "no_bearer_token"
      ? "No Bearer token in Authorization header"
      : errBody?.reason === "invalid_token_format"
      ? `Invalid token format (tokenLength=${errBody.tokenLength})`
      : errBody?.error || `HTTP ${meResponse.status}`;
    throw new Error(`Không thể xác thực JWT: ${detail}`);
  }

  const mePayload = (await meResponse.json()) as { user?: any };
  if (!mePayload.user) {
    throw new Error("JWT không hợp lệ hoặc đã hết hạn (user=null)");
  }

  return { sessionToken: webToken, user: mePayload.user };
}
