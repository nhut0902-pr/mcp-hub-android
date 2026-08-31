import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { MID_AUTUMN_2026, midAutumnCampaignPeriod } from "@/lib/midautumn-campaign";
import { palette } from "@/components/hub-ui";

const midAutumnImage = require("@/assets/images/midautumn-2026.jpg");

type Props = { compact?: boolean; onOpen?: () => void; onClose?: () => void; visible?: boolean };

export function MidAutumnCampaignPanel({ compact = false, onClose, onOpen, visible }: Props) {
  // v1.0.30: Ultra-compact banner — single row pill, no image, minimal height.
  // Old version: 76px height with image + text + button → took too much space.
  // New version: 40px pill with icon + text + chevron → blends into chat header.
  const content = compact ? (
    <Pressable
      accessibilityLabel="Mở hướng dẫn Trung Thu"
      onPress={onOpen}
      style={({ pressed }) => [styles.compactPill, { opacity: pressed ? 0.7 : 1 }]}
    >
      <MaterialIcons name="celebration" size={15} color="#FFD783" />
      <Text style={styles.compactText} numberOfLines={1}>
        <Text style={styles.compactLabel}>Trung Thu</Text> · {MID_AUTUMN_2026.modelLabel} miễn phí
      </Text>
      <MaterialIcons name="chevron-right" size={15} color="#FFD783" />
    </Pressable>
  ) : (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="celebration" size={22} color="#FFD783" />
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>ĐÊM HỘI TRĂNG RẰM</Text>
          <Text style={styles.title}>Quà Trung Thu từ MCP Hub</Text>
        </View>
      </View>
      <Text style={styles.detail}>
        Tặng miễn phí không giới hạn model Cloud trong chiến dịch. Model nổi bật: {MID_AUTUMN_2026.modelLabel}.
      </Text>
      <Text style={styles.period}>{midAutumnCampaignPeriod()}</Text>
      <Text style={styles.team}>{MID_AUTUMN_2026.teamLabel}</Text>
    </View>
  );

  if (typeof visible !== "boolean") return content;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.modalCard}>
          {content}
          <View style={styles.guide}>
            <View style={styles.guideRow}>
              <MaterialIcons name="tips-and-updates" size={18} color="#FFD783" />
              <Text style={styles.guideText}>Mở bộ chọn model ở Chat và ghim {MID_AUTUMN_2026.modelLabel}.</Text>
            </View>
            <View style={styles.guideRow}>
              <MaterialIcons name="cloud-done" size={18} color="#FFD783" />
              <Text style={styles.guideText}>Ưu đãi Cloud hiển thị trong thời gian chiến dịch, không cần API key.</Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.confirm, { opacity: pressed ? 0.8 : 1 }]}>
            <Text style={styles.confirmText}>Đã hiểu, bắt đầu trò chuyện</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", padding: 20 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.78)" },
  modalCard: { zIndex: 1, backgroundColor: palette.surface, borderRadius: 20, borderWidth: 1, borderColor: palette.border, padding: 20, gap: 14 },
  card: { gap: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  eyebrow: { color: "#FFD783", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  title: { color: palette.text, fontSize: 18, fontWeight: "900" },
  detail: { color: palette.textSecondary, fontSize: 13, lineHeight: 19 },
  period: { color: "#FFD783", fontSize: 12, fontWeight: "800" },
  team: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
  // v1.0.30: Ultra-compact pill — 36px height, single row
  compactPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,215,131,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,215,131,0.2)",
  },
  compactText: { flex: 1, color: palette.textSecondary, fontSize: 12, fontWeight: "600" },
  compactLabel: { color: "#FFD783", fontWeight: "800" },
  guide: { gap: 10, paddingHorizontal: 4, marginTop: 4 },
  guideRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  guideText: { flex: 1, color: palette.textSecondary, fontSize: 13, lineHeight: 18 },
  confirm: { height: 48, borderRadius: 14, backgroundColor: "#FFD783", alignItems: "center", justifyContent: "center", marginTop: 4 },
  confirmText: { color: "#3A2413", fontSize: 14, fontWeight: "800" },
});
