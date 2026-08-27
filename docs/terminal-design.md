# Thiết kế Terminal Android

## Mục tiêu

Terminal là một tab độc lập; không còn chiếm không gian trong Chat. Nó tập hợp ba loại hoạt động dưới cùng một lịch sử: lệnh Terminal được chuẩn bị cho Termux, lời gọi MCP và phản hồi của Code Assistant. Từng mục ghi rõ nguồn thực thi, thời gian và trạng thái để không gây hiểu nhầm rằng ứng dụng tự có shell Android.

## Luồng chính

Người dùng nhập một lệnh, chọn **Chạy trong Termux**, sau đó app kiểm tra hướng dẫn tích hợp. Khi không có native bridge, app chỉ cung cấp lệnh có thể sao chép và nút mở Termux; nó không báo giả rằng lệnh đã chạy. Người dùng cũng có thể đưa mô tả lỗi/lệnh vào Code Assistant để nhận giải thích, lệnh tiếp theo hoặc mã mẫu. Nhấn **MCP tools** chuyển vào bảng công cụ MCP đã kết nối.

## An toàn và khả năng

Lệnh phải hiện nguyên văn trước khi mở Termux. Các lệnh đặc biệt nguy hiểm như xoá đệ quy, `sudo`, ghi đè đĩa, tải/rồi chạy mã từ mạng được đánh dấu đỏ. Phiên bản Expo hiện không có native module chạy Android Service; các nút Termux sẽ mở ứng dụng Termux/hướng dẫn thiết lập và lưu nhật ký cục bộ. Sau khi thêm native module, chỉ lệnh người dùng xác nhận mới được gửi qua `RUN_COMMAND`, với output callback hiển thị trong tab.

## OpenClaw

Provider mang tên hiển thị **ClawLink Gateway**, sử dụng logo riêng. Đây là profile endpoint Gateway do người dùng vận hành, không phải lời hứa chạy Gateway OpenClaw trong MCP Hub. Một card nêu rõ cần pair với Gateway đang chạy bên ngoài hoặc dùng kết nối MCP của Gateway.
