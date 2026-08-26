import { normaliseModelsResponse } from "./model-normalizer";
import { getProviderApiKey } from "./storage";
import type { ModelRecord, ProviderConfig } from "./types";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseExtraHeaders(headersJson: string, apiKey: string | null): Record<string, string> {
  if (!headersJson.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(headersJson);
    if (!isObject(parsed)) throw new Error("Header phải là đối tượng JSON.");
    const entries: [string, string][] = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") entries.push([key, value.replace(/\{\{apiKey\}\}/g, apiKey ?? "")]);
    }
    return Object.fromEntries(entries);
  } catch (error) {
    throw new Error(error instanceof Error ? `Header không hợp lệ: ${error.message}` : "Header không hợp lệ.");
  }
}

function validateEndpoint(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString();
  } catch {
    throw new Error("URL model phải bắt đầu bằng http:// hoặc https://.");
  }
}

export { normaliseModelsResponse } from "./model-normalizer";

export async function fetchProviderModels(provider: ProviderConfig): Promise<ModelRecord[]> {
  const endpoint = validateEndpoint(provider.modelsUrl);
  const apiKey = await getProviderApiKey(provider.id);
  const headers = parseExtraHeaders(provider.headersJson, apiKey);
  if (apiKey && !Object.keys(headers).some((key) => key.toLowerCase() === "authorization")) headers.Authorization = `Bearer ${apiKey}`;
  if (!Object.keys(headers).some((key) => key.toLowerCase() === "accept")) headers.Accept = "application/json";

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "GET", headers });
  } catch {
    throw new Error("Không thể kết nối endpoint. Kiểm tra mạng, URL hoặc chính sách CORS khi thử trên web.");
  }

  const rawBody = await response.text();
  if (!response.ok) {
    const message = rawBody.slice(0, 180).replace(/\s+/g, " ");
    throw new Error(`Provider trả về HTTP ${response.status}${message ? `: ${message}` : ""}`);
  }
  try {
    const records = normaliseModelsResponse(JSON.parse(rawBody), provider.id, new Date().toISOString(), provider.kind);
    if (!records.length) throw new Error("Phản hồi không có mảng data, models, results hoặc items hợp lệ.");
    return records;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Không thể đọc phản hồi model.");
  }
}
