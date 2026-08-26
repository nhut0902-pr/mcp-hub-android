import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, EmptyState, palette, StatusPill } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { getProviderName, useHub } from "@/lib/mcp-hub/context";

export default function ModelsScreen() {
  const router = useRouter();
  const { state, isLoading } = useHub();
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const models = useMemo(() => state.models.filter((model) => (providerFilter === "all" || model.providerId === providerFilter) && `${model.displayName} ${model.modelId}`.toLowerCase().includes(query.trim().toLowerCase())), [providerFilter, query, state.models]);
  const filters = [{ id: "all", label: "Tất cả" }, ...state.providers.map((provider) => ({ id: provider.id, label: provider.name }))];
  const copyModelId = async (modelId: string) => { await Clipboard.setStringAsync(modelId); Alert.alert("Đã sao chép", modelId); };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <View style={styles.appHeader}><Pressable testID="models-back" onPress={() => router.replace("/chat")} style={styles.backButton}><MaterialIcons name="arrow-back-ios-new" size={18} color={palette.text} /></Pressable><Text style={styles.appTitle}>Default Models</Text><View style={styles.headerSpacer} pointerEvents="none" /></View>
    <FlatList data={models} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
      ListHeaderComponent={<View style={styles.headerBlock}><Text style={styles.title}>Model</Text><Text style={styles.subtitle}>Danh mục cục bộ được cập nhật từ provider.</Text><View style={styles.search}><MaterialIcons name="search" size={19} color={palette.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Tìm model hoặc mã model" placeholderTextColor="#94A3B8" style={styles.searchInput} autoCapitalize="none" autoCorrect={false} /></View><FlatList horizontal data={filters} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList} renderItem={({ item }) => <Pressable onPress={() => setProviderFilter(item.id)} style={({ pressed }) => [styles.filter, providerFilter === item.id && styles.filterActive, { opacity: pressed ? 0.74 : 1 }]}><Text style={[styles.filterText, providerFilter === item.id && styles.filterTextActive]}>{item.label}</Text></Pressable>} /><View style={styles.resultLine}><Text style={styles.resultText}>{isLoading ? "Đang tải dữ liệu…" : `${models.length} model`}</Text><StatusPill label="Lưu cục bộ" tone="success" /></View></View>}
      renderItem={({ item }) => <Card style={styles.modelCard}><View style={styles.modelTop}><View style={styles.modelIcon}><MaterialIcons name="memory" color={palette.navy} size={18} /></View><View style={styles.modelCopy}><Text style={styles.modelName} numberOfLines={1}>{item.displayName}</Text><Text style={styles.providerName}>{getProviderName(state, item.providerId)}</Text></View>{item.contextLength ? <Text style={styles.context}>{Math.round(item.contextLength / 1000)}k</Text> : null}</View>{item.supportsThinking || item.supportsWebSearch ? <View style={styles.capabilityRow}>{item.supportsThinking ? <StatusPill label="Thinking" tone="success" /> : null}{item.supportsWebSearch ? <StatusPill label="Web search" tone="success" /> : null}</View> : null}<View style={styles.idRow}><Text style={styles.modelId} numberOfLines={1}>{item.modelId}</Text><Pressable onPress={() => void copyModelId(item.modelId)} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}><MaterialIcons name="content-copy" size={17} color={palette.cyan} /></Pressable></View></Card>}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListEmptyComponent={<Card><EmptyState icon="inventory-2" title="Chưa có model nào" detail="Vào tab Provider, nhập API key khi cần rồi chọn Đồng bộ để tải danh sách model." /></Card>}
    />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  appHeader: { height: 58, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderColor: "#303030" }, appTitle: { color: palette.text, fontSize: 16, fontWeight: "800" }, backButton: { position: "absolute", left: 13, width: 40, height: 40, alignItems: "center", justifyContent: "center" }, headerSpacer: { position: "absolute", right: 13, width: 40, height: 40 },
  content: { padding: 14, paddingBottom: 28 }, headerBlock: { gap: 9, paddingBottom: 14 }, title: { color: palette.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.4 }, subtitle: { color: palette.muted, fontSize: 11 }, search: { height: 42, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 11, alignItems: "center", flexDirection: "row", paddingHorizontal: 11, gap: 7, marginTop: 5 }, searchInput: { flex: 1, height: 41, color: palette.text, fontSize: 13 }, filterList: { gap: 7, paddingVertical: 2 }, filter: { borderWidth: 1, borderColor: palette.border, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: palette.surface }, filterActive: { borderColor: palette.navy, backgroundColor: palette.navy }, filterText: { color: palette.muted, fontSize: 11, fontWeight: "700" }, filterTextActive: { color: "#FFFFFF" }, resultLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 }, resultText: { color: palette.muted, fontSize: 11, fontWeight: "700" }, modelCard: { padding: 13, gap: 10 }, modelTop: { flexDirection: "row", alignItems: "center", gap: 9 }, modelIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: palette.softNavy, alignItems: "center", justifyContent: "center" }, modelCopy: { flex: 1, gap: 1 }, modelName: { color: palette.text, fontSize: 14, fontWeight: "800" }, providerName: { color: palette.muted, fontSize: 10 }, capabilityRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" }, context: { color: palette.navy, fontSize: 11, fontWeight: "800", backgroundColor: palette.softCyan, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 }, idRow: { borderRadius: 9, backgroundColor: "#242424", paddingHorizontal: 9, paddingVertical: 8, flexDirection: "row", gap: 8, alignItems: "center" }, modelId: { color: palette.muted, fontSize: 10, flex: 1, fontFamily: "monospace" },
});
