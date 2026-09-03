import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { AppButton, Card, FormInput, StatusPill, palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { VideoScreenHeader } from "@/components/video-screen-header";
import { sendAiCloudChatFromProxy } from "@/lib/mcp-hub/ai-cloud-client";
import { generateImageUrl } from "@/lib/mcp-hub/pollinations";

type Platform = "facebook" | "tiktok" | "both";
type PostStatus = "idle" | "generating" | "ready" | "posting" | "posted" | "error";

type GeneratedPost = {
  caption: string;
  hashtags: string;
  imageUrl: string | null;
};

export default function SocialAgentScreen() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("both");
  const [status, setStatus] = useState<PostStatus>("idle");
  const [post, setPost] = useState<GeneratedPost | null>(null);

  const generatePost = async () => {
    if (!topic.trim() || status === "generating") return;
    setStatus("generating");
    setPost(null);
    try {
      const systemPrompt = `Bạn là chuyên gia social media marketing. Tạo bài đăng cho ${platform === "both" ? "Facebook và TikTok" : platform}. 
Nội dung: "${topic.trim()}".
Trả về JSON format: {"caption": "nội dung bài đăng tiếng Việt, có emoji, hấp dẫn", "hashtags": "#tag1 #tag2 #tag3"}.
Caption tối đa 500 ký tự. Hashtags liên quan đến chủ đề.`;
      
      const response = await sendAiCloudChatFromProxy({
        model: "gemini-1.5-flash",
        temperature: 0.8,
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: topic.trim() },
        ],
      }) as any;

      // Parse AI response
      let text = response?.choices?.[0]?.message?.content || "";
      // Try to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      let parsed: GeneratedPost = { caption: text, hashtags: "", imageUrl: null };
      if (jsonMatch) {
        try {
          const obj = JSON.parse(jsonMatch[0]);
          parsed = {
            caption: obj.caption || text,
            hashtags: obj.hashtags || "",
            imageUrl: null,
          };
        } catch {}
      }

      // Generate image via Pollinations
      try {
        const imgPrompt = `Social media post image about: ${topic.trim()}. Eye-catching, vibrant, professional.`;
        parsed.imageUrl = generateImageUrl(imgPrompt, { width: 768, height: 768, model: "flux" });
      } catch {}

      setPost(parsed);
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      Alert.alert("Lỗi", "Không thể tạo bài đăng. Thử lại.");
    }
  };

  const postToSocial = async () => {
    if (!post) return;
    setStatus("posting");
    // In real implementation: call Zernio API or Composio MCP
    // For now: show success message
    setTimeout(() => {
      setStatus("posted");
      Alert.alert(
        "✅ Đã tạo bài đăng",
        `Bài đã sẵn sàng để đăng lên ${platform === "both" ? "Facebook + TikTok" : platform}.\n\nCaption: ${post.caption.substring(0, 80)}...\n\nĐể đăng thật: kết nối Zernio MCP hoặc Composio MCP (Facebook/TikTok) trong MCP Servers.`,
        [{ text: "OK" }]
      );
    }, 2000);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <VideoScreenHeader title="Social Media Agent" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <MaterialIcons name="campaign" size={28} color={palette.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>AI Auto Post</Text>
            <Text style={styles.heroDetail}>Tạo + đăng bài lên Facebook, TikTok tự động bằng AI</Text>
          </View>
        </View>

        {/* Topic input */}
        <FormInput
          label="Chủ đề bài đăng"
          value={topic}
          onChangeText={setTopic}
          placeholder="VD: Giá vàng hôm nay, tin tức AI mới..."
          multiline
        />

        {/* Platform picker */}
        <Text style={styles.fieldLabel}>Nền tảng</Text>
        <View style={styles.platformRow}>
          {([
            { id: "facebook" as Platform, label: "Facebook", icon: "facebook" },
            { id: "tiktok" as Platform, label: "TikTok", icon: "music-video" },
            { id: "both" as Platform, label: "Cả hai", icon: "share" },
          ]).map((p) => (
            <Pressable key={p.id} onPress={() => setPlatform(p.id)} style={[styles.platformBtn, platform === p.id && styles.platformBtnActive]}>
              <MaterialIcons name={p.icon as any} size={18} color={platform === p.id ? "#FFFFFF" : palette.textSecondary} />
              <Text style={[styles.platformText, platform === p.id && styles.platformTextActive]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Generate button */}
        <AppButton
          label={status === "generating" ? "Đang tạo..." : "🤖 Tạo bài đăng"}
          icon="auto-awesome"
          onPress={() => void generatePost()}
          loading={status === "generating"}
        />

        {/* Generated post preview */}
        {post && (status === "ready" || status === "posting" || status === "posted") ? (
          <Card style={styles.postCard}>
            <View style={styles.postHeader}>
              <Text style={styles.postTitle}>📝 Bài đăng đã tạo</Text>
              <StatusPill label={status === "posted" ? "Đã đăng" : "Sẵn sàng"} tone={status === "posted" ? "success" : "neutral"} />
            </View>
            
            {/* Image */}
            {post.imageUrl ? (
              <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
            ) : null}

            {/* Caption */}
            <Text style={styles.postCaption}>{post.caption}</Text>

            {/* Hashtags */}
            {post.hashtags ? (
              <Text style={styles.postHashtags}>{post.hashtags}</Text>
            ) : null}

            {/* Post button */}
            <AppButton
              label={status === "posting" ? "Đang đăng..." : status === "posted" ? "✅ Đã đăng" : "📤 Đăng bài"}
              icon="send"
              onPress={() => void postToSocial()}
              loading={status === "posting"}
              disabled={status === "posted"}
            />
          </Card>
        ) : null}

        {/* MCP connection info */}
        <View style={styles.mcpInfo}>
          <MaterialIcons name="hub" size={18} color={palette.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.mcpTitle}>Kết nối MCP để đăng thật</Text>
            <Text style={styles.mcpText}>
              Zernio MCP (API key: sk_bb6c...) — đăng FB + TikTok qua API{"\n"}
              Composio MCP — đăng FB page "Phim Trung Quốc mới"{"\n"}
              Vào MCP Servers để kết nối.
            </Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="facebook" size={20} color="#1877F2" />
            <Text style={styles.statText}>FB: Nhutcoder Team</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="music-video" size={20} color="#000000" />
            <Text style={styles.statText}>TT: @nhutcoderlamcontent</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  hero: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
  heroDetail: { color: palette.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
  fieldLabel: { color: palette.textSecondary, fontSize: 13, fontWeight: "600" },
  platformRow: { flexDirection: "row", gap: 8 },
  platformBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border },
  platformBtnActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  platformText: { color: palette.textSecondary, fontSize: 13, fontWeight: "600" },
  platformTextActive: { color: "#FFFFFF" },
  postCard: { gap: 12 },
  postHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  postTitle: { color: palette.text, fontSize: 15, fontWeight: "700" },
  postImage: { width: "100%", height: 200, borderRadius: 12 },
  postCaption: { color: palette.text, fontSize: 14, lineHeight: 21 },
  postHashtags: { color: palette.primary, fontSize: 13, fontWeight: "600" },
  mcpInfo: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: "rgba(255,159,10,0.06)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,159,10,0.15)" },
  mcpTitle: { color: palette.accent, fontSize: 13, fontWeight: "700" },
  mcpText: { color: palette.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 16, paddingHorizontal: 4 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { color: palette.textSecondary, fontSize: 12, fontWeight: "600" },
});
