import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/hub-ui";

export function VideoScreenHeader({ title, backTo = "/settings" }: { title: string; backTo?: string }) {
  const router = useRouter();
  return <View style={styles.header}><Pressable onPress={() => router.replace(backTo as never)} style={styles.back} hitSlop={10}><MaterialIcons name="arrow-back-ios-new" color={palette.text} size={18} /></Pressable><Text style={styles.title}>{title}</Text><View style={styles.spacer} pointerEvents="none" /></View>;
}

const styles = StyleSheet.create({ header: { height: 58, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "#303030" }, title: { color: palette.text, fontSize: 16, fontWeight: "800" }, back: { position: "absolute", left: 13, height: 40, width: 40, alignItems: "center", justifyContent: "center" }, spacer: { position: "absolute", right: 13, height: 40, width: 40 } });
