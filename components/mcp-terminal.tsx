import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type McpTerminalEntry = { id: string; command: string; status: "running" | "success" | "error"; output?: string };

export function McpTerminal({ entries, onClose }: { entries: McpTerminalEntry[]; onClose: () => void }) {
  if (!entries.length) return null;
  return <View style={styles.card}><View style={styles.header}><View style={styles.titleRow}><MaterialIcons name="terminal" size={16} color="#9FE7C2" /><Text style={styles.title}>MCP Terminal</Text></View><Pressable onPress={onClose} hitSlop={10}><MaterialIcons name="close" size={17} color="#A9B6C6" /></Pressable></View>{entries.slice(-4).map((entry) => <View key={entry.id} style={styles.entry}><Text style={styles.command}>$ {entry.command}</Text><Text style={[styles.status, entry.status === "error" ? styles.error : entry.status === "success" ? styles.success : styles.running]}>{entry.status === "running" ? "Đang thực thi…" : entry.output || (entry.status === "success" ? "Hoàn tất" : "Không thể thực thi")}</Text></View>)}</View>;
}

const styles = StyleSheet.create({ card: { marginHorizontal: 12, marginTop: 8, padding: 10, gap: 8, borderWidth: 1, borderColor: "#315664", borderRadius: 12, backgroundColor: "#101A1F" }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, titleRow: { flexDirection: "row", alignItems: "center", gap: 6 }, title: { color: "#D8F8E5", fontFamily: "monospace", fontSize: 12, fontWeight: "800" }, entry: { gap: 3, paddingTop: 7, borderTopWidth: 1, borderColor: "#21323B" }, command: { color: "#BFE5F4", fontFamily: "monospace", fontSize: 10 }, status: { fontFamily: "monospace", fontSize: 10, lineHeight: 14 }, running: { color: "#F5D25A" }, success: { color: "#9FE7C2" }, error: { color: "#FF9C9C" } });
