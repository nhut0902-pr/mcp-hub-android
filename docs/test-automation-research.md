# Nghiên cứu kiểm thử tự động cho MCP Hub

## Giải pháp đã đánh giá

| Công cụ | Phù hợp | Điểm dùng cho MCP Hub |
| --- | --- | --- |
| [agent-device](https://github.com/callstack/agent-device) | Cao cho AI agent kiểm thử ứng dụng di động | Cung cấp CLI/MCP để agent đọc accessibility snapshot, thao tác UI, chụp bằng chứng và chạy trên Android/iOS/Expo khi có thiết bị hoặc emulator. Cần Node.js 22.12+ và một target Android/iOS khả dụng. |
| [Maestro](https://github.com/mobile-dev-inc/maestro) | Cao cho E2E có thể lặp lại | Hỗ trợ React Native/Expo qua accessibility, dùng YAML flow và testID ổn định. Cần Android emulator, iOS simulator hoặc thiết bị thực để chạy flow native. |

## Quyết định

MCP Hub sẽ tiếp tục duy trì kiểm thử Vitest/TypeScript/lint trong sandbox. Khi có Android emulator hoặc thiết bị được kết nối, ưu tiên **agent-device** cho AI-driven exploratory verification và xuất flow thành Maestro YAML cho regression E2E. Sandbox hiện không có `adb` hoặc Android emulator, nên không thể thực thi E2E native tại chỗ.

## Nguồn

- https://github.com/callstack/agent-device
- https://docs.maestro.dev/get-started/supported-platform/react-native
- https://github.com/mobile-dev-inc/maestro
