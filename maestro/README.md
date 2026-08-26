# Kiểm thử E2E di động

## Maestro regression flow

Maestro chạy flow `chat-shell.yaml` trên **Android emulator, thiết bị Android hoặc development build**. Flow xác minh màn hình Chat không bị che khi chưa có model, đồng thời có ô soạn và nút gửi.

```bash
# Cài Maestro theo hướng dẫn chính thức, sau đó:
maestro test maestro/chat-shell.yaml
```

`testID` được dùng cho các thành phần lõi (`chat-screen`, `chat-input`, `chat-send`) để flow không phụ thuộc vào ngôn ngữ hiển thị.

## Agent Device cho AI-driven QA

Dự án tham khảo [callstack/agent-device](https://github.com/callstack/agent-device): công cụ mã nguồn mở cho AI agent đọc accessibility snapshot, thao tác Android/Expo và lưu screenshot/log làm bằng chứng. Sau khi có Android emulator hoặc thiết bị kết nối qua ADB:

```bash
npm install -g agent-device@latest
agent-device doctor
agent-device open com.app.mcpproviderconfigurator --platform android
agent-device snapshot -i
agent-device close
```

Sandbox hiện không có `adb` hay Android emulator, vì vậy không thể chạy E2E native trong môi trường này. Bộ Vitest, TypeScript và lint vẫn được chạy tại chỗ cho mọi thay đổi.
