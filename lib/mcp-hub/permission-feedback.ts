export type DevicePermissionFeedback = { title: string; detail: string; action: string; openSettings: boolean };

export function permissionFeedback(tool: "Vị trí" | "Camera", canAskAgain: boolean): DevicePermissionFeedback {
  if (canAskAgain) return { title: `Cần quyền ${tool}`, detail: `Ứng dụng chưa được cấp quyền ${tool}. Hãy chạm công cụ một lần nữa và chọn “Cho phép” trên hộp thoại hệ thống.`, action: "Thử lại", openSettings: false };
  return { title: `Quyền ${tool} đã bị từ chối`, detail: `Hệ điều hành không hiển thị lại hộp thoại quyền ${tool}. Bạn cần mở Cài đặt ứng dụng để bật quyền này.`, action: "Mở cài đặt", openSettings: true };
}
