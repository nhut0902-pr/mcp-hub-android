import LottieView from "lottie-react-native";
import { StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/hub-ui";

type AiState = "generate" | "thinking";

export function AiStateIndicator({ state }: { state: AiState }) {
  const thinking = state === "thinking";
  return (
    <View style={styles.wrap} testID={thinking ? "ai-thinking-indicator" : "ai-generate-indicator"}>
      <LottieView
        autoPlay
        loop
        source={thinking ? require("../assets/animations/ai-thinking.json") : require("../assets/animations/ai-generate.json")}
        style={thinking ? styles.thinking : styles.generate}
      />
      <Text style={styles.label}>{thinking ? "AI is thinking…" : "AI is generating…"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, backgroundColor: "#343434" },
  generate: { width: 30, height: 30 },
  thinking: { width: 38, height: 38 },
  label: { color: palette.muted, fontSize: 12, fontWeight: "700" },
});
