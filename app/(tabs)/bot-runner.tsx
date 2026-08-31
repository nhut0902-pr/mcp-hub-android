import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { AppButton, Card, FormInput, StatusPill, palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { VideoScreenHeader } from "@/components/video-screen-header";
import { addBot, loadBots, removeBot, startBot, stopBot, updateBot, type BotConfig, type BotPlatform } from "@/lib/mcp-hub/bot-runner";

export default function BotRunnerScreen() {
  const router = useRouter();
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [platform, setPlatform] = useState<BotPlatform>("telegram");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("Bạn là trợ lý AI thân thiện. Trả lời ngắn gọn, hữu ích.");

  useEffect(() => {
    void loadBots().then(setBots);
  }, []);

  const refresh = async () => setBots(await loadBots());

  const handleAdd = async () => {
    if (!name.trim() || !token.trim()) {
      Alert.alert("Thiếu thông tin", "Nhập tên bot và token.");
      return;
    }
    await addBot({
      platform,
      name: name.trim(),
      token: token.trim(),
      providerId: "ai-cloud",
      modelId: "gemini-1.5-flash",
      systemPrompt,
      autoReply: true,
    });
    setModalVisible(false);
    setName(""); setToken(""); setSystemPrompt("Bạn là trợ lý AI thân thiện. Trả lời ngắn gọn, hữu ích.");
    await refresh();
  };

  const toggleRun = async (bot: BotConfig) => {
    if (bot.status === "running") {
      await stopBot(bot.id);
    } else {
      await startBot(bot.id);
    }
    await refresh();
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
        <View style={styles.hero}>
          <MaterialIcons name="smart-toy" size={28} color={palette.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Telegram & Discord Bot</Text>
            <Text style={styles.heroDetail}>Chạy bot nền, kết nối AI Cloud hoặc Provider model làm bộ não.</Text>
          </View>
        </View>

        <AppButton label="+ Tạo bot mới" icon="add-circle-outline" onPress={() => setModalVisible(true)} />

        {bots.length > 0 ? bots.map((bot) => (
          <Card key={bot.id} style={styles.botCard}>
            <View style={styles.botHeader}>
              <View style={[styles.botIcon, { backgroundColor: bot.platform === "telegram" ? "#0088CC" : "#5865F2" }]}>
                <MaterialIcons name={bot.platform === "telegram" ? "send" : "forum"} size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.botName}>{bot.name}</Text>
                <Text style={styles.botModel}>{bot.platform === "telegram" ? "Telegram" : "Discord"} · {bot.modelId}</Text>
              </View>
              <StatusPill label={bot.status === "running" ? "Đang chạy" : "Dừng"} tone={bot.status === "running" ? "success" : "neutral"} />
            </View>
            {bot.startedAt ? <Text style={styles.botMeta}>Bắt đầu: {new Date(bot.startedAt).toLocaleString("vi-VN")} · {bot.messageCount} tin nhắn</Text> : null}
            {bot.lastError ? <Text style={styles.botError}>⚠ {bot.lastError}</Text> : null}
            <View style={styles.botActions}>
              <AppButton
                label={bot.status === "running" ? "Dừng" : "Khởi động"}
                icon={bot.status === "running" ? "stop" : "play-arrow"}
                variant={bot.status === "running" ? "danger" : "primary"}
                onPress={() => void toggleRun(bot)}
              />
              <AppButton label="Sửa" icon="edit" variant="secondary" onPress={() => Alert.alert("Sắp có", "Tính năng sửa bot đang được phát triển.")} />
              <AppButton label="Xoá" icon="delete-outline" variant="ghost" onPress={() => handleDelete(bot)} />
            </View>
          </Card>
        )) : (
          <Card>
            <View style={styles.empty}>
              <MaterialIcons name="bot" size={32} color={palette.primary} />
              <Text style={styles.emptyTitle}>Chưa có bot nào</Text>
              <Text style={styles.emptyDetail}>Tạo bot Telegram hoặc Discord, kết nối với AI Cloud để bot tự động trả lời tin nhắn.</Text>
            </View>
          </Card>
        )}

        <View style={styles.note}>
          <MaterialIcons name="info-outline" size={18} color={palette.primary} />
          <Text style={styles.noteText}>
            Bot chạy trong nền sử dụng AI Cloud (Nhutbot 1.0 Flash) hoặc Provider model bạn đã cấu hình.
            Token bot được lưu an toàn trong SecureStore.
          </Text>
        </View>
      </ScrollView>

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
          <ScrollView contentContainerStyle={styles.form}>
            <Text style={styles.fieldLabel}>Nền tảng</Text>
            <View style={styles.optionGrid}>
              <Pressable onPress={() => setPlatform("telegram")} style={[styles.option, platform === "telegram" && styles.optionActive]}>
                <MaterialIcons name="send" size={18} color={platform === "telegram" ? "#FFFFFF" : palette.textSecondary} />
                <Text style={[styles.optionText, platform === "telegram" && styles.optionTextActive]}>Telegram</Text>
              </Pressable>
              <Pressable onPress={() => setPlatform("discord")} style={[styles.option, platform === "discord" && styles.optionActive]}>
                <MaterialIcons name="forum" size={18} color={platform === "discord" ? "#FFFFFF" : palette.textSecondary} />
                <Text style={[styles.optionText, platform === "discord" && styles.optionTextActive]}>Discord</Text>
              </Pressable>
            </View>
            <FormInput label="Tên bot" value={name} onChangeText={setName} placeholder="VD: NhutBot Assistant" />
            <FormInput label="Bot Token" value={token} onChangeText={setToken} placeholder={platform === "telegram" ? "123456:ABC-DEF..." : "Bot token từ Discord Developer Portal"} secureTextEntry autoCapitalize="none" autoCorrect={false} hint={platform === "telegram" ? "Lấy từ @BotFather trên Telegram." : "Lấy từ Discord Developer Portal → Bot → Token."} />
            <FormInput label="System Prompt" value={systemPrompt} onChangeText={setSystemPrompt} placeholder="VD: Bạn là trợ lý AI..." multiline />
            <View style={styles.modelInfo}>
              <MaterialIcons name="cloud" size={18} color={palette.primary} />
              <Text style={styles.modelInfoText}>Model: Nhutbot 1.0 Flash (AI Cloud)</Text>
            </View>
          </ScrollView>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  hero: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
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
  emptyTitle: { color: palette.text, fontSize: 15, fontWeight: "700" },
  emptyDetail: { color: palette.textSecondary, fontSize: 13, lineHeight: 18, textAlign: "center", maxWidth: 280 },
  note: { flexDirection: "row", gap: 8, alignItems: "flex-start", paddingHorizontal: 4 },
  noteText: { flex: 1, color: palette.textMuted, fontSize: 12, lineHeight: 17 },
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
  modelInfo: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  modelInfoText: { color: palette.textSecondary, fontSize: 13, fontWeight: "600" },
});
