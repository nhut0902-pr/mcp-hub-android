export type ChatAttachment = {
  id: string;
  type: "image" | "location" | "file";
  label: string;
  uri?: string;
  dataUri?: string;
  textContent?: string;
  mimeType?: string | null;
  size?: number | null;
  latitude?: number;
  longitude?: number;
};

export type ChatMcpProfile = { id: string; name: string; transport: string; endpoint: string };

export function attachmentCaption(attachment: ChatAttachment): string {
  if (attachment.type === "location" && attachment.latitude !== undefined && attachment.longitude !== undefined) return `Vị trí hiện tại: ${attachment.latitude.toFixed(6)}, ${attachment.longitude.toFixed(6)}`;
  if (attachment.type === "file") return `Tệp đính kèm: ${attachment.label}${attachment.mimeType ? ` (${attachment.mimeType})` : ""}${attachment.textContent ? `\n\nNội dung tệp:\n${attachment.textContent}` : "\n\nTệp nhị phân/PDF chưa thể trích xuất trực tiếp. Hãy gửi ảnh từng trang để AI đọc chính xác."}`;
  return `Ảnh đính kèm: ${attachment.label}`;
}

export function toolContext(profiles: ChatMcpProfile[]): string {
  if (!profiles.length) return "";
  return `MCP đang bật trong phiên này: ${profiles.map((profile) => `${profile.name} [${profile.transport}]`).join(", ")}. Khi hệ thống cung cấp function tools tương ứng, hãy gọi tool phù hợp để thực hiện yêu cầu; không nói rằng MCP chỉ dùng làm ngữ cảnh hoặc chưa thể thực thi. Nếu tool trả lỗi xác thực, giải thích lỗi và hướng dẫn người dùng kết nối lại.`;
}
