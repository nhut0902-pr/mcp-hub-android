import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ProviderBrandMark } from "@/components/brand-mark";
import { AppButton, Card, palette, StatusPill } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { hasNativeMcpHubRuntime, mcpHubRuntime, type ClawLinkRuntimeStatus } from "@/lib/mcp-hub/native-runtime";

const initialStatus: ClawLinkRuntimeStatus = { state: "not_installed", detail: "Runtime cục bộ chưa được cài.", updatedAt: 0, runtimePath: "files/runtime" };

export default function ClawLinkScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<ClawLinkRuntimeStatus>(initialStatus);
  const [installing, setInstalling] = useState(false);
  const [installingGateway, setInstallingGateway] = useState(false);
  const [gatewayLog, setGatewayLog] = useState("Chưa có nhật ký Gateway.");
  const nativeAvailable = Platform.OS === "android" && hasNativeMcpHubRuntime;

  const refresh = useCallback(() => {
    if (!nativeAvailable || !mcpHubRuntime) return;
    try { setStatus(mcpHubRuntime.getRuntimeStatus()); setGatewayLog(`${mcpHubRuntime.getGatewaySetupLog()}\n\n${mcpHubRuntime.getGatewayLog()}`.trim()); } catch { setStatus({ ...initialStatus, state: "error", detail: "Không thể đọc trạng thái native runtime trong bản đang chạy." }); }
  }, [nativeAvailable]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const start = () => {
    if (!nativeAvailable || !mcpHubRuntime) return;
    try { setStatus(mcpHubRuntime.startGatewayService()); setGatewayLog(`${mcpHubRuntime.getGatewaySetupLog()}\n\n${mcpHubRuntime.getGatewayLog()}`.trim()); } catch { setStatus({ ...status, state: "error", detail: "Không thể bật dịch vụ nền ClawLink." }); }
  };
  const stop = () => {
    if (!nativeAvailable || !mcpHubRuntime) return;
    try { setStatus(mcpHubRuntime.stopGatewayService()); setGatewayLog(`${mcpHubRuntime.getGatewaySetupLog()}\n\n${mcpHubRuntime.getGatewayLog()}`.trim()); } catch { setStatus({ ...status, state: "error", detail: "Không thể dừng dịch vụ nền ClawLink." }); }
  };
  const install = async () => {
    if (!nativeAvailable || !mcpHubRuntime || installing) return;
    setInstalling(true);
    setStatus({ ...status, state: "running", detail: "Đang chuẩn bị tải bootstrap có kiểm tra checksum…" });
    try { setStatus(await mcpHubRuntime.installTerminalBootstrap()); }
    catch { setStatus({ ...status, state: "error", detail: "Không thể hoàn tất cài terminal bootstrap; không có runtime nào được chạy." }); }
    finally { setInstalling(false); }
  };
  const installGateway = async () => {
    if (!nativeAvailable || !mcpHubRuntime || installingGateway || status.state === "not_installed") return;
    setInstallingGateway(true);
    setStatus({ ...status, state: "installing", detail: "Đang tải và kiểm tra Gateway runtime…" });
    try { setStatus(await mcpHubRuntime.installGatewayRuntime()); setGatewayLog(`${mcpHubRuntime.getGatewaySetupLog()}\n\n${mcpHubRuntime.getGatewayLog()}`.trim()); }
    catch { setStatus({ ...status, state: "error", detail: "Không thể hoàn tất cài Gateway; không có tiến trình nào được tự chạy." }); }
    finally { setInstallingGateway(false); }
  };
  const tone = status.state === "error" ? "warning" : status.state === "ready" || status.state === "running" ? "success" : "neutral";

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.screen}>
    <View style={styles.header}><Pressable onPress={() => router.replace("/chat" as never)} style={styles.iconButton}><MaterialIcons name="arrow-back-ios-new" size={19} color={palette.text} /></Pressable><View style={styles.headerTitle}><ProviderBrandMark name="ClawLink Gateway" kind="openclaw" size={31} /><View><Text style={styles.title}>ClawLink Gateway</Text><Text style={styles.subTitle}>Gateway cục bộ trên điện thoại</Text></View></View><Pressable onPress={() => router.push("/terminal" as never)} style={styles.iconButton}><MaterialIcons name="terminal" size={21} color="#82CCFF" /></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.hero}><View style={styles.heroRow}><ProviderBrandMark name="ClawLink Gateway" kind="openclaw" size={52} /><View style={{ flex: 1 }}><Text style={styles.heroTitle}>Môi trường Gateway riêng</Text><Text style={styles.heroText}>ClawLink chuẩn bị runtime trong thư mục riêng của MCP Hub, không cần một ứng dụng Terminal thứ hai. Provider/endpoint ClawLink cũ của bạn vẫn hoạt động độc lập.</Text></View></View><View style={styles.pills}><StatusPill label={nativeAvailable ? "Android native" : "Cần APK native"} tone={nativeAvailable ? "success" : "neutral"} /><StatusPill label={status.state.replace("_", " ")} tone={tone} /></View></Card>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Trạng thái runtime</Text><Pressable onPress={refresh} style={styles.refresh}><MaterialIcons name="refresh" color="#8EC8F7" size={16} /><Text style={styles.refreshText}>Làm mới</Text></Pressable></View>
      <Card style={styles.statusCard}><View style={styles.statusIcon}><MaterialIcons name={status.state === "error" ? "error-outline" : status.state === "ready" || status.state === "running" ? "check-circle-outline" : "inventory-2"} color={status.state === "error" ? "#FF9A9A" : "#9BD5FF"} size={22} /></View><View style={{ flex: 1 }}><Text style={styles.statusTitle}>{status.state === "not_installed" ? "Chưa cài runtime" : status.state === "installing" ? "Đang cài runtime" : status.state === "ready" ? "Terminal sẵn sàng" : status.state === "running" ? "Gateway đang chạy" : status.state === "stopped" ? "Gateway đã dừng" : "Cần kiểm tra"}</Text><Text style={styles.statusDetail}>{nativeAvailable ? status.detail : "Màn này hiển thị đầy đủ khi mở từ APK Android đã tích hợp native module."}</Text></View></Card>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Thiết lập ClawLink</Text><Text style={styles.sectionMeta}>Có kiểm tra integrity</Text></View>
      <Card style={styles.installCard}><View style={styles.step}><Text style={styles.stepNo}>1</Text><View style={{ flex: 1 }}><Text style={styles.stepTitle}>Terminal PTY</Text><Text style={styles.stepText}>Terminal nội bộ đã có shell Android thực. Không chuyển lệnh sang ứng dụng khác khi native module khả dụng.</Text></View></View><View style={styles.step}><Text style={styles.stepNo}>2</Text><View style={{ flex: 1 }}><Text style={styles.stepTitle}>Runtime đã pin phiên bản</Text><Text style={styles.stepText}>Bootstrap, Node và package Gateway chỉ được tải qua HTTPS, kiểm tra checksum, giải nén staging và cài nguyên tử.</Text></View></View><View style={styles.step}><Text style={styles.stepNo}>3</Text><View style={{ flex: 1 }}><Text style={styles.stepTitle}>Gateway foreground</Text><Text style={styles.stepText}>Dịch vụ nền chỉ giữ phiên sau khi runtime được xác minh; notification luôn cho biết Gateway đang hoạt động.</Text></View></View><Text style={styles.notice}>Trình cài OpenClaw-compatible đang được rà soát tương thích Bionic/giấy phép từng artifact trước khi bật tải trong bản phát hành. Bản hiện tại không tự tải hoặc chạy script không xác minh.</Text></Card>
      <View style={styles.buttons}><AppButton label={installing ? "Đang cài terminal…" : status.state === "not_installed" ? "Cài Terminal bootstrap" : "Kiểm tra runtime"} icon="download" loading={installing} disabled={!nativeAvailable || installing || installingGateway} onPress={() => void install()} /><AppButton label={installingGateway ? "Đang cài Gateway…" : "Cài OpenClaw Gateway"} icon="cloud-download" loading={installingGateway} disabled={!nativeAvailable || status.state === "not_installed" || installing || installingGateway} onPress={() => void installGateway()} /><AppButton label="Khởi động Gateway" icon="play-arrow" disabled={!nativeAvailable || status.state === "not_installed" || status.state === "installing" || installingGateway} onPress={start} /><AppButton label="Dừng Gateway" icon="stop" variant="secondary" disabled={!nativeAvailable || status.state === "not_installed"} onPress={stop} /><AppButton label="Mở cấu hình Provider" icon="tune" variant="secondary" onPress={() => router.push("/providers" as never)} /></View>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Nhật ký Gateway</Text><Pressable onPress={refresh} style={styles.refresh}><MaterialIcons name="refresh" color="#8EC8F7" size={16} /><Text style={styles.refreshText}>Làm mới</Text></Pressable></View>
      <Card style={styles.logCard}><Text selectable style={styles.logText}>{nativeAvailable ? gatewayLog : "Nhật ký native sẽ xuất hiện trong APK Android đã build."}</Text></Card>
      <Card style={styles.safety}><MaterialIcons name="shield" color="#83C6FF" size={20} /><View style={{ flex: 1 }}><Text style={styles.safetyTitle}>Bảo mật và giới hạn hiện tại</Text><Text style={styles.safetyText}>Token vẫn nằm trong SecureStore của ứng dụng và không ghi vào nhật ký. Chỉ thao tác Gateway do bạn bấm mới được thực hiện. Kiểm thử trên thiết bị Android là bắt buộc trước khi coi Gateway cục bộ là sẵn sàng.</Text></View></Card>
    </ScrollView>
  </View></ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background }, header: { height: 60, borderBottomWidth: 1, borderBottomColor: "#303942", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 }, iconButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" }, headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 }, title: { color: palette.text, fontSize: 16, fontWeight: "800" }, subTitle: { color: palette.muted, fontSize: 10, marginTop: 2 }, content: { padding: 14, paddingBottom: 32, gap: 11 }, hero: { backgroundColor: "#202843", borderColor: "#465890", gap: 10 }, heroRow: { flexDirection: "row", gap: 12, alignItems: "center" }, heroTitle: { color: "#E8EDFF", fontSize: 14, fontWeight: "800" }, heroText: { color: "#C2CBE9", fontSize: 11, lineHeight: 16, marginTop: 3 }, pills: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }, sectionTitle: { color: palette.text, fontSize: 14, fontWeight: "800" }, sectionMeta: { color: "#8CBEE5", fontSize: 10, fontWeight: "700" }, refresh: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 }, refreshText: { color: "#8EC8F7", fontSize: 10, fontWeight: "800" }, statusCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#18232D", borderColor: "#355264" }, statusIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#203743", alignItems: "center", justifyContent: "center" }, statusTitle: { color: "#E2F2FD", fontSize: 13, fontWeight: "800" }, statusDetail: { color: "#B4C8D2", fontSize: 11, lineHeight: 16, marginTop: 3 }, installCard: { gap: 12, backgroundColor: "#19212C", borderColor: "#364657" }, step: { flexDirection: "row", gap: 10, alignItems: "flex-start" }, stepNo: { width: 23, height: 23, borderRadius: 12, backgroundColor: "#384B82", color: "#E9EEFF", textAlign: "center", lineHeight: 23, fontWeight: "800", fontSize: 11 }, stepTitle: { color: "#E2EDF4", fontSize: 12, fontWeight: "800" }, stepText: { color: "#B5C4D1", fontSize: 10, lineHeight: 15, marginTop: 2 }, notice: { color: "#FFDEA3", fontSize: 10, lineHeight: 15, backgroundColor: "#44371F", padding: 10, borderRadius: 9 }, buttons: { gap: 9 }, logCard: { backgroundColor: "#0F171C", borderColor: "#334B58" }, logText: { color: "#BFD4DF", fontFamily: "monospace", fontSize: 10, lineHeight: 15 }, safety: { backgroundColor: "#142A39", borderColor: "#2A5772", flexDirection: "row", gap: 10, alignItems: "flex-start" }, safetyTitle: { color: "#D9F0FF", fontSize: 12, fontWeight: "800" }, safetyText: { color: "#B9D1DF", fontSize: 10, lineHeight: 15, marginTop: 3 },
});
