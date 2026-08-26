import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { MID_AUTUMN_2026, midAutumnCampaignPeriod } from "@/lib/midautumn-campaign";

const midAutumnImage = require("@/assets/images/midautumn-2026.jpg");

type Props = { compact?: boolean; onOpen?: () => void; onClose?: () => void; visible?: boolean };

export function MidAutumnCampaignPanel({ compact = false, onClose, onOpen, visible }: Props) {
  const content = <View style={compact ? styles.compact : styles.card}>
    <Image source={midAutumnImage} style={compact ? styles.compactImage : styles.image} />
    <View style={styles.copy}>
      <View style={styles.titleLine}><Text style={styles.eyebrow}>ĐÊM HỘI TRĂNG RẰM</Text>{compact ? <MaterialIcons name="celebration" size={17} color="#FFD783" /> : null}</View>
      <Text style={compact ? styles.compactTitle : styles.title}>Quà Trung Thu từ MCP Hub</Text>
      <Text style={styles.detail}>Tặng miễn phí không giới hạn model Cloud trong chiến dịch. Model nổi bật: {MID_AUTUMN_2026.modelLabel}.</Text>
      <Text style={styles.period}>{midAutumnCampaignPeriod()}</Text>
      {!compact ? <Text style={styles.team}>{MID_AUTUMN_2026.teamLabel}</Text> : null}
    </View>
    {compact ? <Pressable accessibilityLabel="Mở hướng dẫn Trung Thu" onPress={onOpen} style={({ pressed }) => [styles.open, { opacity: pressed ? 0.7 : 1 }]}><Text style={styles.openText}>Xem</Text><MaterialIcons name="chevron-right" size={18} color="#3A2413" /></Pressable> : null}
  </View>;

  if (typeof visible !== "boolean") return content;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.overlay}><Pressable style={styles.scrim} onPress={onClose} /><View style={styles.modalCard}>{content}<View style={styles.guide}><View style={styles.guideRow}><MaterialIcons name="tips-and-updates" size={18} color="#FFD783" /><Text style={styles.guideText}>Mở bộ chọn model ở Chat và ghim {MID_AUTUMN_2026.modelLabel}.</Text></View><View style={styles.guideRow}><MaterialIcons name="cloud-done" size={18} color="#FFD783" /><Text style={styles.guideText}>Ưu đãi Cloud được hiển thị trong thời gian chiến dịch, không cần nhập thêm API key.</Text></View></View><Pressable onPress={onClose} style={({ pressed }) => [styles.confirm, { opacity: pressed ? 0.8 : 1 }]}><Text style={styles.confirmText}>Đã hiểu, bắt đầu trò chuyện</Text></Pressable></View></View></Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", padding: 20 }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8, 9, 18, .78)" }, modalCard: { zIndex: 1, backgroundColor: "#211C2F", borderRadius: 24, borderWidth: 1, borderColor: "#7D567D", padding: 12, gap: 12, overflow: "hidden" },
  card: { minHeight: 154, borderRadius: 17, overflow: "hidden", backgroundColor: "#31233A", borderWidth: 1, borderColor: "#8A5C7D" }, compact: { minHeight: 76, borderRadius: 15, overflow: "hidden", backgroundColor: "#31233A", borderWidth: 1, borderColor: "#8A5C7D", flexDirection: "row", alignItems: "stretch" },
  image: { width: "100%", height: 112, opacity: 0.72 }, compactImage: { width: 86, height: "100%", opacity: 0.82 }, copy: { padding: 12, gap: 4, flex: 1 }, titleLine: { flexDirection: "row", alignItems: "center", gap: 5 }, eyebrow: { color: "#FFD783", fontSize: 9, fontWeight: "900", letterSpacing: 1 }, title: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" }, compactTitle: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" }, detail: { color: "#E1D6E7", fontSize: 10, lineHeight: 15 }, period: { color: "#FFD783", fontSize: 10, fontWeight: "800", marginTop: 1 }, team: { color: "#BFAECA", fontSize: 10, fontWeight: "700" },
  open: { alignSelf: "center", marginRight: 8, paddingHorizontal: 8, minHeight: 32, borderRadius: 16, backgroundColor: "#FFD783", flexDirection: "row", alignItems: "center" }, openText: { color: "#3A2413", fontSize: 10, fontWeight: "900" }, guide: { gap: 8, paddingHorizontal: 4 }, guideRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" }, guideText: { flex: 1, color: "#DCD1E2", fontSize: 11, lineHeight: 16 }, confirm: { height: 44, borderRadius: 14, backgroundColor: "#FFD783", alignItems: "center", justifyContent: "center" }, confirmText: { color: "#3A2413", fontSize: 12, fontWeight: "900" },
});
