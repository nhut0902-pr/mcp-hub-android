/**
 * MCP Hub Bot Runner — Telegram + Discord bot management
 *
 * v1.0.32: Complete rewrite with:
 * - Token validation (test connection before saving)
 * - Model/provider picker (choose AI Cloud or any Provider model)
 * - Clear background limitation notice
 * - Proper icon usage
 */
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppButton, Card, FormInput, StatusPill, palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { VideoScreenHeader } from "@/components/video-screen-header";
import { addBot, loadBots, removeBot, startBot, stopBot, updateBot, validateBotToken, type BotConfig, type BotPlatform } from "@/lib/mcp-hub/bot-runner";
import { startBackgroundBotService, stopBackgroundBotService } from "@/lib/mcp-hub/bot-background-service";

type ProviderOption = { id: string; name: string; modelId: string; kind: "ai-cloud" | "provider" };

export default function BotRunnerScreen() {
  const router = useRouter();
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [platform, setPlatform] = useState<BotPlatform>("telegram");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("Bạn là trợ lý AI thân thiện. Trả lời ngắn gọn, hữu ích.");
  const [selectedProvider, setSelectedProvider] = useState<string>("ai-cloud:gemini-1.5-flash");
  const [validating, setValidating] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    void loadBots().then(setBots);
  }, []);

  const refresh = async () => setBots(await loadBots());

  // Static provider options (no useHub needed)
  const providerOptions: ProviderOption[] = [
    { id: "ai-cloud:gemini-1.5-flash", name: "AI Cloud (Nhutbot 1.0 Flash)", modelId: "gemini-1.5-flash", kind: "ai-cloud" },
  ];

  const handleValidateToken = async () => {
    if (!token.trim()) {
      Alert.alert("Thiếu token", "Nhập bot token trước.");
      return;
    }
    setValidating(true);
    setTokenValid(null);
    try {
      const valid = await validateBotToken(platform, token.trim());
      setTokenValid(valid);
      if (valid) {
        Alert.alert("✓ Token hợp lệ", `${platform === "telegram" ? "Telegram" : "Discord"} bot token hoạt động.`);
      } else {
        Alert.alert("✗ Token không hợp lệ", "Kiểm tra lại token từ BotFather hoặc Discord Developer Portal.");
      }
    } catch (e) {
      setTokenValid(false);
      Alert.alert("Lỗi kiểm tra", e instanceof Error ? e.message : "Không thể kiểm tra token.");
    } finally {
      setValidating(false);
    }
  };

  const handleAdd = async () => {
    if (!name.trim() || !token.trim()) {
      Alert.alert("Thiếu thông tin", "Nhập tên bot và token.");
      return;
    }
    const [providerId, modelId] = selectedProvider.split(":");
    await addBot({
      platform,
      name: name.trim(),
      token: token.trim(),
      providerId,
      modelId,
      systemPrompt,
      autoReply: true,
    });
    setModalVisible(false);
    setName(""); setToken(""); setTokenValid(null);
    setSystemPrompt("Bạn là trợ lý AI thân thiện. Trả lời ngắn gọn, hữu ích.");
    await refresh();
  };

  const toggleRun = async (bot: BotConfig) => {
    if (bot.status === "running") {
      await stopBot(bot.id);
      const allBots = await loadBots();
      const stillRunning = allBots.some((b) => b.id !== bot.id && b.status === "running");
      if (!stillRunning) { await stopBackgroundBotService(); }
      await refresh();
    } else {
      await startBot(bot.id);
      const ok = await startBackgroundBotService();
      if (ok) {
        Alert.alert(
          "🤖 Bot đang chạy nền",
          "Đã khởi động Foreground Service.\n\nBạn sẽ thấy thông báo 'MCP Hub Bot đang chạy' trên thanh status bar.\n\nBot sẽ TIẾP TỤC hoạt động khi thoát app — Telegram polling mỗi 5 giây.\n\nNhắn tin cho bot trên Telegram để test!",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Lỗi", "Không thể khởi động foreground service. Kiểm tra quyền notification.");
        await stopBot(bot.id);
      }
      await refresh();
    }
  };

  const handleDelete = (bot: BotConfig) => {
    Alert.alert("Xoá bot", `Xoá ${bot.name}?`, [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: async () => { await removeBot(bot.id); await refresh(); } },
    ]);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <VideoScreenHeader title="Bot Runner" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={require("@/assets/images/icon-ai-chat.png")} style={styles.heroIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Telegram & Discord Bot</Text>
            <Text style={styles.heroDetail}>Kết nối AI Cloud hoặc Provider làm bộ não. Bot chạy khi app đang mở.</Text>
          </View>
        </View>

        <AppButton label="+ Tạo bot mới" icon="add-circle-outline" onPress={() => setModalVisible(true)} />

        {/* Bot list */}
        {bots.length > 0 ? bots.map((bot) => (
          <Card key={bot.id} style={styles.botCard}>
            <View style={styles.botHeader}>
              <View style={[styles.botIcon, { backgroundColor: bot.platform === "telegram" ? "#0088CC" : "#5865F2" }]}>
                <MaterialIcons name={bot.platform === "telegram" ? "send" : "forum"} size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.botName}>{bot.name}</Text>
                <Text style={styles.botModel}>
                  {bot.platform === "telegram" ? "Telegram" : "Discord"} · {bot.providerId === "ai-cloud" ? "Nhutbot 1.0 Flash" : bot.modelId}
                </Text>
              </View>
              <StatusPill label={bot.status === "running" ? "Đang chạy" : "Dừng"} tone={bot.status === "running" ? "success" : "neutral"} />
            </View>
            {bot.startedAt ? (
              <Text style={styles.botMeta}>
                Bắt đầu: {new Date(bot.startedAt).toLocaleString("vi-VN")} · {bot.messageCount} tin nhắn
              </Text>
            ) : null}
            {bot.lastError ? <Text style={styles.botError}>⚠ {bot.lastError}</Text> : null}
            <View style={styles.botActions}>
              <AppButton
                label={bot.status === "running" ? "Dừng" : "Khởi động"}
                icon={bot.status === "running" ? "stop" : "play-arrow"}
                variant={bot.status === "running" ? "danger" : "primary"}
                onPress={() => void toggleRun(bot)}
              />
              <AppButton label="Xoá" icon="delete-outline" variant="ghost" onPress={() => handleDelete(bot)} />
            </View>
          </Card>
        )) : (
          <Card>
            <View style={styles.empty}>
              <Image source={require("@/assets/images/icon-ai-chat.png")} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>Chưa có bot nào</Text>
              <Text style={styles.emptyDetail}>
                Tạo bot Telegram hoặc Discord, kết nối AI Cloud để bot tự động trả lời tin nhắn.
              </Text>
            </View>
          </Card>
        )}

        {/* Background limitation notice */}
        <View style={styles.notice}>
          <MaterialIcons name="info-outline" size={18} color={palette.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>Lưu ý về chạy nền</Text>
            <Text style={styles.noticeText}>
              Bot chạy nền qua Foreground Service — VẪN hoạt động khi thoát app.\n              Thông báo 'MCP Hub Bot đang chạy' sẽ hiện trên status bar.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Create Bot Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <ScreenContainer edges={["top", "bottom", "left", "right"]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setModalVisible(false)} style={styles.modalBack}>
              <MaterialIcons name="arrow-back-ios-new" size={18} color={palette.text} />
            </Pressable>
            <Text style={styles.modalTitle}>Tạo bot mới</Text>
            <Pressable onPress={() => void handleAdd()} style={styles.modalSave}>
              <Text style={styles.modalSaveText}>Tạo</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            {/* Platform selector */}
            <Text style={styles.fieldLabel}>Nền tảng</Text>
            <View style={styles.optionGrid}>
              <Pressable onPress={() => { setPlatform("telegram"); setTokenValid(null); }} style={[styles.option, platform === "telegram" && styles.optionActive]}>
                <MaterialIcons name="send" size={18} color={platform === "telegram" ? "#FFFFFF" : palette.textSecondary} />
                <Text style={[styles.optionText, platform === "telegram" && styles.optionTextActive]}>Telegram</Text>
              </Pressable>
              <Pressable onPress={() => { setPlatform("discord"); setTokenValid(null); }} style={[styles.option, platform === "discord" && styles.optionActive]}>
                <MaterialIcons name="forum" size={18} color={platform === "discord" ? "#FFFFFF" : palette.textSecondary} />
                <Text style={[styles.optionText, platform === "discord" && styles.optionTextActive]}>Discord</Text>
              </Pressable>
            </View>

            {/* Bot name */}
            <FormInput label="Tên bot" value={name} onChangeText={setName} placeholder="VD: NhutBot Assistant" />

            {/* Bot token */}
            <FormInput
              label="Bot Token"
              value={token}
              onChangeText={(v) => { setToken(v); setTokenValid(null); }}
              placeholder={platform === "telegram" ? "123456:ABC-DEF..." : "Bot token từ Discord Developer Portal"}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              hint={platform === "telegram" ? "Lấy từ @BotFather trên Telegram." : "Lấy từ Discord Developer Portal → Bot → Token."}
            />
            {/* Validate button */}
            <View style={styles.validateRow}>
              <AppButton
                label={validating ? "Đang kiểm tra..." : "Kiểm tra token"}
                icon="verified"
                variant="secondary"
                loading={validating}
                onPress={() => void handleValidateToken()}
              />
              {tokenValid === true && <MaterialIcons name="check-circle" size={24} color={palette.success} />}
              {tokenValid === false && <MaterialIcons name="cancel" size={24} color={palette.error} />}
            </View>

            {/* Model/Provider picker */}
            <Text style={styles.fieldLabel}>AI Model (bộ não cho bot)</Text>
            <View style={styles.providerList}>
              {providerOptions.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => setSelectedProvider(opt.id)}
                  style={[styles.providerRow, selectedProvider === opt.id && styles.providerRowActive]}
                >
                  <View style={styles.providerIcon}>
                    <MaterialIcons
                      name={opt.kind === "ai-cloud" ? "cloud" : "dns"}
                      size={18}
                      color={selectedProvider === opt.id ? "#FFFFFF" : palette.textSecondary}
                    />
                  </View>
                  <Text style={[styles.providerText, selectedProvider === opt.id && styles.providerTextActive]} numberOfLines={1}>
                    {opt.name}
                  </Text>
                  {selectedProvider === opt.id ? <MaterialIcons name="check" size={18} color="#FFFFFF" /> : null}
                </Pressable>
              ))}
            </View>

            {/* System prompt */}
            <FormInput
              label="System Prompt"
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              placeholder="VD: Bạn là trợ lý AI..."
              multiline
            />
          </ScrollView>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  hero: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  heroIcon: { width: 36, height: 36, resizeMode: "contain" },
  heroTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
  heroDetail: { color: palette.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
  botCard: { gap: 10 },
  botHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  botIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  botName: { color: palette.text, fontSize: 15, fontWeight: "700" },
  botModel: { color: palette.textSecondary, fontSize: 12, marginTop: 2 },
  botMeta: { color: palette.textMuted, fontSize: 12 },
  botError: { color: palette.error, fontSize: 12 },
  botActions: { flexDirection: "row", gap: 8 },
  empty: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyIcon: { width: 40, height: 40, resizeMode: "contain", marginBottom: 4 },
  emptyTitle: { color: palette.text, fontSize: 15, fontWeight: "700" },
  emptyDetail: { color: palette.textSecondary, fontSize: 13, lineHeight: 18, textAlign: "center", maxWidth: 280 },
  notice: { flexDirection: "row", gap: 8, alignItems: "flex-start", paddingHorizontal: 4, backgroundColor: "rgba(255,214,10,0.06)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,214,10,0.15)" },
  noticeTitle: { color: palette.warning, fontSize: 13, fontWeight: "700" },
  noticeText: { color: palette.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 2 },
  modalHeader: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  modalBack: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  modalTitle: { color: palette.text, fontSize: 16, fontWeight: "700" },
  modalSave: { paddingHorizontal: 14, height: 36, justifyContent: "center", borderRadius: 10, backgroundColor: palette.primary },
  modalSaveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  form: { padding: 16, gap: 14 },
  fieldLabel: { color: palette.textSecondary, fontSize: 13, fontWeight: "600" },
  optionGrid: { flexDirection: "row", gap: 8 },
  option: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border },
  optionActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  optionText: { color: palette.textSecondary, fontSize: 14, fontWeight: "600" },
  optionTextActive: { color: "#FFFFFF" },
  validateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  providerList: { gap: 6 },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border },
  providerRowActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  providerIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  providerText: { flex: 1, color: palette.textSecondary, fontSize: 14, fontWeight: "600" },
  providerTextActive: { color: "#FFFFFF" },
});
