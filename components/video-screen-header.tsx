import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/hub-ui";

export function VideoScreenHeader({ title, backTo = "/settings" }: { title: string; backTo?: string }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.replace(backTo as never)}
        style={styles.back}
        hitSlop={12}
      >
        <MaterialIcons name="arrow-back-ios-new" color={palette.text} size={20} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.surface,
  },
  title: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  back: {
    position: "absolute",
    left: 12,
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  spacer: {
    position: "absolute",
    right: 12,
    height: 44,
    width: 44,
  },
});
