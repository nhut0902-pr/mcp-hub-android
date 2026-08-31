/**
 * +not-found — Beautiful 404 page for unmatched routes.
 *
 * Replaces the ugly default Expo Router "Unmatched Route" page with a
 * branded, theme-aware screen that gives the user helpful actions.
 *
 * v1.0.24+: Added to fix the ugly default 404 page.
 */
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View, Pressable } from "react-native";

import { palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="link-off" size={56} color={palette.navy} />
        </View>
        <Text style={styles.title}>Không tìm thấy trang</Text>
        <Text style={styles.subtitle}>
          Đường dẫn bạn mở không khớp với bất kỳ màn hình nào trong MCP Hub.
          Nếu bạn vừa đăng nhập hoặc kết nối MCP, hãy quay lại trang chủ.
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(tabs)/chat")}>
            <MaterialIcons name="home" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Về trang chủ</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={18} color={palette.text} />
            <Text style={styles.secondaryBtnText}>Quay lại</Text>
          </Pressable>
        </View>
        <Text style={styles.foot}>MCP Hub · v1.0.34+</Text>
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
    gap: 16,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.border,
  },
  title: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 320,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: palette.navy,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryBtnText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  foot: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 16,
  },
});
