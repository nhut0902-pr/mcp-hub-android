import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton, Card, palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase-client";

function toHubUser(user: any): Auth.User {
  return {
    id: Number(user?.id ?? 0),
    openId: String(user?.openId ?? ""),
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? "supabase",
    lastSignedIn: new Date(user?.lastSignedIn ?? Date.now()),
    role: user?.role === "admin" ? "admin" : "user",
  };
}

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [starting, setStarting] = useState(false);
  const [signUpMode, setSignUpMode] = useState(false);

  const submit = async () => {
    if (!isSupabaseConfigured()) {
      Alert.alert("Chưa cấu hình đăng nhập", "Supabase Auth chưa được cấu hình cho bản APK này.");
      return;
    }
    if (!email.trim() || password.length < 6) {
      Alert.alert("Thông tin chưa hợp lệ", "Nhập email hợp lệ và mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    setStarting(true);
    try {
      const result = signUpMode
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (signUpMode && !result.data.session) {
        Alert.alert("Kiểm tra email", "Supabase đã gửi email xác minh. Xác minh xong rồi đăng nhập lại.");
        setSignUpMode(false);
        return;
      }
      const accessToken = result.data.session?.access_token;
      if (!accessToken) throw new Error("Supabase chưa trả về access token");

      const session = await Api.establishSupabaseSession(accessToken);
      const hubUser = toHubUser(session.user);
      await Auth.setSessionToken(session.sessionToken);
      await Auth.setUserInfo(hubUser);
      Alert.alert("Đăng nhập thành công", "Bạn có thể sử dụng Nhutbot 1.0 Flash.", [
        { text: "Mở AI Cloud", onPress: () => router.replace("/(tabs)/ai-cloud") },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đăng nhập thất bại";
      Alert.alert(signUpMode ? "Không thể tạo tài khoản" : "Không thể đăng nhập", message);
    } finally {
      setStarting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => undefined);
    await logout();
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={styles.logo}><MaterialIcons name="cloud" size={28} color="#FFFFFF" /></View>
          <Text style={styles.title}>Đăng nhập MCP Hub</Text>
          <Text style={styles.subtitle}>Đăng nhập miễn phí để sử dụng Nhutbot 1.0 Flash và quản lý quyền Cloud.</Text>
        </View>
        {loading ? <ActivityIndicator color={palette.navy} /> : isAuthenticated ? (
          <Card style={styles.success}>
            <MaterialIcons name="verified-user" size={25} color="#52D39A" />
            <Text style={styles.successTitle}>Đã đăng nhập</Text>
            <Text style={styles.detail}>{user?.name || user?.email || "Tài khoản MCP Hub"}</Text>
            <AppButton label="Mở AI Cloud" icon="cloud-done" onPress={() => router.replace("/(tabs)/ai-cloud")} />
            <AppButton label="Đăng xuất" icon="logout" variant="secondary" onPress={() => void handleLogout()} />
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>{signUpMode ? "Tạo tài khoản miễn phí" : "Đăng nhập miễn phí"}</Text>
            <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email" placeholderTextColor={palette.muted} value={email} onChangeText={setEmail} style={styles.input} />
            <TextInput secureTextEntry autoComplete="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" placeholderTextColor={palette.muted} value={password} onChangeText={setPassword} style={styles.input} />
            <Text style={styles.detail}>Tài khoản được xác thực bởi Supabase Free; không cần tài khoản Manus.</Text>
            <AppButton label={starting ? "Đang xử lý…" : signUpMode ? "Tạo tài khoản" : "Đăng nhập"} icon={signUpMode ? "person-add" : "login"} loading={starting} onPress={() => void submit()} />
            <AppButton label={signUpMode ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"} icon="swap-horiz" variant="secondary" onPress={() => setSignUpMode((value) => !value)} />
            <AppButton label="Quay lại" icon="arrow-back" variant="secondary" onPress={() => router.back()} />
          </Card>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 20, justifyContent: "center", gap: 18 },
  brand: { alignItems: "center", gap: 8 },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" },
  title: { color: palette.text, fontSize: 22, fontWeight: "900" },
  subtitle: { color: palette.muted, fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 320 },
  card: { gap: 12 },
  success: { gap: 10, alignItems: "center" },
  cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
  successTitle: { color: "#52D39A", fontSize: 16, fontWeight: "900" },
  detail: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  input: { borderWidth: 1, borderColor: palette.border, borderRadius: 12, color: palette.text, backgroundColor: "#FFFFFF", paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
});
