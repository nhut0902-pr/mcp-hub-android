import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { brandColor, brandMonogram, mcpLogoUrl, providerLogoUrl } from "@/lib/mcp-hub/brand-logo";
import type { ProviderKind } from "@/lib/mcp-hub/types";

type MarkProps = { name: string; size?: number; style?: StyleProp<ViewStyle> };
function Mark({ name, uri, size = 38, style }: MarkProps & { uri: string | null }) { const [failed, setFailed] = useState(false); useEffect(() => setFailed(false), [uri]); return <View style={[styles.mark, { width: size, height: size, borderRadius: Math.round(size * .28), backgroundColor: brandColor(name) }, style]}>{uri && !failed ? <Image source={{ uri }} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: Math.round(size * .28) }} resizeMode="contain" /> : <Text style={[styles.initials, { fontSize: Math.max(10, Math.round(size * .34)) }]}>{brandMonogram(name)}</Text>}</View>; }
export function ProviderBrandMark({ name, kind, size, style }: MarkProps & { kind: ProviderKind }) { return <Mark name={name} uri={providerLogoUrl(kind, name)} size={size} style={style} />; }
export function McpBrandMark({ name, endpoint, size, style }: MarkProps & { endpoint?: string }) { const uri = mcpLogoUrl(name, endpoint); return <View><Mark name={name} uri={uri} size={size} style={style} />{!uri ? <View pointerEvents="none" style={styles.mcpBadge}><MaterialIcons name="hub" color="#FFFFFF" size={8} /></View> : null}</View>; }
const styles = StyleSheet.create({ mark: { alignItems: "center", justifyContent: "center", overflow: "hidden" }, initials: { color: "#FFFFFF", fontWeight: "900", letterSpacing: -.4 }, mcpBadge: { position: "absolute", right: -2, bottom: -2, width: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#172C46", borderWidth: 1, borderColor: "#FFFFFF" } });
