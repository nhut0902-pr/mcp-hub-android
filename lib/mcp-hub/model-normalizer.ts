import type { ModelRecord, ProviderKind } from "./types";

type JsonObject = Record<string, unknown>;
const GROQ_REASONING_MODELS = new Set(["openai/gpt-oss-20b", "openai/gpt-oss-120b", "openai/gpt-oss-safeguard-20b", "qwen/qwen3.6-27b", "minimaxai/minimax-m2.7"]);
const GROQ_WEB_MODELS = new Set(["groq/compound", "groq/compound-mini"]);
function isObject(value: unknown): value is JsonObject { return typeof value === "object" && value !== null && !Array.isArray(value); }
function asString(value: unknown): string | null { if (typeof value === "string" && value.trim()) return value.trim(); if (typeof value === "number") return String(value); return null; }
function asNumber(value: unknown): number | null { if (typeof value === "number" && Number.isFinite(value)) return value; if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value); return null; }
function firstString(source: JsonObject, keys: string[]): string | null { for (const key of keys) { const candidate = asString(source[key]); if (candidate) return candidate; } return null; }
function firstNumber(source: JsonObject, keys: string[]): number | null { for (const key of keys) { const candidate = asNumber(source[key]); if (candidate !== null) return candidate; } return null; }
function locateModelArray(payload: unknown): unknown[] { if (Array.isArray(payload)) return payload; if (!isObject(payload)) return []; for (const key of ["data", "models", "results", "items"]) if (Array.isArray(payload[key])) return payload[key]; return []; }
function supportedParameters(item: JsonObject): string[] { return Array.isArray(item.supported_parameters) ? item.supported_parameters.filter((value): value is string => typeof value === "string") : []; }
function hasReasoningMetadata(item: JsonObject): boolean { const params = supportedParameters(item); return params.some((parameter) => /reasoning|thinking|reason/i.test(parameter)) || Boolean(item.reasoning); }
function modelImageUrl(item: JsonObject): string | null {
  const direct = firstString(item, ["image_url", "imageUrl", "icon_url", "iconUrl", "logo_url", "logoUrl", "thumbnail_url", "thumbnailUrl"]);
  if (direct && /^https:\/\//i.test(direct)) return direct;
  for (const key of ["metadata", "provider", "images"]) {
    if (!isObject(item[key])) continue;
    const nested = firstString(item[key], ["image_url", "imageUrl", "icon_url", "iconUrl", "logo_url", "logoUrl", "url"]);
    if (nested && /^https:\/\//i.test(nested)) return nested;
  }
  return null;
}

export function normaliseModelsResponse(payload: unknown, providerId: string, updatedAt = new Date().toISOString(), providerKind: ProviderKind = "custom"): ModelRecord[] {
  const modelMap = new Map<string, ModelRecord>();
  for (const item of locateModelArray(payload)) {
    if (!isObject(item)) continue;
    const modelId = firstString(item, ["id", "model", "model_id", "slug", "name"]);
    if (!modelId) continue;
    const displayName = firstString(item, ["name", "display_name", "title", "id", "model"]) ?? modelId;
    const supportsThinking = hasReasoningMetadata(item) || (providerKind === "groq" && GROQ_REASONING_MODELS.has(modelId));
    const supportsWebSearch = providerKind === "openrouter" || (providerKind === "groq" && GROQ_WEB_MODELS.has(modelId));
    modelMap.set(modelId, { id: `${providerId}:${modelId}`, providerId, modelId, displayName, imageUrl: modelImageUrl(item), contextLength: firstNumber(item, ["context_length", "contextLength", "context_window", "contextWindow"]), supportsThinking, supportsWebSearch, updatedAt });
  }
  return [...modelMap.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}
