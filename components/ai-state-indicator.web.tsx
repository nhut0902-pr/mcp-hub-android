import { StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/hub-ui";

type AiState = "generate" | "thinking";

/** Web fallback: Android/iOS resolve the native file, which renders the supplied Lottie JSON. */
export function AiStateIndicator({ state }: { state: AiState }) {
  const thinking = state === "thinking";
  return (
    <View style={styles.wrap} testID={thinking ? "ai-thinking-indicator" : "ai-generate-indicator"}>
      <View style={[styles.pulse, thinking && styles.brain]} />
      <Text style={styles.label}>{thinking ? "AI is thinking…" : "AI is generating…"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, backgroundColor: "#343434" },
  pulse: { width: 18, height: 18, borderRadius: 9, backgroundColor: palette.navy, borderWidth: 3, borderColor: "#7FD8FF" },
  brain: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#34D6EA", borderColor: "#A7F4FF" },
  label: { color: palette.muted, fontSize: 12, fontWeight: "700" },
});
