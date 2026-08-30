import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { DEEP_LINK_SCHEME, buildWebLoginUrl } from "@/constants/oauth";

function toHubUser(user: any): Auth.User {
  return {
    id: Number(user?.id ?? 0),
    openId: String(user?.openId ?? ""),
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? "nhutcoder-web",
    lastSignedIn: new Date(user?.lastSignedIn ?? Date.now()),
    role: user?.role === "admin" ? "admin" : "user",
  };
}

/** Extract `token` query param from a deep-link URL of the form
 *  `${DEEP_LINK_SCHEME}://auth?token=xxx&email=yyy&name=zzz`.
 *  Returns null if the URL doesn't match the auth callback pattern. */
function extractTokenFromDeepLink(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    // Linking.parse returns { hostname, path, queryParams }
    // For `manusmcpproviderconfigurator://auth?token=xxx`:
    //   hostname === "auth"  (some RN versions put it in `path`)
    //   queryParams.token === "xxx"
    const host = parsed.hostname || parsed.path || "";
    if (host !== "auth") return null;
    const token = parsed.queryParams?.token;
    if (typeof token !== "string" || token.length === 0) return null;
    return token;
  } catch {
    return null;
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [starting, setStarting] = useState(false);

  // Single handler for processing the auth deep link. Used both for the
  // initial launch URL and for incoming deep-link events while the app is
  // open.
  const handleAuthDeepLink = async (url: string | null) => {
    if (!url) return;
    const token = extractTokenFromDeepLink(url);
    if (!token) return;

    setStarting(true);
    try {
      // Exchange the one-time web token for a long-lived MCP Hub session.
      const session = await Api.establishWebSession(token);
      const hubUser = toHubUser(session.user);
      await Auth.setSessionToken(session.sessionToken);
      await Auth.setUserInfo(hubUser);
      Alert.alert(
        "Đăng nhập thành công",
        `Chào ${hubUser.email ?? hubUser.name ?? "bạn"}! Bạn có thể sử dụng Nhutbot 1.0 Flash.`,
        [{ text: "Mở AI Cloud", onPress: () => router.replace("/(tabs)/ai-cloud") }],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đăng nhập thất bại";
      Alert.alert("Không thể đăng nhập", message);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    // Check if the app was launched via a deep link
    Linking.getInitialURL().then(handleAuthDeepLink).catch(() => undefined);

    // Listen for deep links received while the app is already open
    const sub = Linking.addEventListener("url", (event) => handleAuthDeepLink(event.url));

    return () => {
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const startWebLogin = async () => {
    setStarting(true);
    try {
      const loginUrl = buildWebLoginUrl();
      console.log("[Login] Opening web browser to:", loginUrl, "scheme:", DEEP_LINK_SCHEME);
      // `openAuthSessionAsync` is the right choice for OAuth-like flows:
      // - iOS: opens SFSafariViewController, returns the redirect URL
      // - Android: opens a Custom Tab, returns the redirect URL
      // The redirect URL is `${DEEP_LINK_SCHEME}://auth?token=xxx` — we pass
      // DEEP_LINK_SCHEME so the browser session knows when to hand control
      // back to the app.
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, `${DEEP_LINK_SCHEME}://auth`);
      console.log("[Login] WebBrowser result:", result?.type);
      if (result?.type === "success") {
        // On Android, `openAuthSessionAsync` returns the final redirect URL
        // but Linking events don't always fire for self-opened URLs, so we
        // manually invoke the handler here too.
        // Some RN versions put the URL on `result.url`, others don't expose it
        // — in that case we rely on the Linking event listener above.
        const resultWithUrl = result as { url?: string };
        if (typeof resultWithUrl.url === "string") {
          await handleAuthDeepLink(resultWithUrl.url);
        }
      } else if (result?.type === "cancel") {
        // User dismissed the browser without completing login
        console.log("[Login] User cancelled web login");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể mở trang đăng nhập";
      Alert.alert("Lỗi mở trình duyệt", message);
    } finally {
      setStarting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <MaterialIcons name="hub" size={56} color={palette.navy} />
          <Text style={styles.title}>MCP Hub</Text>
          <Text style={styles.subtitle}>Đăng nhập qua NhutCoder Team</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.row}>
            <MaterialIcons name="lock-outline" size={20} color={palette.navy} />
            <Text style={styles.cardTitle}>Đăng nhập bảo mật</Text>
          </View>
          <Text style={styles.cardText}>
            Đăng nhập bằng tài khoản NhutCoder Team của bạn để truy cập Nhutbot 1.0 Flash và các tính năng Cloud.
          </Text>
          <AppButton
            label={starting ? "Đang mở trình duyệt..." : "Đăng nhập qua NhutCoder Team"}
            icon="login"
            onPress={startWebLogin}
            loading={starting}
          />
        </Card>

        {loading ? (
          <View style={styles.centeredRow}>
            <ActivityIndicator color={palette.navy} />
            <Text style={styles.statusText}>Đang kiểm tra phiên...</Text>
          </View>
        ) : isAuthenticated && user ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Phiên hiện tại</Text>
            <Text style={styles.cardText}>{user.email ?? user.name ?? "Đã đăng nhập"}</Text>
            <AppButton label="Đăng xuất" icon="logout" variant="secondary" onPress={handleLogout} />
          </Card>
        ) : null}

        <Text style={styles.disclaimer}>
          Bằng việc đăng nhập, bạn đồng ý với các điều khoản sử dụng và chính sách bảo mật của NhutCoder Team.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    gap: 16,
  },
  brand: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
  },
  subtitle: {
    fontSize: 14,
    color: palette.muted,
  },
  card: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
  },
  cardText: {
    fontSize: 13,
    color: palette.muted,
    lineHeight: 18,
  },
  centeredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    color: palette.muted,
  },
  disclaimer: {
    fontSize: 11,
    color: palette.muted,
    textAlign: "center",
    lineHeight: 16,
  },
});
