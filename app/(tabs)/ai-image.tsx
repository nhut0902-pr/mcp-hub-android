import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppButton, Card, FormInput, palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { VideoScreenHeader } from "@/components/video-screen-header";
import { generateImageUrl } from "@/lib/mcp-hub/pollinations";

export default function AiImageScreen() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setImageUrl(null);
    try {
      const url = generateImageUrl(prompt.trim(), { width: 768, height: 768, model: "flux" });
      setImageUrl(url);
    } catch (e) {
      console.error("Image gen error:", e);
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    "Vẽ một con mèo dễ thương ngồi trên mặt trăng",
    "Logo công tech hiện đại màu xanh dương",
    "Phong cảnh núi non lúc hoàng hôn",
    "Avatar anime style nam, tóc đen, mặc áo hoodie",
    "Infographic về giá vàng 2026",
  ];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <VideoScreenHeader title="AI Tạo Ảnh" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <MaterialIcons name="image" size={28} color={palette.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Tạo ảnh bằng AI</Text>
            <Text style={styles.heroDetail}>Miễn phí qua Pollinations.ai — không cần API key.</Text>
          </View>
        </View>

        <FormInput
          label="Mô tả ảnh"
          value={prompt}
          onChangeText={setPrompt}
          placeholder="VD: Vẽ một con rồng vàng bay trên bầu trời đêm..."
          multiline
        />

        <AppButton label={loading ? "Đang tạo ảnh..." : "🎨 Tạo ảnh"} icon="palette" onPress={() => void generate()} loading={loading} />

        {/* Presets */}
        <Text style={styles.fieldLabel}>Gợi ý</Text>
        <View style={styles.presetList}>
          {presets.map((p, i) => (
            <Pressable key={i} onPress={() => setPrompt(p)} style={styles.presetChip}>
              <Text style={styles.presetText} numberOfLines={1}>{p}</Text>
            </Pressable>
          ))}
        </View>

        {/* Result */}
        {loading ? (
          <Card style={styles.imageCard}>
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={styles.loadingText}>🎨 Đang tạo ảnh...</Text>
              <Text style={styles.loadingSubtext}>Pollinations.ai đang vẽ — có thể mất 10-30 giây</Text>
            </View>
          </Card>
        ) : null}
        {imageUrl ? (
          <Card style={styles.imageCard}>
            <Text style={styles.imageTitle}>🖼️ Kết quả</Text>
            <Image source={{ uri: imageUrl }} style={styles.resultImage} resizeMode="contain" />
          </Card>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  hero: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
  heroDetail: { color: palette.textSecondary, fontSize: 13, marginTop: 2 },
  fieldLabel: { color: palette.textSecondary, fontSize: 13, fontWeight: "600" },
  presetList: { gap: 8 },
  presetChip: { backgroundColor: palette.surfaceAlt, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: palette.border },
  presetText: { color: palette.textSecondary, fontSize: 13 },
  imageCard: { gap: 12, alignItems: "center" },
  imageTitle: { color: palette.text, fontSize: 15, fontWeight: "700", alignSelf: "flex-start" },
  loadingText: { color: palette.text, fontSize: 15, fontWeight: '700', marginTop: 12 },
  loadingSubtext: { color: palette.textSecondary, fontSize: 12, marginTop: 4 },
  loadingOverlay: { alignItems: 'center', paddingVertical: 30, gap: 4 },
  resultImage: { width: "100%", height: 350, borderRadius: 12 },
});
