export type ProviderErrorKind = "missing-key" | "invalid-key" | "forbidden" | "quota" | "endpoint" | "network" | "unknown";
export type ProviderErrorInfo = { kind: ProviderErrorKind; title: string; detail: string; action: string };

function messageOf(error: unknown): string { return error instanceof Error ? error.message : String(error ?? ""); }

export function classifyProviderError(error: unknown): ProviderErrorInfo {
  const detail = messageOf(error);
  const normalized = detail.toLowerCase();
  if (normalized.includes("chưa có api key") || normalized.includes("missing api key") || normalized.includes("no api key")) return { kind: "missing-key", title: "Chưa có API key", detail, action: "Mở Provider, dán API key rồi chọn “Lưu & tải model”." };
  if (normalized.includes("http 401") || normalized.includes("invalid api key") || normalized.includes("unauthorized") || normalized.includes("incorrect api key")) return { kind: "invalid-key", title: "API key không hợp lệ", detail, action: "Kiểm tra lại API key của provider, dán key mới và tải model lại." };
  if (normalized.includes("http 403") || normalized.includes("forbidden") || normalized.includes("permission")) return { kind: "forbidden", title: "API key không có quyền", detail, action: "Key hợp lệ nhưng chưa được cấp quyền cho endpoint hoặc model này. Kiểm tra quyền trong trang provider." };
  if (normalized.includes("http 429") || normalized.includes("rate limit") || normalized.includes("quota")) return { kind: "quota", title: "Đã chạm giới hạn provider", detail, action: "Chờ giới hạn được đặt lại hoặc kiểm tra quota/gói dịch vụ của provider." };
  if (normalized.includes("http 400") || normalized.includes("http 404") || normalized.includes("endpoint") || normalized.includes("url")) return { kind: "endpoint", title: "Endpoint hoặc model không hợp lệ", detail, action: "Kiểm tra API base URL, model URL và model đã ghim trong Provider." };
  if (normalized.includes("kết nối") || normalized.includes("network") || normalized.includes("fetch")) return { kind: "network", title: "Không kết nối được provider", detail, action: "Kiểm tra mạng, URL HTTPS và trạng thái dịch vụ provider." };
  return { kind: "unknown", title: "Provider từ chối yêu cầu", detail, action: "Kiểm tra API key, quyền model và endpoint trong Provider rồi thử lại." };
}
