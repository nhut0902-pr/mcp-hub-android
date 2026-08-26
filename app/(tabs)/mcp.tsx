import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { AppButton, Card, EmptyState, FormInput, palette, SectionTitle, StatusPill } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { mcpCredentialHint } from "@/lib/mcp-hub/mcp-auth";
import { useHub } from "@/lib/mcp-hub/context";
import { McpAuthMode, McpServerConfig, McpTransport, mcpAuthLabel, mcpTransportLabel } from "@/lib/mcp-hub/types";

const transports: McpTransport[] = ["streamable-http", "sse", "stdio"];
const authModes: McpAuthMode[] = ["none", "api-key", "oauth"];

export default function McpScreen() {
  const router = useRouter();
  const { state, saveMcpServer, removeMcpServer, toggleMcpServer } = useHub();
  const [editing, setEditing] = useState<McpServerConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<McpTransport>("streamable-http");
  const [endpoint, setEndpoint] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [authMode, setAuthMode] = useState<McpAuthMode>("none");
  const [apiKey, setApiKey] = useState("");
  const [oauthToken, setOauthToken] = useState("");
  const [oauthIssuer, setOauthIssuer] = useState("");
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthScopes, setOauthScopes] = useState("");

  const openForm = (server?: McpServerConfig) => {
    setEditing(server ?? null);
    setName(server?.name ?? ""); setTransport(server?.transport ?? "streamable-http");
    setEndpoint(server?.endpoint ?? ""); setCommand(server?.command ?? ""); setArgs(server?.args ?? "");
    setAuthMode(server?.authMode ?? "none"); setApiKey(""); setOauthToken("");
    setOauthIssuer(server?.oauthIssuer ?? ""); setOauthClientId(server?.oauthClientId ?? ""); setOauthScopes(server?.oauthScopes ?? "");
    setVisible(true);
  };
  const save = async () => {
    if (!name.trim()) return Alert.alert("Thiếu thông tin", "Tên server MCP là bắt buộc.");
    if (transport === "stdio" ? !command.trim() : !endpoint.trim()) return Alert.alert("Thiếu thông tin", transport === "stdio" ? "Nhập command để lưu profile stdio." : "Nhập URL endpoint của MCP server.");
    if (authMode === "oauth" && !oauthToken.trim() && !editing?.oauthTokenStored) return Alert.alert("Cần OAuth access token", "Dán access token OAuth để dùng xác thực OAuth với URL MCP này.");
    const server: McpServerConfig = { id: editing?.id ?? `mcp-${Date.now()}`, name: name.trim(), transport, endpoint: endpoint.trim(), command: command.trim(), args: args.trim(), authMode: transport === "stdio" ? "none" : authMode, apiKeyStored: editing?.apiKeyStored ?? false, oauthTokenStored: editing?.oauthTokenStored ?? false, oauthIssuer: oauthIssuer.trim(), oauthClientId: oauthClientId.trim(), oauthScopes: oauthScopes.trim(), enabled: editing?.enabled ?? true, updatedAt: new Date().toISOString() };
    await saveMcpServer(server, apiKey, oauthToken);
    setVisible(false);
  };
  const confirmDelete = (server: McpServerConfig) => Alert.alert("Xoá server MCP", `Xoá cấu hình ${server.name}?`, [{ text: "Huỷ", style: "cancel" }, { text: "Xoá", style: "destructive", onPress: () => void removeMcpServer(server.id) }]);

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <View style={styles.appHeader}>
      <Pressable testID="mcp-back" onPress={() => router.replace("/chat")} style={styles.backButton}><MaterialIcons name="arrow-back-ios-new" size={18} color={palette.text} /></Pressable>
      <Text style={styles.appTitle}>MCP Servers</Text>
      <View style={styles.headerSpacer} pointerEvents="none" />
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={styles.title}>MCP server</Text><Text style={styles.subtitle}>Profile URL kèm API key hoặc OAuth khi cần.</Text></View><Pressable onPress={() => openForm()} style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.72 : 1 }]}><MaterialIcons name="add-link" size={20} color="#FFFFFF" /></Pressable></View>
      <View style={styles.note}><MaterialIcons name="info-outline" size={17} color={palette.navy} /><Text style={styles.noteText}>Với HTTP/SSE, chọn cách xác thực ngay dưới URL. Secret chỉ lưu trên thiết bị; ứng dụng lưu profile, không tự chạy MCP server.</Text></View>
      <SectionTitle title="Profile MCP" action={<Text style={styles.count}>{state.mcpServers.length} server</Text>} />
      {state.mcpServers.length ? state.mcpServers.map((server) => <Card key={server.id} style={styles.serverCard}><View style={styles.serverTop}><Pressable onPress={() => openForm(server)} style={styles.serverCopy}><View style={styles.icon}><MaterialIcons name={server.transport === "stdio" ? "terminal" : "lan"} color={palette.navy} size={18} /></View><View style={styles.serverText}><Text style={styles.serverName}>{server.name}</Text><Text style={styles.serverEndpoint} numberOfLines={1}>{server.transport === "stdio" ? server.command : server.endpoint}</Text></View></Pressable><Switch value={server.enabled} onValueChange={(value) => void toggleMcpServer(server.id, value)} trackColor={{ false: "#6B6B6B", true: "#2996F3" }} thumbColor="#F8FAFC" /></View><View style={styles.serverMeta}><StatusPill label={mcpTransportLabel[server.transport]} tone="neutral" /><StatusPill label={mcpAuthLabel[server.authMode ?? "none"]} tone={server.authMode === "none" ? "neutral" : "success"} /></View><View style={styles.actions}><AppButton label="Sửa" icon="edit" variant="secondary" onPress={() => openForm(server)} /><AppButton label="Xoá" icon="delete-outline" variant="danger" onPress={() => confirmDelete(server)} /></View></Card>) : <Card><EmptyState icon="hub" title="Chưa có MCP server" detail="Thêm profile HTTP, SSE hoặc stdio để giữ cấu hình kết nối của bạn." /></Card>}
    </ScrollView>
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}><ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.modalHeader}><Pressable testID="mcp-form-back" onPress={() => setVisible(false)} style={styles.modalBack}><MaterialIcons name="arrow-back-ios-new" size={18} color={palette.text} /></Pressable><Text style={styles.modalTitle}>{editing ? "Sửa MCP server" : "MCP server mới"}</Text><Pressable onPress={() => void save()} style={styles.modalSave}><Text style={styles.save}>Lưu</Text></Pressable></View><ScrollView contentContainerStyle={styles.form}><FormInput label="Tên server" value={name} onChangeText={setName} placeholder="Ví dụ: Filesystem team" /><Text style={styles.fieldLabel}>Transport</Text><View style={styles.optionGrid}>{transports.map((option) => <Pressable key={option} onPress={() => setTransport(option)} style={({ pressed }) => [styles.option, transport === option && styles.optionActive, { opacity: pressed ? 0.75 : 1 }]}><Text style={[styles.optionText, transport === option && styles.optionTextActive]}>{mcpTransportLabel[option]}</Text></Pressable>)}</View>{transport === "stdio" ? <><FormInput label="Command" value={command} onChangeText={setCommand} placeholder="npx hoặc node" autoCapitalize="none" /><FormInput label="Arguments" value={args} onChangeText={setArgs} placeholder="-y @modelcontextprotocol/server-filesystem /path" multiline autoCapitalize="none" /></> : <><FormInput label="Endpoint URL" value={endpoint} onChangeText={setEndpoint} placeholder="https://mcp.example.com/mcp" keyboardType="url" autoCapitalize="none" autoCorrect={false} hint={transport === "sse" ? "Nhập URL stream SSE của server." : "Nhập endpoint Streamable HTTP của server."} /><Text style={styles.fieldLabel}>Xác thực cho URL MCP</Text><View style={styles.optionGrid}>{authModes.map((option) => <Pressable key={option} onPress={() => setAuthMode(option)} style={({ pressed }) => [styles.option, authMode === option && styles.optionActive, { opacity: pressed ? 0.75 : 1 }]}><Text style={[styles.optionText, authMode === option && styles.optionTextActive]}>{mcpAuthLabel[option]}</Text></Pressable>)}</View><View style={styles.authHint}><MaterialIcons name="security" size={16} color={palette.navy} /><Text style={styles.authHintText}>{mcpCredentialHint(authMode)}</Text></View>{authMode === "api-key" ? <FormInput label="API key" value={apiKey} onChangeText={setApiKey} placeholder={editing?.apiKeyStored ? "Đã lưu an toàn — nhập để thay thế" : "Dán API key"} secureTextEntry autoCapitalize="none" autoCorrect={false} hint="API key được lưu trong kho bảo mật của thiết bị." /> : null}{authMode === "oauth" ? <><FormInput label="OAuth issuer / authorization URL" value={oauthIssuer} onChangeText={setOauthIssuer} placeholder="https://auth.example.com" keyboardType="url" autoCapitalize="none" autoCorrect={false} hint="Lưu nguồn cấp quyền để nhận diện profile OAuth." /><FormInput label="OAuth client ID" value={oauthClientId} onChangeText={setOauthClientId} placeholder="mcp-mobile-client" autoCapitalize="none" autoCorrect={false} /><FormInput label="OAuth scopes" value={oauthScopes} onChangeText={setOauthScopes} placeholder="mcp.read mcp.write" autoCapitalize="none" autoCorrect={false} /><FormInput label="OAuth access token" value={oauthToken} onChangeText={setOauthToken} placeholder={editing?.oauthTokenStored ? "Đã lưu an toàn — nhập để thay thế" : "Dán access token OAuth"} secureTextEntry autoCapitalize="none" autoCorrect={false} hint="Access token được lưu an toàn và gửi bằng Bearer token khi môi trường sử dụng profile này." /></> : null}</>}</ScrollView></ScreenContainer></Modal>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  appHeader: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderColor: "#303030" }, appTitle: { color: palette.text, fontSize: 16, fontWeight: "800" }, backButton: { position: "absolute", left: 13, width: 40, height: 40, alignItems: "center", justifyContent: "center" }, headerSpacer: { width: 40, height: 40, position: "absolute", right: 13 },
  content: { padding: 14, paddingBottom: 28, gap: 9 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4, color: palette.text }, subtitle: { color: palette.muted, fontSize: 11, marginTop: 3 }, addButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" }, note: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, backgroundColor: "#2C2C2C", padding: 10, marginTop: 4 }, noteText: { flex: 1, color: "#B8D9F2", fontSize: 10, lineHeight: 15 }, count: { color: palette.muted, fontSize: 10, fontWeight: "700" }, serverCard: { gap: 10 }, serverTop: { flexDirection: "row", alignItems: "center", gap: 9 }, serverCopy: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 }, icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: palette.softNavy, alignItems: "center", justifyContent: "center" }, serverText: { flex: 1, gap: 1 }, serverName: { color: palette.text, fontSize: 14, fontWeight: "800" }, serverEndpoint: { color: palette.muted, fontSize: 10 }, serverMeta: { flexDirection: "row", alignItems: "center", gap: 7 }, actions: { flexDirection: "row", gap: 8 }, modalHeader: { minHeight: 54, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: palette.border }, modalBack: { position: "absolute", left: 10, width: 38, height: 38, alignItems: "center", justifyContent: "center" }, modalSave: { position: "absolute", right: 14, minWidth: 38, height: 38, alignItems: "center", justifyContent: "center" }, modalTitle: { color: palette.text, fontSize: 15, fontWeight: "800" }, save: { color: palette.navy, fontSize: 13, fontWeight: "800" }, form: { padding: 15, gap: 13 }, fieldLabel: { fontSize: 11, color: palette.text, fontWeight: "700", marginBottom: -7 }, optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, option: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: palette.border }, optionActive: { backgroundColor: palette.softNavy, borderColor: palette.navy }, optionText: { color: palette.muted, fontSize: 11, fontWeight: "700" }, optionTextActive: { color: "#83C6FF" }, authHint: { flexDirection: "row", gap: 7, alignItems: "flex-start", padding: 10, borderRadius: 10, backgroundColor: palette.softCyan }, authHintText: { flex: 1, color: "#BFE1FF", fontSize: 10, lineHeight: 15 },
});
