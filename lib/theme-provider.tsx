import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { SchemeColors, type ColorScheme } from "@/constants/theme";
import { loadGeneralSettings, type GeneralSettings } from "@/lib/mcp-hub/feature-settings";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Resolve a GeneralSettings.theme value ("dark" | "light" | "system") into
 * an actual ColorScheme ("dark" | "light") using the system preference.
 */
function resolveScheme(setting: GeneralSettings["theme"], systemScheme: ColorScheme): ColorScheme {
  if (setting === "light") return "light";
  if (setting === "dark") return "dark";
  return systemScheme; // "system" — follow OS
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  // Start with system scheme; will be overridden once we load saved settings
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    applyScheme(scheme);
  }, [applyScheme]);

  // v1.0.24+: Load saved theme from GeneralSettings on app start.
  // Previously ThemeProvider always defaulted to system scheme, ignoring the
  // "Dark" / "Light" / "System" choice the user made in General Settings.
  useEffect(() => {
    let cancelled = false;
    loadGeneralSettings()
      .then((settings) => {
        if (cancelled) return;
        const resolved = resolveScheme(settings.theme, systemScheme);
        setColorSchemeState(resolved);
        applyScheme(resolved);
      })
      .catch((err) => {
        console.warn("[ThemeProvider] Failed to load saved theme:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [applyScheme, systemScheme]);

  // React to system scheme changes (only when user has chosen "system")
  useEffect(() => {
    applyScheme(colorScheme);
  }, [applyScheme, colorScheme]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
    }),
    [colorScheme, setColorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
