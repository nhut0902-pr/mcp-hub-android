import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { VideoScreenHeader } from "@/components/video-screen-header";
import { palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { APP_VERSION, checkForAppUpdate, downloadAndInstallAppUpdate, type AppUpdate } from "@/lib/mcp-hub/app-update";

export default function AboutScreen() {
  const links = [
    { label: "Mã nguồn GitHub", url: "https://github.com/nhut0902-pr/mcp-hub-android", icon: "code" as const },
    { label: "Website", url: "https://mcp-hub-android.vercel.app", icon: "language" as const },
  ];
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const check = async () => {
    setChecking(true);
    try {
      const next = await checkForAppUpdate();
      setUpdate(next);
      if (!next) Alert.alert("MCP Hub đã mới nhất", `Thiết bị đang dùng V${APP_VERSION}.`);
    } catch (error) {
      Alert.alert("Không thể kiểm tra cập nhật", error instanceof Error ? error.message : "Hãy thử lại sau.");
    } finally {
      setChecking(false);
    }
  };

  const install = async () => {
    if (!update) return;
    try {
      setProgress(0);
      await downloadAndInstallAppUpdate(update, setProgress);
    } catch (error) {
      Alert.alert("Không thể cài cập nhật", error instanceof Error ? error.message : "Hãy thử lại sau.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <VideoScreenHeader title="Giới thiệu" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <MaterialIcons name="hub" color="#FFFFFF" size={52} />
          </View>
          <Text style={styles.name}>MCP Hub</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>V{APP_VERSION}</Text>
          </View>
          <Text style={styles.description}>
            Trung tâm AI trên Android — quản lý provider, kết nối MCP servers,
            và trò chuyện với AI Cloud miễn phí.
          </Text>
        </View>

        {/* Update card */}
        <View style={styles.card}>
          <Pressable
            onPress={() => void (update ? install() : check())}
            disabled={checking || progress !== null}
            style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.linkLeft}>
              <View style={styles.linkIconWrap}>
                <MaterialIcons
                  name={update ? "system-update-alt" : "system-update"}
                  size={22}
                  color={palette.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkText}>
                  {progress !== null
                    ? `Đang tải cập nhật ${Math.round(progress * 100)}%`
                    : update
                    ? `Cài đặt V${update.version}`
                    : checking
                    ? "Đang kiểm tra..."
                    : "Kiểm tra cập nhật"}
                </Text>
                <Text style={styles.linkDetail}>
                  {Platform.OS === "android"
                    ? update
                      ? update.notes
                      : "Tải và cài APK mới nhất ngay trong app."
                    : "Tính năng cài APK hỗ trợ Android."}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={palette.textMuted} />
          </Pressable>

          {links.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={() => void Linking.openURL(item.url)}
              style={({ pressed }) => [styles.linkRow, index > 0 && styles.linkDivider, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={styles.linkLeft}>
                <View style={styles.linkIconWrap}>
                  <MaterialIcons name={item.icon} size={22} color={palette.accent} />
                </View>
                <Text style={styles.linkText}>{item.label}</Text>
              </View>
              <MaterialIcons name="open-in-new" size={18} color={palette.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.team}>Powered by NhutCoder Team</Text>
          <Text style={styles.foot}>
            MCP Hub lưu API key trong SecureStore của thiết bị. AI Cloud được xử lý qua lớp bảo mật Vercel.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 24 },
  hero: { alignItems: "center", gap: 10, paddingTop: 16 },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  name: { color: palette.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  versionBadge: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.border,
  },
  versionText: { color: palette.primary, fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  description: {
    maxWidth: 320,
    textAlign: "center",
    color: palette.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
  },
  linkRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  linkDivider: { borderTopWidth: 1, borderTopColor: palette.border },
  linkLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  linkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: { color: palette.text, fontSize: 15, fontWeight: "600" },
  linkDetail: { color: palette.textMuted, fontSize: 12, lineHeight: 16, marginTop: 3, maxWidth: 220 },
  footer: { alignItems: "center", gap: 8 },
  team: { color: palette.primary, fontSize: 14, fontWeight: "800" },
  foot: { color: palette.textMuted, fontSize: 12, lineHeight: 17, textAlign: "center", paddingHorizontal: 20 },
});
