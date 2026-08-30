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
import { WEB_AUTH_URL } from "@/constants/oauth";

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

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [starting, setStarting] = useState(false);

  // Listen for the deep-link redirect from the web's /mobile-login page.
  // Expected URL: mcphub://auth?token=xxx&email=yyy&name=zzz
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        const token = parsed.queryParams?.token;
        if (typeof token !== "string" || !token) return;

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
      } catch (e) {
        console.warn("[Login] Failed to parse deep link:", e);
      }
    };

    // Check if the app was launched via a deep link
    Linking.getInitialURL().then(handleUrl).catch(() => undefined);

    // Listen for deep links received while the app is already open
    const sub = Linking.addEventListener("url", (event) => handleUrl(event.url));

    return () => {
      sub.remove();
    };
  }, [router]);

  const startWebLogin = async () => {
    setStarting(true);
    try {
      const loginUrl = `${WEB_AUTH_URL.replace(/\/$/, "")}/mobile-login`;
      console.log("[Login] Opening web browser to:", loginUrl);
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, "mcphub://auth");
      // openAuthSessionAsync on Android returns the final redirect URL when the
      // browser session completes. On iOS it may return { type: "cancel" } if
      // the user closes the browser without completing login.
      if (result?.type === "success" && typeof result.url === "string") {
        // Manually invoke the deep-link handler — on Android this is needed
        // because Linking events are not always fired for self-opened URLs.
        await new Promise<void>((resolve) => {
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          setTimeout(resolve, 50);
        });
        // Will be picked up by handleUrl above via the Linking event
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
          <MaterialIcons name="hub" size={56} color={palette.primary} />
          <Text style={styles.title}>MCP Hub</Text>
          <Text style={styles.subtitle}>Đăng nhập qua NhutCoder Team</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.row}>
            <MaterialIcons name="lock-outline" size={20} color={palette.primary} />
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
            <ActivityIndicator color={palette.primary} />
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
    color: palette.textSecondary,
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
    color: palette.textSecondary,
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
    color: palette.textSecondary,
  },
  disclaimer: {
    fontSize: 11,
    color: palette.textMuted,
    textAlign: "center",
    lineHeight: 16,
  },
});
