import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, palette, StatusPill } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE_URL } from "@/constants/oauth";

export default function AdminScreen() {
  const router = useRouter();
  const { user, loading, isAuthenticated, refresh, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const isAdmin = user?.role === "admin";
  const refreshAccess = async () => { setRefreshing(true); try { await refresh(); } finally { setRefreshing(false); } };

  if (loading) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><ActivityIndicator color={palette.navy} /></View></ScreenContainer>;
  if (!isAuthenticated) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><MaterialIcons name="lock" size={34} color={palette.muted} /><Text style={styles.title}>Cần đăng nhập</Text><Text style={styles.detail}>Đăng nhập trước khi mở khu vực quản trị.</Text><AppButton label="Đăng nhập" icon="login" onPress={() => router.replace("/login")} /></View></ScreenContainer>;
  if (!isAdmin) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><MaterialIcons name="block" size={34} color={palette.error} /><Text style={styles.title}>Không có quyền admin</Text><Text style={styles.detail}>Tài khoản hiện tại chỉ được dùng Cloud theo chính sách người dùng.</Text><AppButton label="Quay lại" icon="arrow-back" variant="secondary" onPress={() => router.back()} /></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.header}><AppButton label="Quay lại" icon="arrow-back" variant="secondary" onPress={() => router.back()} /></View><View style={styles.content}><View style={styles.heading}><View style={styles.adminIcon}><MaterialIcons name="admin-panel-settings" size={24} color="#FFFFFF" /></View><View><Text style={styles.title}>Quản trị Cloud</Text><Text style={styles.detail}>Chỉ admin server-side mới xem được trang này.</Text></View></View><Card style={styles.card}><View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.cardTitle}>Nhutbot 1.0 Flash</Text><Text style={styles.detail}>Quản lý qua proxy bảo mật; API key không hiển thị ở client.</Text></View><StatusPill label="Bật" tone="success" /></View><View style={styles.meta}><Text style={styles.metaLabel}>Backend API</Text><Text selectable style={styles.metaValue}>{API_BASE_URL || "Chưa cấu hình trong build"}</Text></View><View style={styles.meta}><Text style={styles.metaLabel}>Tài khoản</Text><Text style={styles.metaValue}>{user.email || user.name || user.openId}</Text></View></Card><Card style={styles.card}><Text style={styles.cardTitle}>Kiểm tra quyền</Text><Text style={styles.detail}>Role được lấy từ backend sau khi xác thực session. Không dựa vào cờ lưu cục bộ để cấp quyền admin.</Text><AppButton label={refreshing ? "Đang kiểm tra…" : "Làm mới session"} icon="refresh" loading={refreshing} onPress={() => void refreshAccess()} /></Card><AppButton label="Đăng xuất" icon="logout" variant="secondary" onPress={() => { void logout().then(() => Alert.alert("Đã đăng xuất", "Phiên Cloud đã được xoá khỏi thiết bị.")); }} /></View></ScreenContainer>;
}

const styles = StyleSheet.create({ header: { padding: 12 }, content: { flex: 1, padding: 14, gap: 12 }, center: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 11 }, heading: { flexDirection: "row", alignItems: "center", gap: 10 }, adminIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" }, title: { color: palette.text, fontSize: 18, fontWeight: "900" }, detail: { color: palette.muted, fontSize: 11, lineHeight: 17 }, card: { gap: 12 }, cardTitle: { color: palette.text, fontSize: 14, fontWeight: "900" }, row: { flexDirection: "row", alignItems: "center", gap: 8 }, meta: { borderTopWidth: 1, borderColor: "#3B3B3B", paddingTop: 9, gap: 3 }, metaLabel: { color: palette.muted, fontSize: 10, fontWeight: "700" }, metaValue: { color: palette.text, fontSize: 11, fontFamily: "monospace" } });
