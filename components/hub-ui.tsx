import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

export const palette = {
  navy: "#2996F3",
  cyan: "#2996F3",
  background: "#1F1F1F",
  surface: "#292929",
  text: "#F4F4F4",
  muted: "#A4A4A4",
  border: "#4A4A4A",
  success: "#00A87A",
  warning: "#F4B449",
  error: "#FF5C5C",
  softCyan: "#213C53",
  softNavy: "#363636",
};

export function Card({ children, style }: { children: ReactNode; style?: object }) { return <View style={[styles.card, style]}>{children}</View>; }
export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) { return <View style={styles.sectionTitle}><Text style={styles.sectionHeading}>{title}</Text>{action}</View>; }
export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "neutral" }) {
  const color = tone === "success" ? "#55D5A9" : tone === "warning" ? "#FFD272" : "#BFC7D1";
  const background = tone === "success" ? "#123E33" : tone === "warning" ? "#4A3820" : "#3A3A3A";
  return <View style={[styles.pill, { backgroundColor: background }]}><Text style={[styles.pillText, { color }]}>{label}</Text></View>;
}
export function AppButton({ label, onPress, icon, variant = "primary", loading = false, disabled = false }: { label: string; onPress: () => void; icon?: keyof typeof MaterialIcons.glyphMap; variant?: "primary" | "secondary" | "danger" | "ghost"; loading?: boolean; disabled?: boolean }) {
  const color = variant === "primary" ? "#FFFFFF" : variant === "danger" ? "#FF8585" : "#54AFFF";
  const backgroundColor = variant === "primary" ? palette.navy : variant === "danger" ? "#402525" : variant === "secondary" ? "#313F4B" : "transparent";
  return <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }, variant === "ghost" && styles.ghostButton]}>{loading ? <ActivityIndicator color={color} size="small" /> : icon ? <MaterialIcons name={icon} size={17} color={color} /> : null}<Text style={[styles.buttonText, { color }]}>{label}</Text></Pressable>;
}
export function FormInput({ label, hint, multiline = false, ...props }: TextInputProps & { label: string; hint?: string; multiline?: boolean }) { return <View style={styles.fieldWrap}><Text style={styles.fieldLabel}>{label}</Text><TextInput placeholderTextColor="#8E8E8E" multiline={multiline} style={[styles.input, multiline && styles.textarea]} {...props} /><>{hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}</></View>; }
export function EmptyState({ icon, title, detail }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; detail: string }) { return <View style={styles.empty}><MaterialIcons name={icon} color={palette.navy} size={27} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text></View>; }

const styles = StyleSheet.create({
  card: { backgroundColor: palette.surface, borderRadius: 14, borderWidth: 1, borderColor: palette.border, padding: 13, gap: 10 },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, marginBottom: 8 },
  sectionHeading: { color: palette.text, fontSize: 14, fontWeight: "700" },
  pill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: "700" },
  button: { minHeight: 38, borderRadius: 10, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  ghostButton: { paddingHorizontal: 5 },
  buttonText: { fontSize: 12, fontWeight: "700" },
  fieldWrap: { gap: 5 },
  fieldLabel: { fontSize: 11, color: palette.text, fontWeight: "700" },
  fieldHint: { fontSize: 10, color: palette.muted, lineHeight: 15 },
  input: { minHeight: 42, borderWidth: 1, borderColor: palette.border, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, fontSize: 13, color: palette.text, backgroundColor: "#242424" },
  textarea: { minHeight: 78, textAlignVertical: "top" },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 35, paddingHorizontal: 24, gap: 7 },
  emptyTitle: { color: palette.text, fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyDetail: { color: palette.muted, fontSize: 12, lineHeight: 17, textAlign: "center" },
});
