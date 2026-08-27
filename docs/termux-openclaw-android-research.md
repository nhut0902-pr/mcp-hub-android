# Termux và OpenClaw trên Android

## Termux

Termux có thể nhận yêu cầu chạy lệnh từ ứng dụng Android khác thông qua `RUN_COMMAND Intent`. Cách này chỉ hoạt động khi người dùng đã cài Termux, tự bật `allow-external-apps=true`, và cấp quyền `com.termux.permission.RUN_COMMAND` cho ứng dụng gửi. Android 11+ còn yêu cầu khai báo package visibility; các lệnh foreground có thể cần quyền "Draw over other apps" của Termux.

MCP Hub không thể nhúng hay sao chép runtime Termux vào APK. Tab Terminal cần mô tả trung thực việc lệnh sẽ được chuyển sang **Termux đã cài đặt** qua intent, chỉ sau khi người dùng chủ động bật tích hợp. Trong giai đoạn Expo hiện tại, app sẽ cung cấp màn lệnh/nhật ký, code assistant và hướng dẫn setup; native module là yêu cầu bắt buộc để thực thi RUN_COMMAND và nhận output đầy đủ.

## OpenClaw

Tài liệu Android chính thức của OpenClaw mô tả app Android là **companion node**, không host Gateway; một OpenClaw Gateway phải đang chạy ngoài Android (macOS, Linux, hoặc WSL2) và được pair. Vì vậy không được quảng cáo rằng MCP Hub có thể cài/chạy Gateway OpenClaw trực tiếp trên điện thoại. MCP Hub có thể hỗ trợ một profile Provider/Gateway OpenClaw để kết nối endpoint do người dùng vận hành, lưu API key an toàn và chạy qua MCP hoặc API tương thích.

Mã nguồn Android chính thức cũng xác nhận ứng dụng kết nối tới Gateway cho chat, voice, approval và khả năng thiết bị. Nó không thay đổi giới hạn kiến trúc này.

## Quyết định triển khai

Tab Terminal mới sẽ là giao diện theo phong cách terminal: lịch sử, trạng thái lệnh, copy, xoá, khởi động Termux và Code Assistant. Terminal không được giả lập một shell Android. Bản APK sẽ có phần tích hợp Termux ở trạng thái nhận diện và hướng dẫn; việc gửi `RUN_COMMAND Intent` với output callback hoàn chỉnh cần native Android module vì Expo JavaScript không thể gọi Android service trực tiếp. Profile **ClawLink Gateway** sẽ là tên hiển thị mới dành cho kết nối OpenClaw, dùng logo riêng của MCP Hub thay vì logo gốc.

## Nguồn

1. https://github.com/termux/termux-app/wiki/RUN_COMMAND-Intent
2. https://docs.openclaw.ai/platforms/android
3. https://github.com/openclaw/openclaw/tree/main/apps/android
4. https://raw.githubusercontent.com/termux/termux-app/master/termux-shared/src/main/java/com/termux/shared/termux/TermuxConstants.java
