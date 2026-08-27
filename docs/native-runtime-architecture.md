# Kiến trúc native Terminal và ClawLink

## Mục tiêu và phạm vi bảo toàn

MCP Hub hiện có vẫn là ứng dụng chính: Chat, MCP, Provider, AI Math, OAuth, cập nhật APK và lưu trữ bảo mật không bị thay thế. Terminal và ClawLink được đưa vào như hai tab độc lập, gọi qua local Expo native module `McpHubRuntime`; mọi lỗi runtime phải chỉ hiện trong hai tab này, không làm ngắt Chat hay MCP.

## Terminal tích hợp

Terminal sẽ dùng session PTY, terminal emulator/view và dải phím phụ (`ESC`, `CTRL`, `ALT`, `TAB`, mũi tên) từ source Android đã rà soát. Session chạy trong sandbox riêng của ứng dụng tại `filesDir/runtime`, không dùng shell hệ thống Android và không yêu cầu cài Termux. Bootstrap Linux tối thiểu được giải nén tại lần cài engine đầu tiên và trạng thái/nhật ký được phát về React Native qua event của native module.

Bootstrap Termux không có layout `data/data/com.termux/files/...` theo từng file như installer sơ bộ từng giả định: archive cần giải nén nguyên cấu trúc `bin/`, `lib/`, `usr/`, `SYMLINKS.txt` vào staging prefix, thực thi danh sách symlink sau khi thay `com.termux` bằng package ID hiện tại, và đánh dấu ELF/binary cần thiết là executable. `libtermux-exec.so` chỉ hỗ trợ rewrite đường dẫn tại `execve`; nó không làm việc với mọi thao tác `open/opendir`. Vì vậy mọi đường dẫn state/config phải được cấu hình trực tiếp theo prefix app-private. Không hạ HTTPS hay tắt kiểm tra xác thực package manager để “dễ cài”.

## ClawLink Gateway

ClawLink là gateway chạy cục bộ trên điện thoại. Native module sẽ kiểm tra ABI arm64, dung lượng trống, tải bootstrap/Node/OpenClaw theo artifact có phiên bản cố định và SHA-256, giải nén vào sandbox, rồi chạy `openclaw gateway` qua session nền được giữ bằng foreground service. Thẻ trạng thái thể hiện chính xác từng bước: chưa cài, đang tải, đang giải nén, đang cấu hình, đang chạy, lỗi hoặc đã dừng. Không dùng `curl | bash`, không chạy script không kiểm tra, không công bố token hoặc API key.

Metadata đã ghi nhận cho bản thử nghiệm arm64: Termux bootstrap `bootstrap-2026.02.12-r1+apt.android-7/bootstrap-aarch64.zip`, SHA-256 `ea2aeba8819e517db711f8c32369e89e7c52cee73e07930ff91185e1ab93f4f3`; Node.js `v22.23.2-linux-arm64.tar.xz`, SHA-256 `013b59cfd2819703a6f4a14ab891fc46fc2a4e3f5bcd92de3fb4929b43e35b30`. NPM metadata hiện hành của OpenClaw yêu cầu Node `>=22.22.3 <23` (hoặc các nhánh Node 24/25 được hỗ trợ), nên Node 22.23.2 đáp ứng điều kiện tối thiểu. Gói OpenClaw phải được pin version và kiểm tra integrity từ registry ở thời điểm người dùng bấm cài đặt, không lấy `latest` mù quáng.

OpenClaw `2026.7.1-2` từ npm có tarball `https://registry.npmjs.org/openclaw/-/openclaw-2026.7.1-2.tgz`, integrity `sha512-ycF3yPcbjN6bUPeaUx6Mh6vze1hQWoD3CT/wWcmD7a8xaHHHRUaAlaq+lFxMHf1ssEgODVAwjlzYqp2twkYZ7g==` và unpacked size khoảng 87 MB. Cài đặt npm tiêu chuẩn của OpenClaw cần cho phép rõ ràng lifecycle script của chính package, nên không thể gọi qua `curl | bash` hay cài “im lặng”. Tài liệu OpenClaw chính thức vẫn công bố Android là companion node và yêu cầu Gateway ở máy khác; ClawLink là implementation cục bộ thử nghiệm, không được ghi là tính năng Android chính thức cho đến khi test trên thiết bị thành công.

## Giấy phép và nguồn gốc

Không chép toàn bộ `termux-app` GPLv3 vào MCP Hub. Mọi đoạn terminal được vendored phải có nguồn gốc/notice rõ ràng; nếu thành phần cần GPL thì phải phân phối MCP Hub theo GPLv3 và kèm source tương ứng. Dự án `AidanPark/openclaw-android` là MIT nhưng có thành phần terminal từ hệ sinh thái Termux; cần giữ notice và kiểm tra bản quyền từng mô-đun trước khi build release. OpenClaw và Node runtime là các gói riêng, có giấy phép/phiên bản cần lập danh mục trong NOTICE.

## Thử nghiệm bắt buộc

Trước phát hành phải kiểm tra trên Android arm64 thật: tạo session terminal, nhập/xuất lệnh, huỷ session, tải dở rồi tiếp tục, kiểm tra SHA-256, start/stop/restart foreground service, chuyển tab khi Gateway chạy, và bảo đảm toàn bộ Chat/MCP/Provider cũ vẫn dùng được.

## Nguồn

1. https://github.com/termux/termux-app
2. https://github.com/AidanPark/openclaw-android
3. https://docs.expo.dev/workflow/customizing/
