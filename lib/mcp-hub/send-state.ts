export function getSendState(draft: string, sending: boolean): { canSend: boolean; message: string | null } {
  if (sending) return { canSend: false, message: "Đang chờ phản hồi từ provider." };
  if (!draft.trim()) return { canSend: false, message: "Nhập nội dung trước khi gửi." };
  return { canSend: true, message: null };
}
