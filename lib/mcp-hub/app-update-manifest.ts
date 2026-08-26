export const APP_VERSION = "1.0.2";
export const UPDATE_MANIFEST_URL = "https://mcp-hub-android.vercel.app/update.json";

export type AppUpdate = {
  version: string;
  apkUrl: string;
  notes: string;
  publishedAt: string;
};

export function isNewerVersion(candidate: string, current = APP_VERSION): boolean {
  const parse = (value: string) => value.split(".").map((part) => Number.parseInt(part, 10));
  const next = parse(candidate); const installed = parse(current);
  if (next.length !== 3 || installed.length !== 3 || [...next, ...installed].some((part) => !Number.isFinite(part) || part < 0)) return false;
  for (let index = 0; index < 3; index += 1) { if (next[index] !== installed[index]) return next[index] > installed[index]; }
  return false;
}

export function parseAppUpdate(input: unknown): AppUpdate | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (typeof value.version !== "string" || typeof value.apkUrl !== "string" || typeof value.notes !== "string" || typeof value.publishedAt !== "string") return null;
  if (!/^https:\/\/github\.com\/nhut0902-pr\/mcp-hub-android\/releases\/download\/v\d+\.\d+\.\d+\/MCP-Hub-v\d+\.\d+\.\d+\.apk$/.test(value.apkUrl)) return null;
  return { version: value.version, apkUrl: value.apkUrl, notes: value.notes, publishedAt: value.publishedAt };
}
