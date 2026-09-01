import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton, Card, FormInput, palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { VideoScreenHeader } from "@/components/video-screen-header";
import { parseChatCompletion } from "@/lib/mcp-hub/chat";
import { sendAiCloudChatFromProxy } from "@/lib/mcp-hub/ai-cloud-client";
import { generateImageUrl } from "@/lib/mcp-hub/pollinations";

const levels = ["Ngắn gọn", "Từng bước", "Chuyên sâu"];

export default function AiTutorScreen() {
  const router = useRouter();
  const [problem, setProblem] = useState("");
  const [level, setLevel] = useState("Từng bước");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  const solve = async () => {
    const prompt = problem.trim();
    if (!prompt || loading) return;
    setLoading(true);
    setAnswer("");
    setImageUrl(null);
    try {
      const systemPrompt = level === "Ngắn gọn" 
        ? "Giải bài toán ngắn gọn, đi thẳng kết luận."
        : level === "Chuyên sâu"
        ? "Giải bài toán chi tiết. Chỉ ra dữ kiện, định lý, phương pháp, từng bước suy luận, kiểm tra kết quả. Nếu cần vẽ hình, mô tả hình vẽ chi tiết để AI có thể tạo ảnh."
        : "Giải bài toán từng bước rõ ràng. Nêu dữ kiện, cách giải, kết quả. Nếu cần vẽ hình, mô tả chi tiết.";
      
      const response = await sendAiCloudChatFromProxy({
        model: "gemini-1.5-flash",
        temperature: 0.2,
        max_tokens: 2048,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }) as any;
      
      const parsed = parseChatCompletion(response);
      setAnswer(parsed.content || "Không có câu trả lời.");
      
      // Check if AI suggested drawing a figure
      const lowerAnswer = (parsed.content || "").toLowerCase();
      if (lowerAnswer.includes("vẽ hình") || lowerAnswer.includes("hình vẽ") || lowerAnswer.includes("miền nghiệm") || lowerAnswer.includes("đồ thị")) {
        // Auto-generate image via Pollinations
        generateFigure(prompt);
      }
    } catch (e) {
      setAnswer("Lỗi: " + (e instanceof Error ? e.message : "Không thể giải."));
    } finally {
      setLoading(false);
    }
  };

  const generateFigure = async (prompt: string) => {
    setGeneratingImage(true);
    try {
      const imagePrompt = `Math diagram for: ${prompt}. Clean, clear, educational style with labels. White background, black lines.`;
      const url = generateImageUrl(imagePrompt, { width: 800, height: 600, model: "flux" });
      setImageUrl(url);
    } catch (e) {
      console.error("Image gen error:", e);
    } finally {
      setGeneratingImage(false);
    }
  };

  const copyAnswer = async () => {
    if (answer) { await Clipboard.setStringAsync(answer); Alert.alert("Đã copy", "Câu trả lời đã được sao chép."); }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <VideoScreenHeader title="AI Gia sư" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Model info */}
        <View style={styles.modelInfo}>
          <MaterialIcons name="cloud" size={18} color={palette.primary} />
          <Text style={styles.modelText}>Model: Nhutbot 1.0 Flash (AI Cloud)</Text>
        </View>

        {/* Problem input */}
        <FormInput
          label="Bài toán"
          value={problem}
          onChangeText={setProblem}
          placeholder="Nhập bài toán... VD: Giải phương trình 2x + 3 = 7"
          multiline
        />

        {/* Level picker */}
        <Text style={styles.fieldLabel}>Mức độ giải</Text>
        <View style={styles.levelRow}>
          {levels.map((l) => (
            <Pressable key={l} onPress={() => setLevel(l)} style={[styles.levelBtn, level === l && styles.levelBtnActive]}>
              <Text style={[styles.levelText, level === l && styles.levelTextActive]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        {/* Solve button */}
        <AppButton label={loading ? "Đang giải..." : "Giải bài"} icon="calculate" onPress={() => void solve()} loading={loading} />

        {/* Answer */}
        {answer ? (
          <Card style={styles.answerCard}>
            <View style={styles.answerHeader}>
              <Text style={styles.answerTitle}>📝 Lời giải</Text>
              <Pressable onPress={() => void copyAnswer()} hitSlop={10}>
                <MaterialIcons name="content-copy" size={18} color={palette.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.answerText}>{answer}</Text>
          </Card>
        ) : null}

        {/* Generated image (Pollinations.ai) */}
        {generatingImage ? (
          <Card style={styles.imageCard}>
            <Text style={styles.imageLoading}>🎨 Đang tạo hình vẽ...</Text>
          </Card>
        ) : null}
        {imageUrl ? (
          <Card style={styles.imageCard}>
            <Text style={styles.imageTitle}>📊 Hình vẽ / Miền nghiệm</Text>
            <Image source={{ uri: imageUrl }} style={styles.figureImage} resizeMode="contain" />
          </Card>
        ) : null}

        {/* Manual image generation */}
        {answer && !imageUrl && !generatingImage ? (
          <AppButton label="🎨 Vẽ hình cho bài toán" icon="palette" variant="secondary" onPress={() => void generateFigure(problem)} />
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  modelInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  modelText: { color: palette.textSecondary, fontSize: 13, fontWeight: "600" },
  fieldLabel: { color: palette.textSecondary, fontSize: 13, fontWeight: "600" },
  levelRow: { flexDirection: "row", gap: 8 },
  levelBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border, alignItems: "center" },
  levelBtnActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  levelText: { color: palette.textSecondary, fontSize: 13, fontWeight: "600" },
  levelTextActive: { color: "#FFFFFF" },
  answerCard: { gap: 10 },
  answerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  answerTitle: { color: palette.text, fontSize: 15, fontWeight: "700" },
  answerText: { color: palette.text, fontSize: 14, lineHeight: 22 },
  imageCard: { gap: 10, alignItems: "center" },
  imageTitle: { color: palette.text, fontSize: 15, fontWeight: "700", alignSelf: "flex-start" },
  imageLoading: { color: palette.textSecondary, fontSize: 14, fontStyle: "italic" },
  figureImage: { width: "100%", height: 300, borderRadius: 12 },
});
