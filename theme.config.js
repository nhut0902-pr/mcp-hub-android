/**
 * MCP Hub Theme Configuration
 *
 * v1.0.27: Complete redesign with modern indigo/violet palette.
 * - Proper light AND dark themes (previously both were identical dark)
 * - Larger typography, better contrast ratios (WCAG AA)
 * - Gradient support via primaryGradientStart/End
 */

/** @type {const} */
const themeColors = {
  primary:        { light: "#6366F1", dark: "#818CF8" },
  background:     { light: "#F8FAFC", dark: "#0F1117" },
  surface:        { light: "#FFFFFF", dark: "#1A1D27" },
  foreground:     { light: "#1E293B", dark: "#F1F5F9" },
  muted:          { light: "#64748B", dark: "#94A3B8" },
  border:         { light: "#E2E8F0", dark: "#2D3142" },
  success:        { light: "#059669", dark: "#10B981" },
  warning:        { light: "#D97706", dark: "#F59E0B" },
  error:          { light: "#DC2626", dark: "#EF4444" },
};

module.exports = { themeColors };
