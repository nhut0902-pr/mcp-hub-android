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
import { APP_VERSION } from "@/lib/mcp-hub/app-update";

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

function extractTokenFromDeepLink(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
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

  const handleAuthDeepLink = async (url: string | null) => {
    if (!url) return;
    const token = extractTokenFromDeepLink(url);
    if (!token) return;

    setStarting(true);
    try {
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
    Linking.getInitialURL().then(handleAuthDeepLink).catch(() => undefined);
    const sub = Linking.addEventListener("url", (event) => handleAuthDeepLink(event.url));
    return () => { sub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const startWebLogin = async () => {
    setStarting(true);
    try {
      const loginUrl = buildWebLoginUrl();
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, `${DEEP_LINK_SCHEME}://auth`);
      if (result?.type === "success") {
        const resultWithUrl = result as { url?: string };
        if (typeof resultWithUrl.url === "string") {
          await handleAuthDeepLink(resultWithUrl.url);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể mở trang đăng nhập";
      Alert.alert("Lỗi mở trình duyệt", message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.content}>
        {/* Hero section */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <MaterialIcons name="hub" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>MCP Hub</Text>
          <Text style={styles.subtitle}>Trung tâm AI trên Android</Text>
        </View>

        {/* Login card */}
        <Card style={styles.loginCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="lock-outline" size={22} color={palette.primary} />
            <Text style={styles.cardTitle}>Đăng nhập bảo mật</Text>
          </View>
          <Text style={styles.cardText}>
            Đăng nhập bằng tài khoản NhutCoder Team để truy cập Nhutbot 1.0 Flash, MCP servers và các tính năng Cloud.
          </Text>
          <AppButton
            label={starting ? "Đang mở trình duyệt..." : "Đăng nhập qua NhutCoder Team"}
            icon="login"
            onPress={startWebLogin}
            loading={starting}
          />
        </Card>

        {/* Loading / current session */}
        {loading ? (
          <View style={styles.centeredRow}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={styles.statusText}>Đang kiểm tra phiên...</Text>
          </View>
        ) : isAuthenticated && user ? (
          <Card style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <MaterialIcons name="check-circle" size={20} color={palette.success} />
              <Text style={styles.cardTitle}>Phiên hiện tại</Text>
            </View>
            <Text style={styles.sessionEmail}>{user.email ?? user.name ?? "Đã đăng nhập"}</Text>
            <AppButton label="Đăng xuất" icon="logout" variant="secondary" onPress={() => void logout()} />
          </Card>
        ) : null}

        {/* Features teaser */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <MaterialIcons name="cloud" size={18} color={palette.primary} />
            <Text style={styles.featureText}>AI Cloud miễn phí</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="hub" size={18} color={palette.accent} />
            <Text style={styles.featureText}>35+ MCP servers</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="security" size={18} color={palette.success} />
            <Text style={styles.featureText}>API key bảo mật</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          Bằng việc đăng nhập, bạn đồng ý với điều khoản sử dụng và chính sách bảo mật của NhutCoder Team.
        </Text>
        <Text style={styles.version}>v{APP_VERSION}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 20,
  },
  hero: {
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: palette.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: palette.textSecondary,
    fontWeight: "500",
  },
  loginCard: {
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: 0.2,
  },
  cardText: {
    fontSize: 14,
    color: palette.textSecondary,
    lineHeight: 21,
  },
  sessionCard: {
    gap: 12,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionEmail: {
    fontSize: 15,
    color: palette.text,
    fontWeight: "600",
  },
  centeredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  statusText: {
    fontSize: 14,
    color: palette.textSecondary,
  },
  features: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    flexWrap: "wrap",
    marginTop: 4,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featureText: {
    fontSize: 13,
    color: palette.textSecondary,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 12,
    color: palette.textMuted,
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 16,
  },
  version: {
    fontSize: 12,
    color: palette.textMuted,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
