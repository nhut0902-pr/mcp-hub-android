import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AiMathGraph } from "@/components/ai-math-graph";
import { AppButton, Card, palette, StatusPill } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { VideoScreenHeader } from "@/components/video-screen-header";
import { comparatorLabel, kindLabel, parseInequality, type ParsedInequality } from "@/lib/ai-math/inequality";

const examples = ["2x + y ≤ 6", "y ≥ x^2 - 4", "y ≤ |x| + 2", "x^2 + y^2 ≤ 25"];

export default function AiMathScreen() {
  const [formula, setFormula] = useState(examples[0]);
  const [inequality, setInequality] = useState<ParsedInequality>(() => parseInequality(examples[0]));
  const summary = useMemo(() => `${kindLabel(inequality)} · biên ${comparatorLabel(inequality.comparator)}`, [inequality]);
  const draw = () => {
    try { setInequality(parseInequality(formula)); }
    catch (error) { Alert.alert("Không đọc được miền nghiệm", error instanceof Error ? error.message : "Hãy dùng một bất phương trình hợp lệ."); }
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <VideoScreenHeader title="AI Math" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card style={styles.hero}>
        <View style={styles.icon}><MaterialIcons name="functions" size={25} color="#FFFFFF" /></View>
        <View style={styles.heroCopy}>
          <View style={styles.titleLine}><Text style={styles.title}>AI Math</Text><StatusPill label="Graph" tone="success" /></View>
          <Text style={styles.detail}>Nhập bất phương trình để vẽ miền nghiệm ngay trên mặt phẳng toạ độ.</Text>
        </View>
      </Card>
      <View style={styles.field}>
        <Text style={styles.label}>Bất phương trình</Text>
        <TextInput value={formula} onChangeText={setFormula} onSubmitEditing={draw} returnKeyType="done" autoCapitalize="none" autoCorrect={false} style={styles.input} placeholder="Ví dụ: 2x + y ≤ 6" placeholderTextColor="#87929E" />
      </View>
      <View style={styles.examples}>{examples.map((item) => <Pressable key={item} onPress={() => { setFormula(item); setInequality(parseInequality(item)); }} style={({ pressed }) => [styles.example, { opacity: pressed ? 0.7 : 1 }]}><Text style={styles.exampleText}>{item}</Text></Pressable>)}</View>
      <AppButton label="Vẽ miền nghiệm" icon="query-stats" onPress={draw} />
      <Card style={styles.graphCard}>
        <View style={styles.graphHeading}><View><Text style={styles.graphTitle}>Miền nghiệm</Text><Text style={styles.formula}>{formula}</Text></View><StatusPill label={summary} tone="neutral" /></View>
        <AiMathGraph inequality={inequality} />
        <View style={styles.legend}><View style={styles.legendItem}><View style={styles.fillDot} /><Text style={styles.legendText}>Miền thỏa mãn</Text></View><View style={styles.legendItem}><View style={styles.lineDot} /><Text style={styles.legendText}>Đường biên</Text></View></View>
      </Card>
      <Card style={styles.help}>
        <Text style={styles.helpTitle}>Dạng được hỗ trợ</Text>
        <Text style={styles.helpText}>Tuyến tính: ax + by ≤ c. Parabol: y ≥ ax^2 + bx + c. Trị tuyệt đối: y ≤ |x| + c. Đường tròn: x^2 + y^2 ≤ r^2. Dấu nhỏ hơn hoặc lớn hơn tạo đường biên nét đứt.</Text>
      </Card>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 14, paddingBottom: 30, gap: 12 }, hero: { flexDirection: "row", gap: 11, backgroundColor: "#243545", borderColor: "#416179" }, icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#805BD7", justifyContent: "center", alignItems: "center" }, heroCopy: { flex: 1, gap: 4 }, titleLine: { flexDirection: "row", alignItems: "center", gap: 8 }, title: { color: palette.text, fontSize: 15, fontWeight: "800" }, detail: { color: "#BDD8EE", fontSize: 11, lineHeight: 16 }, field: { gap: 6 }, label: { color: palette.text, fontWeight: "800", fontSize: 12 }, input: { minHeight: 48, borderWidth: 1, borderColor: "#454B55", borderRadius: 12, backgroundColor: "#282C32", color: palette.text, paddingHorizontal: 13, fontSize: 15, fontWeight: "700" }, examples: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, example: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: "#29333E", borderWidth: 1, borderColor: "#3D5368" }, exampleText: { color: "#BFE1FF", fontSize: 10, fontWeight: "700" }, graphCard: { gap: 12 }, graphHeading: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }, graphTitle: { color: palette.text, fontSize: 14, fontWeight: "800" }, formula: { color: palette.muted, fontFamily: "monospace", fontSize: 11, marginTop: 3 }, legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, legendItem: { flexDirection: "row", gap: 6, alignItems: "center" }, fillDot: { width: 11, height: 11, borderRadius: 3, backgroundColor: "#2996F3", opacity: 0.5 }, lineDot: { width: 14, height: 2, backgroundColor: "#FFB35C" }, legendText: { color: palette.muted, fontSize: 10 }, help: { gap: 5 }, helpTitle: { color: palette.text, fontSize: 12, fontWeight: "800" }, helpText: { color: palette.muted, fontSize: 10, lineHeight: 15 } });
