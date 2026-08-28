import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { OAUTH_PORTAL_URL, startOAuthLogin } from "@/constants/oauth";

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [starting, setStarting] = useState(false);

  const login = async () => {
    if (!OAUTH_PORTAL_URL) {
      Alert.alert("Chưa cấu hình đăng nhập", "Backend OAuth production chưa được cấu hình cho bản APK này.");
      return;
    }
    setStarting(true);
    try {
      await startOAuthLogin();
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.brand}><View style={styles.logo}><MaterialIcons name="cloud" size={28} color="#FFFFFF" /></View><Text style={styles.title}>Đăng nhập MCP Hub</Text><Text style={styles.subtitle}>Đăng nhập để sử dụng Nhutbot 1.0 Flash và quản lý quyền Cloud.</Text></View>
        {loading ? <ActivityIndicator color={palette.navy} /> : isAuthenticated ? <Card style={styles.success}><MaterialIcons name="verified-user" size={25} color="#52D39A" /><Text style={styles.successTitle}>Đã đăng nhập</Text><Text style={styles.detail}>{user?.name || user?.email || "Tài khoản MCP Hub"}</Text><AppButton label="Mở AI Cloud" icon="cloud-done" onPress={() => router.replace("/(tabs)/ai-cloud")} /><AppButton label="Đăng xuất" icon="logout" variant="secondary" onPress={() => void logout()} /></Card> : <Card style={styles.card}><Text style={styles.cardTitle}>Cloud cần tài khoản</Text><Text style={styles.detail}>Phiên đăng nhập được lưu an toàn trên thiết bị. API key upstream không được đưa vào APK.</Text><AppButton label={starting ? "Đang mở đăng nhập…" : "Đăng nhập bằng OAuth"} icon="login" loading={starting} onPress={() => void login()} /><AppButton label="Quay lại" icon="arrow-back" variant="secondary" onPress={() => router.back()} /></Card>}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { flex: 1, padding: 20, justifyContent: "center", gap: 18 }, brand: { alignItems: "center", gap: 8 }, logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" }, title: { color: palette.text, fontSize: 22, fontWeight: "900" }, subtitle: { color: palette.muted, fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 320 }, card: { gap: 12 }, success: { gap: 10, alignItems: "center" }, cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900" }, successTitle: { color: "#52D39A", fontSize: 16, fontWeight: "900" }, detail: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: "center" } });
