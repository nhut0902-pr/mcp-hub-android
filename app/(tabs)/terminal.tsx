import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ProviderBrandMark } from "@/components/brand-mark";
import { AppButton, Card, palette, StatusPill } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { McpHubTerminalView } from "mcp-hub-runtime";
import { parseChatCompletion } from "@/lib/mcp-hub/chat";
import { sendAiCloudChatFromProxy } from "@/lib/mcp-hub/ai-cloud-client";
import { APP_VERSION } from "@/lib/mcp-hub/app-update";
import { getNativeRuntimeProbe, resolveMcpHubRuntime, type ClawLinkRuntimeStatus, type NativeRuntimeProbe } from "@/lib/mcp-hub/native-runtime";
import { classifyTerminalCommand, loadTerminalHistory, saveTerminalHistory, type TerminalCommandEntry } from "@/lib/mcp-hub/terminal-history";

const TERMUX_URL = "termux://";
const TERMUX_INSTALL_URL = "https://f-droid.org/packages/com.termux/";
const STARTER_COMMANDS = ["pwd", "ls -la", "id", "getprop ro.product.cpu.abi", "uname -a"];

export default function TerminalScreen() {
  const router = useRouter();
  const [nativeRuntime, setNativeRuntime] = useState(() => resolveMcpHubRuntime());
  const [runtimeProbe, setRuntimeProbe] = useState<NativeRuntimeProbe>(() => getNativeRuntimeProbe(nativeRuntime));
  const nativeTerminalAvailable = Platform.OS === "android" && Boolean(nativeRuntime);
  const [command, setCommand] = useState("");
  const [nativeCommand, setNativeCommand] = useState("");
  const [commandNonce, setCommandNonce] = useState(0);
  const [restartNonce, setRestartNonce] = useState(0);
  const [history, setHistory] = useState<TerminalCommandEntry[]>([]);
  const [terminalDetail, setTerminalDetail] = useState(nativeTerminalAvailable ? "Đang mở PTY nội bộ…" : "Chế độ tương thích đang sẵn sàng.");
  const [runtimeStatus, setRuntimeStatus] = useState<ClawLinkRuntimeStatus | null>(null);
  const [installingRuntime, setInstallingRuntime] = useState(false);
  const [codeRequest, setCodeRequest] = useState("");
  const [codeReply, setCodeReply] = useState("");
  const [askingCode, setAskingCode] = useState(false);

  useEffect(() => {
    void loadTerminalHistory().then(setHistory);
    // Retry once after the JS bundle has mounted. Standalone APKs resolve immediately; this
    // additionally protects development builds where Expo's native bridge starts late.
    const retry = setTimeout(() => {
      const runtime = resolveMcpHubRuntime();
      setNativeRuntime(runtime);
      setRuntimeProbe(getNativeRuntimeProbe(runtime));
    }, 0);
    return () => clearTimeout(retry);
  }, []);
  useEffect(() => {
    if (nativeTerminalAvailable && nativeRuntime) setRuntimeStatus(nativeRuntime.getRuntimeStatus());
  }, [nativeRuntime, nativeTerminalAvailable]);

  const appendHistory = async (entry: TerminalCommandEntry) => {
    const next = [...history, entry].slice(-60);
    setHistory(next);
    await saveTerminalHistory(next);
  };

  const installTerminalRuntime = async (repair = false) => {
    if (!nativeRuntime || installingRuntime) return;
    setInstallingRuntime(true);
    setTerminalDetail("Đang tải và kiểm tra Terminal bootstrap…");
    try {
      const status = repair ? await nativeRuntime.repairTerminalBootstrap() : await nativeRuntime.installTerminalBootstrap();
      setRuntimeStatus(status);
      setTerminalDetail(status.detail);
      if (status.state === "ready") {
        setRestartNonce((value) => value + 1);
        Alert.alert("Terminal đã sẵn sàng", "Đã kiểm tra pkg và curl trong runtime nội bộ. Bạn có thể dùng pkg install python, nodejs hoặc các gói hỗ trợ khác.");
      } else Alert.alert("Không thể cài runtime", status.detail);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "lỗi không xác định";
      setTerminalDetail(detail);
      Alert.alert("Không thể cài runtime", detail);
    } finally { setInstallingRuntime(false); }
  };

  const runCommand = async () => {
    const cleaned = command.trim();
    if (!cleaned) { Alert.alert("Chưa có lệnh", "Nhập một lệnh để chạy trong Terminal."); return; }
    if (nativeTerminalAvailable && /^(pkg|apt|dpkg|curl|wget)\b/i.test(cleaned) && (runtimeStatus?.state !== "ready" || !runtimeStatus.packageToolsReady)) {
      Alert.alert("Cần sửa runtime Terminal", "Lệnh package/tải tệp cần pkg và curl đã được kiểm tra. Hãy bấm “Cài/Sửa môi trường Terminal” trước, rồi chạy lại lệnh này.");
      return;
    }
    const risk = classifyTerminalCommand(cleaned);
    const entry: TerminalCommandEntry = {
      id: `terminal-${Date.now()}`,
      command: cleaned,
      status: nativeTerminalAvailable ? "opened" : "prepared",
      detail: nativeTerminalAvailable ? "Đã gửi trực tiếp vào phiên PTY Terminal nội bộ." : "Lệnh đã sao chép; chế độ PTY native chỉ có trong APK Android đã build.",
      createdAt: new Date().toISOString(),
      risk,
    };
    if (nativeTerminalAvailable) {
      setNativeCommand(cleaned);
      setCommandNonce((value) => value + 1);
      setCommand("");
      await appendHistory(entry);
      return;
    }
    try {
      await Clipboard.setStringAsync(cleaned);
      if (Platform.OS === "web") throw new Error("Cần APK Android native.");
      await Linking.openURL(TERMUX_URL);
      entry.status = "opened";
      entry.detail = "Đã sao chép lệnh và mở ứng dụng Terminal bên ngoài để tương thích tạm thời.";
      setCommand("");
    } catch {
      entry.status = "error";
      entry.detail = "Native runtime chưa khả dụng trong bản đang chạy. Lệnh đã được sao chép để bạn có thể dùng môi trường Terminal khác.";
      Alert.alert("Cần bản Android native", "MCP Hub đang chạy ở chế độ tương thích. Lệnh đã được sao chép; bạn có thể mở Terminal bên ngoài hoặc chờ APK có native runtime.", [{ text: "Đóng", style: "cancel" }, { text: "Mở trang Terminal", onPress: () => void Linking.openURL(TERMUX_INSTALL_URL) }]);
    }
    await appendHistory(entry);
  };

  const askCodeAssistant = async () => {
    const question = codeRequest.trim();
    if (!question || askingCode) return;
    setAskingCode(true);
    setCodeReply("");
    try {
      const response = await sendAiCloudChatFromProxy({ model: "gemini-1.5-flash", temperature: 0.2, max_tokens: 1600, messages: [{ role: "system", content: "Bạn là Nhutbot Code Assistant trong Terminal Android. Trả lời tiếng Việt, an toàn, ngắn gọn. Không hướng dẫn lệnh phá huỷ, vượt quyền hoặc tải-rồi-chạy mã không kiểm tra. Khi có lệnh Terminal, cho biết điều kiện và giải thích trước khi chạy." }, { role: "user", content: question }] });
      setCodeReply(parseChatCompletion(response).content || "Trợ lý mã chưa trả về nội dung.");
    } catch (error) { setCodeReply(`Không thể gọi Code Assistant: ${error instanceof Error ? error.message : "lỗi không xác định"}`); }
    finally { setAskingCode(false); }
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.screen}>
    <View style={styles.header}><Pressable onPress={() => router.replace("/chat" as never)} style={styles.iconButton}><MaterialIcons name="arrow-back-ios-new" size={19} color={palette.text} /></Pressable><View style={styles.headerTitle}><View style={styles.headerLogo}><MaterialIcons name="terminal" color="#FFFFFF" size={17} /></View><View><Text style={styles.title}>Terminal</Text><Text style={styles.version}>MCP Hub · V{APP_VERSION}</Text></View></View><Pressable onPress={() => router.push("/clawlink" as never)} style={styles.iconButton}><MaterialIcons name="dns" size={22} color="#79BFFF" /></Pressable></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Card style={styles.hero}><View style={styles.heroRow}><View style={styles.heroIcon}><MaterialIcons name="terminal" color="#73D6AA" size={23} /></View><View style={{ flex: 1 }}><Text style={styles.heroTitle}>{nativeTerminalAvailable ? "Terminal nội bộ" : "Terminal compatibility"}</Text><Text style={styles.heroDetail}>{nativeTerminalAvailable ? "PTY đang chạy trong APK MCP Hub với shell Android và thư mục riêng của ứng dụng. Nhập lệnh trực tiếp bên dưới." : runtimeProbe.executionEnvironment === "storeClient" ? "Bạn đang mở bằng Expo Go nên không thể nạp Terminal PTY tùy chỉnh. Hãy cài APK MCP Hub để dùng Terminal nội bộ." : "Bridge Terminal Android chưa sẵn sàng trong phiên này. Bản APK cài đặt có registry native; dùng thông tin chẩn đoán bên dưới nếu trạng thái này còn xuất hiện."}</Text></View></View><View style={styles.chips}><StatusPill label={nativeTerminalAvailable ? "Android PTY" : runtimeProbe.executionEnvironment === "storeClient" ? "Expo Go" : "Bridge chưa sẵn sàng"} tone={nativeTerminalAvailable ? "success" : "neutral"} /><StatusPill label="Nhật ký cục bộ" tone="neutral" /></View>{!nativeTerminalAvailable ? <Text selectable style={styles.heroDetail}>Nền tảng: {runtimeProbe.platform} · Môi trường: {runtimeProbe.executionEnvironment} · Bridge: {runtimeProbe.bridgeAvailable ? "có" : "chưa có"}</Text> : null}</Card>
      {nativeTerminalAvailable && (runtimeStatus?.state !== "ready" || !runtimeStatus.packageToolsReady) ? <Card style={styles.clawCard}><View style={styles.heroRow}><View style={styles.heroIcon}><MaterialIcons name="download-for-offline" color="#80C8FF" size={22} /></View><View style={{ flex: 1 }}><Text style={styles.clawTitle}>{runtimeStatus?.state === "ready" ? "Sửa môi trường Terminal" : "Cài môi trường Terminal"}</Text><Text style={styles.clawDetail}>{runtimeStatus?.state === "ready" ? "Runtime cũ thiếu hoặc không nhận được công cụ package. Ứng dụng sẽ cài lại bootstrap, kiểm tra `pkg`, `curl` và shim Termux trước khi cho phép cài thư viện." : "Terminal hiện là shell Android tối thiểu nên chưa có `pkg`. Tải bootstrap arm64 đã kiểm tra SHA-256 để dùng apt/pkg và cài thư viện trong thư mục riêng của MCP Hub."}</Text></View></View><AppButton label={installingRuntime ? "Đang kiểm tra môi trường…" : runtimeStatus?.state === "ready" ? "Sửa công cụ package" : "Cài môi trường Terminal"} icon="download" loading={installingRuntime} disabled={installingRuntime} onPress={() => void installTerminalRuntime(runtimeStatus?.state === "ready")} /></Card> : null}
      {nativeTerminalAvailable ? <View style={styles.nativeShell}><View style={styles.nativeShellHead}><MaterialIcons name="terminal" color="#73D6AA" size={16} /><Text style={styles.nativeShellTitle}>Phiên terminal nội bộ</Text><Text numberOfLines={1} style={styles.nativeShellState}>{terminalDetail}</Text></View><McpHubTerminalView style={styles.nativeTerminal} command={nativeCommand} commandNonce={commandNonce} restartNonce={restartNonce} fontSize={14} onSessionState={(event) => setTerminalDetail(event.nativeEvent.detail)} /></View> : null}
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Lệnh</Text><Text style={styles.sectionMeta}>{nativeTerminalAvailable ? "Chạy trong MCP Hub" : "Sao chép tương thích"}</Text></View>
      <View style={styles.commandPanel}><Text style={styles.prompt}>$</Text><TextInput value={command} onChangeText={setCommand} style={styles.commandInput} placeholder="Ví dụ: ls -la" placeholderTextColor="#77838D" multiline autoCapitalize="none" autoCorrect={false} /></View>
      <View style={styles.presetRow}>{STARTER_COMMANDS.map((item) => <Pressable key={item} onPress={() => setCommand(item)} style={styles.preset}><Text style={styles.presetText}>{item}</Text></Pressable>)}</View>
      {classifyTerminalCommand(command) === "caution" && command.trim() ? <View style={styles.risk}><MaterialIcons name="warning-amber" color="#FFD272" size={18} /><Text style={styles.riskText}>Lệnh này có thể thay đổi hoặc xoá dữ liệu. Bạn tự chịu trách nhiệm kiểm tra lệnh trước khi gửi vào terminal.</Text></View> : null}
      <AppButton label={nativeTerminalAvailable ? "Chạy trong Terminal" : "Sao chép lệnh"} icon={nativeTerminalAvailable ? "play-arrow" : "content-copy"} onPress={() => void runCommand()} />
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Code Assistant</Text><Text style={styles.sectionMeta}>Nhutbot</Text></View>
      <Card style={styles.assistant}><Text style={styles.assistantHint}>Dán lỗi, mô tả tác vụ hoặc lệnh cần giải thích. Trợ lý sẽ soạn mã và gợi ý lệnh an toàn.</Text><TextInput value={codeRequest} onChangeText={setCodeRequest} style={styles.assistantInput} placeholder="Ví dụ: Giải thích lỗi npm install và cách sửa trên Terminal" placeholderTextColor="#8A99A7" multiline textAlignVertical="top" autoCorrect={false} /><AppButton label={askingCode ? "Đang phân tích…" : "Hỏi trợ lý mã"} icon="smart-toy" loading={askingCode} disabled={!codeRequest.trim()} onPress={() => void askCodeAssistant()} />{codeReply ? <View style={styles.reply}><View style={styles.replyHead}><MaterialIcons name="auto-awesome" size={16} color="#80C8FF" /><Text style={styles.replyTitle}>Phản hồi Code Assistant</Text><Pressable onPress={() => void Clipboard.setStringAsync(codeReply)} hitSlop={10}><MaterialIcons name="content-copy" size={17} color="#B9CAD8" /></Pressable></View><Text selectable style={styles.replyText}>{codeReply}</Text></View> : null}</Card>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>ClawLink Gateway</Text><Text style={styles.sectionMeta}>Trên thiết bị</Text></View>
      <Card style={styles.clawCard}><View style={styles.heroRow}><ProviderBrandMark name="ClawLink Gateway" kind="openclaw" size={43} /><View style={{ flex: 1 }}><Text style={styles.clawTitle}>Gateway cục bộ</Text><Text style={styles.clawDetail}>Màn ClawLink quản lý runtime, trạng thái và dịch vụ nền trong MCP Hub. Cấu hình endpoint/API provider hiện có vẫn được giữ nguyên.</Text></View></View><AppButton label="Mở ClawLink" icon="dns" variant="secondary" onPress={() => router.push("/clawlink" as never)} /></Card>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Nhật ký Terminal</Text><Pressable onPress={() => { setHistory([]); void saveTerminalHistory([]); }}><Text style={styles.clear}>Xoá</Text></Pressable></View>
      {history.length ? <View style={styles.logBox}>{history.slice().reverse().map((entry) => <View key={entry.id} style={styles.logEntry}><View style={styles.logLine}><Text style={styles.logCommand}>$ {entry.command}</Text><MaterialIcons name={entry.status === "opened" ? "check-circle" : entry.status === "error" ? "error-outline" : "schedule"} size={16} color={entry.status === "opened" ? "#73D6AA" : entry.status === "error" ? "#FF9494" : "#FFD272"} /></View><Text style={[styles.logDetail, entry.status === "error" && styles.logError]}>{entry.detail}</Text></View>)}</View> : <Card style={styles.empty}><MaterialIcons name="history" size={26} color="#5A8EB5" /><Text style={styles.emptyTitle}>Chưa có lệnh</Text><Text style={styles.emptyDetail}>Những lệnh bạn gửi sẽ được lưu cục bộ tại đây cùng trạng thái thực thi.</Text></Card>}
    </ScrollView>
  </View></ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background }, header: { height: 60, borderBottomWidth: 1, borderBottomColor: "#303942", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 }, iconButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" }, headerTitle: { flex: 1, flexDirection: "row", gap: 9, alignItems: "center" }, headerLogo: { width: 31, height: 31, borderRadius: 9, backgroundColor: "#23734F", alignItems: "center", justifyContent: "center" }, title: { color: palette.text, fontSize: 16, fontWeight: "800" }, version: { color: palette.muted, fontSize: 10, marginTop: 1 }, content: { padding: 14, paddingBottom: 32, gap: 11 }, hero: { backgroundColor: "#152B2B", borderColor: "#2B6156", gap: 9 }, heroRow: { flexDirection: "row", gap: 11, alignItems: "center" }, heroIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: "#183A35", alignItems: "center", justifyContent: "center" }, heroTitle: { color: "#E8FFF5", fontSize: 14, fontWeight: "800" }, heroDetail: { color: "#B5D0C3", fontSize: 11, lineHeight: 16, marginTop: 3 }, chips: { flexDirection: "row", gap: 7 }, nativeShell: { borderRadius: 13, overflow: "hidden", borderWidth: 1, borderColor: "#2B6156", backgroundColor: "#0C1219" }, nativeShellHead: { paddingHorizontal: 11, paddingVertical: 8, flexDirection: "row", gap: 7, alignItems: "center", backgroundColor: "#152B2B" }, nativeShellTitle: { color: "#E8FFF5", fontSize: 11, fontWeight: "800" }, nativeShellState: { color: "#9FC8B7", fontSize: 9, flex: 1, textAlign: "right" }, nativeTerminal: { height: 284 }, sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }, sectionTitle: { color: palette.text, fontSize: 14, fontWeight: "800" }, sectionMeta: { color: "#8CBEE5", fontSize: 10, fontWeight: "700" }, commandPanel: { minHeight: 82, flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 12, paddingVertical: 11, borderRadius: 13, borderWidth: 1, borderColor: "#355463", backgroundColor: "#0F171C" }, prompt: { color: "#76DEB0", fontFamily: "monospace", fontSize: 15, marginRight: 9, lineHeight: 21 }, commandInput: { flex: 1, color: "#E7F1F4", fontFamily: "monospace", fontSize: 13, lineHeight: 20, minHeight: 50, textAlignVertical: "top" }, presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, preset: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: "#273741", borderWidth: 1, borderColor: "#3E5664" }, presetText: { color: "#BEE0F3", fontSize: 10, fontFamily: "monospace" }, risk: { padding: 10, borderRadius: 10, backgroundColor: "#48391F", flexDirection: "row", gap: 8, alignItems: "flex-start" }, riskText: { flex: 1, color: "#FFE2A5", fontSize: 11, lineHeight: 16 }, assistant: { gap: 10, backgroundColor: "#202D38", borderColor: "#38556A" }, assistantHint: { color: "#B5CAD9", fontSize: 11, lineHeight: 16 }, assistantInput: { minHeight: 86, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#486171", backgroundColor: "#16212A", color: palette.text, fontSize: 12, lineHeight: 18 }, reply: { borderRadius: 10, padding: 10, backgroundColor: "#141C23", gap: 7 }, replyHead: { flexDirection: "row", alignItems: "center", gap: 6 }, replyTitle: { color: "#B6DEFB", fontSize: 11, fontWeight: "800", flex: 1 }, replyText: { color: "#D4DEE6", fontFamily: "monospace", fontSize: 11, lineHeight: 17 }, clawCard: { backgroundColor: "#202843", borderColor: "#465890", gap: 11 }, clawTitle: { color: "#E4EAFF", fontSize: 14, fontWeight: "800" }, clawDetail: { color: "#C0C9E9", fontSize: 11, lineHeight: 16, marginTop: 3 }, clear: { color: "#8EC8F7", fontSize: 11, fontWeight: "800", padding: 4 }, logBox: { borderRadius: 13, overflow: "hidden", borderWidth: 1, borderColor: "#344850", backgroundColor: "#11191E" }, logEntry: { padding: 11, borderBottomWidth: 1, borderBottomColor: "#273941", gap: 5 }, logLine: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }, logCommand: { color: "#C4E7F5", fontSize: 11, fontFamily: "monospace", flex: 1 }, logDetail: { color: "#B4C8D2", fontSize: 10, lineHeight: 15 }, logError: { color: "#FFB5B5" }, empty: { alignItems: "center", paddingVertical: 26, gap: 6, backgroundColor: "#232323" }, emptyTitle: { color: palette.text, fontWeight: "800", fontSize: 13 }, emptyDetail: { color: palette.muted, fontSize: 11, lineHeight: 16, textAlign: "center", maxWidth: 270 },
});
