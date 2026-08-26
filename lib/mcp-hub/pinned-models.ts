import type { ModelRecord, ProviderConfig } from "./types";

export function normalizePinnedModelIds(value: unknown, legacyModelId?: string | null): string[] {
  const values = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  if (!values.length && legacyModelId?.trim()) values.unshift(legacyModelId);
  return [...new Set(values)];
}

export function updatePinnedModels(provider: ProviderConfig, modelId: string): ProviderConfig {
  const current = normalizePinnedModelIds(provider.pinnedModelIds, provider.preferredModelId);
  const pinnedModelIds = current.includes(modelId) ? current.filter((item) => item !== modelId) : [...current, modelId];
  return { ...provider, pinnedModelIds, preferredModelId: pinnedModelIds[0] ?? null };
}

export function getPinnedModels(provider: ProviderConfig, models: ModelRecord[]): ModelRecord[] {
  const pinned = normalizePinnedModelIds(provider.pinnedModelIds, provider.preferredModelId);
  return pinned.map((modelId) => models.find((model) => model.providerId === provider.id && model.modelId === modelId)).filter((model): model is ModelRecord => Boolean(model));
}
