import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

/**
 * MCP Hub Design System v2 (v1.0.27+)
 *
 * Modern indigo/violet palette with proper light + dark themes.
 * Inspired by 2026 design trends: larger touch targets, soft shadows,
 * gradient accents, generous spacing.
 */

export const palette = {
  // Primary — iOS Blue (Chatbox style)
  primary: "#0A84FF",
  primaryLight: "#5AC8FA",
  primaryDark: "#0040DD",

  // Backgrounds (Chatbox dark theme)
  background: "#1C1C1E",
  surface: "#2C2C2E",
  surfaceAlt: "#3A3A3C",
  surfaceElevated: "#48484A",

  // Text
  text: "#FFFFFF",
  textSecondary: "#8E8E93",
  textMuted: "#636366",

  // Borders
  border: "#38383A",
  borderLight: "#48484A",

  // Status colors (iOS system colors)
  success: "#30D158",
  warning: "#FFD60A",
  error: "#FF453A",

  // Accents
  accent: "#FF9F0A",       // orange (Chatbox AI brand)
  accentBlue: "#0A84FF",
  accentCyan: "#5AC8FA",

  // Gradients
  gradientStart: "#0A84FF",
  gradientEnd: "#5AC8FA",

  // Legacy aliases
  navy: "#0A84FF",
  cyan: "#5AC8FA",
  muted: "#8E8E93",
  softCyan: "#1C2C3E",
  softNavy: "#0A2540",
};

// ─── Card ───
export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─── Section Title ───
export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading}>{title}</Text>
      {action}
    </View>
  );
}

// ─── Status Pill ───
export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "neutral" }) {
  const colors: Record<string, { fg: string; bg: string }> = {
    success: { fg: "#34D399", bg: "rgba(16,185,129,0.12)" },
    warning: { fg: "#FBBF24", bg: "rgba(245,158,11,0.12)" },
    neutral: { fg: "#8E8E93", bg: "rgba(148,163,184,0.12)" },
  };
  const c = colors[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

// ─── App Button (larger, with gradient feel) ───
export function AppButton({
  label,
  onPress,
  icon,
  variant = "primary",
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
}) {
  const config = {
    primary: { color: "#FFFFFF", bg: palette.primary },
    secondary: { color: palette.text, bg: palette.surfaceAlt },
    danger: { color: "#FCA5A5", bg: "rgba(239,68,68,0.12)" },
    ghost: { color: palette.primary, bg: "transparent" },
  }[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: config.bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === "ghost" && styles.ghostButton,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={config.color} size="small" />
      ) : icon ? (
        <MaterialIcons name={icon} size={18} color={config.color} />
      ) : null}
      <Text style={[styles.buttonText, { color: config.color }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Form Input (bigger, cleaner) ───
export function FormInput({
  label,
  hint,
  multiline = false,
  ...props
}: TextInputProps & { label: string; hint?: string; multiline?: boolean }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor="#636366"
        multiline={multiline}
        style={[styles.input, multiline && styles.textarea]}
        {...props}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

// ─── Empty State ───
export function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name={icon} color={palette.primary} size={32} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeading: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  button: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ghostButton: {
    paddingHorizontal: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    color: palette.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  fieldHint: {
    fontSize: 12,
    color: palette.textMuted,
    lineHeight: 17,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: palette.text,
    backgroundColor: palette.surfaceAlt,
  },
  textarea: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(99,102,241,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDetail: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 280,
  },
});
