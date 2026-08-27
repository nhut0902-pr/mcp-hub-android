import type { ProviderKind } from "./types";

const ICON_BASE = "https://unpkg.com/@lobehub/icons-static-png@latest/dark";
const CLAWLINK_LOGO = "/manus-storage/mcp-hub-openclaw-terminal-logo_befc01ba.png";

const providerSlugs: Partial<Record<ProviderKind, string>> = { nvidia: "nvidia", groq: "groq", openrouter: "openrouter", openai: "openai", gemini: "gemini", anthropic: "anthropic" };
const mcpSlugs: Array<[RegExp, string]> = [[/github/i, "github"], [/notion/i, "notion"], [/stripe/i, "stripe"], [/supabase/i, "supabase"], [/cloudflare/i, "cloudflare"], [/linear/i, "linear"], [/slack/i, "slack"], [/composio/i, "composio"]];

export function brandLogoUrl(slug: string | undefined): string | null { return slug ? `${ICON_BASE}/${slug}.png` : null; }
export function providerLogoUrl(kind: ProviderKind, name: string): string | null { return kind === "openclaw" ? CLAWLINK_LOGO : brandLogoUrl(providerSlugs[kind] ?? mcpSlugs.find(([pattern]) => pattern.test(name))?.[1]); }
export function mcpLogoUrl(name: string, endpoint?: string): string | null { const probe = `${name} ${endpoint ?? ""}`; return brandLogoUrl(mcpSlugs.find(([pattern]) => pattern.test(probe))?.[1]); }
export function brandMonogram(name: string): string { const parts = name.trim().split(/\s+/).filter(Boolean); return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) ?? "AI").toUpperCase(); }
export function brandColor(seed: string): string { const colors = ["#2962B8", "#854DCE", "#067A6D", "#B84D3A", "#A05B00", "#1B6C9B", "#7B3F83", "#2D6A4F"]; let value = 0; for (const char of seed) value = (value * 31 + char.charCodeAt(0)) >>> 0; return colors[value % colors.length]; }
