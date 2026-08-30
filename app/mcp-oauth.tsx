/**
 * /mcp-oauth — Deep link landing page for MCP OAuth callbacks.
 *
 * When a user connects an MCP server (Notion, GitHub, Slack, etc.) via OAuth,
 * the OAuth provider redirects the browser back to:
 *   mcphub://mcp-oauth?code=xxx&state=yyy
 *
 * IMPORTANT: The actual OAuth code exchange is handled by `startMcpOAuthLogin`
 * in lib/mcp-hub/mcp-oauth.ts, which uses `WebBrowser.openAuthSessionAsync`
 * to intercept the redirect. That function exchanges the code DIRECTLY with
 * the MCP server's token endpoint — no backend involvement needed.
 *
 * This route exists for the case where the app is cold-started by the deep
 * link (i.e., `openAuthSessionAsync` is not running because the app was
 * closed when the redirect arrived). In that case, we can't complete the
 * OAuth flow here (we don't have the PKCE verifier), so we just show a
 * brief loading screen and redirect to the MCP page where the user can
 * retry the connection.
 *
 * v1.0.24: Previously this route re-exported `app/oauth/callback.tsx` which
 * called `Api.exchangeOAuthCode()` → POST /api/oauth/mobile on the backend.
 * But that endpoint only existed on the Manus backend (now removed), so the
 * web returned HTML instead of JSON → parse error → "Authentication failed"
 * screen appeared behind the success dialog.
 */
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";

export default function McpOAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"redirecting" | "error">("redirecting");

  useEffect(() => {
    // Give `startMcpOAuthLogin` (which may be running via openAuthSessionAsync)
    // a moment to process the redirect. If it's not running (cold start),
    // we redirect to the MCP page where the user can retry.
    const timer = setTimeout(() => {
      router.replace("/(tabs)/mcp");
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.content}>
        {status === "redirecting" ? (
          <>
            <ActivityIndicator size="large" color={palette.navy} />
            <Text style={styles.title}>Đang hoàn tất kết nối MCP...</Text>
            <Text style={styles.subtitle}>
              Nếu bạn thấy thông báo "Kết nối MCP thành công", hãy bấm OK rồi
              quay lại trang MCP.
            </Text>
          </>
        ) : (
          <Text style={styles.title}>Đang chuyển hướng...</Text>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  title: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 300,
  },
});
