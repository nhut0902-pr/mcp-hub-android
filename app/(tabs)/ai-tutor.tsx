import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton, Card, palette, StatusPill } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { VideoScreenHeader } from "@/components/video-screen-header";
import { parseChatCompletion } from "@/lib/mcp-hub/chat";
import { sendAiCloudChatFromProxy } from "@/lib/mcp-hub/ai-cloud-client";

const levels = ["Ngắn gọn", "Từng bước", "Chuyên sâu"];

export default function AiTutorScreen() {
  const router = useRouter();
  const [problem, setProblem] = useState("");
  const [level, setLevel] = useState("Từng bước");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const solve = async () => {
    const prompt = problem.trim();
    if (!prompt || loading) return;
    setLoading(true);
    setAnswer("");
    try {
      const response = await sendAiCloudChatFromProxy({
        model: "gemini-1.5-flash",
        temperature: 0.2,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content: `Bạn là AI Gia sư của MCP Hub. Trả lời bằng tiếng Việt, mức độ: ${level}. Giải bài theo trình tự: (1) tóm tắt dữ kiện, (2) chọn phương pháp, (3) tính/biến đổi từng bước, (4) kết quả, (5) cách tự kiểm tra. Nếu đề thiếu dữ kiện hoặc ảnh/chữ không rõ, nêu đúng phần cần bổ sung. Không bịa dữ kiện. Nhắc người học đối chiếu đơn vị và đáp án với đề gốc.`,
          },
          { role: "user", content: prompt },
        ],
      });
      setAnswer(parseChatCompletion(response).content.trim() || "AI Gia sư chưa trả lời. Hãy thử lại với đề bài đầy đủ hơn.");
    } catch (error) {
      Alert.alert("Không thể giải bài", error instanceof Error ? error.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  const sendToFlashcards = () => {
    router.push({ pathname: "/flashcards", params: { source: answer, title: "Ôn tập từ AI Gia sư" } } as never);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <VideoScreenHeader title="AI Gia sư" backTo="/copilots" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.hero}>
          <View style={styles.icon}><MaterialIcons name="school" size={24} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleLine}><Text style={styles.title}>Giải bài để hiểu</Text><StatusPill label="Study" tone="success" /></View>
            <Text style={styles.detail}>Nhập nguyên đề, dữ kiện và phần bạn đang vướng. AI sẽ trình bày cách làm theo bước để bạn tự kiểm tra.</Text>
          </View>
        </Card>
        <View style={styles.field}>
          <Text style={styles.label}>Đề bài</Text>
          <TextInput value={problem} onChangeText={setProblem} placeholder="Ví dụ: Giải phương trình 2x² - 5x - 3 = 0 và giải thích cách kiểm tra nghiệm" placeholderTextColor="#8998A5" multiline textAlignVertical="top" style={styles.input} />
        </View>
        <View style={styles.levels}>
          {levels.map((item) => <Pressable key={item} onPress={() => setLevel(item)} style={[styles.level, level === item && styles.levelSelected]}><Text style={[styles.levelText, level === item && styles.levelTextSelected]}>{item}</Text></Pressable>)}
        </View>
        <AppButton label={loading ? "Đang giải bài…" : "Giải cùng AI Gia sư"} icon="auto-awesome" loading={loading} disabled={!problem.trim()} onPress={() => void solve()} />
        {answer ? (
          <Card style={styles.answer}>
            <View style={styles.answerHead}>
              <View style={styles.answerTitleRow}><MaterialIcons name="tips-and-updates" size={17} color="#BFB1FF" /><Text style={styles.answerTitle}>Lời giải từng bước</Text></View>
              <Pressable hitSlop={10} onPress={() => void Clipboard.setStringAsync(answer)}><MaterialIcons name="content-copy" size={18} color="#B9C8D4" /></Pressable>
            </View>
            <Text selectable style={styles.answerText}>{answer}</Text>
            <AppButton label="Tạo Flashcard từ lời giải" icon="style" variant="secondary" onPress={sendToFlashcards} />
          </Card>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 30, gap: 12 }, hero: { flexDirection: "row", gap: 11, backgroundColor: "#252B46", borderColor: "#4F5D96" }, icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#6B5ACC" }, titleLine: { flexDirection: "row", alignItems: "center", gap: 8 }, title: { color: palette.text, fontSize: 15, fontWeight: "800" }, detail: { color: "#CCD4F3", fontSize: 11, lineHeight: 16, marginTop: 4 }, field: { gap: 6 }, label: { color: palette.text, fontSize: 12, fontWeight: "800" }, input: { minHeight: 128, borderRadius: 13, borderWidth: 1, borderColor: "#455365", padding: 12, backgroundColor: "#172028", color: palette.text, fontSize: 13, lineHeight: 19 }, levels: { flexDirection: "row", gap: 8, flexWrap: "wrap" }, level: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, backgroundColor: "#25323B", borderWidth: 1, borderColor: "#3A505B" }, levelSelected: { backgroundColor: "#343062", borderColor: "#7F73D5" }, levelText: { color: "#B7C7D0", fontSize: 11, fontWeight: "700" }, levelTextSelected: { color: "#E2DDFF" }, answer: { gap: 10, backgroundColor: "#24263A", borderColor: "#5A5481" }, answerHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, answerTitleRow: { flexDirection: "row", gap: 7, alignItems: "center" }, answerTitle: { color: "#E5E0FF", fontSize: 13, fontWeight: "800" }, answerText: { color: "#E3E5F0", fontSize: 12, lineHeight: 19 },
});
