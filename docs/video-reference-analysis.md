# Phân tích video tham chiếu Chatbox

Video cho thấy một ứng dụng chat nền tối, có nhịp thị giác gọn và cấu trúc điều hướng phân cấp. Bản MCP Hub giữ các tính năng cấu hình provider/MCP riêng, nhưng lớp Chat và Settings cần bám theo mô hình sau.

| Khu vực | Thành phần cần tái tạo | Trạng thái mục tiêu |
|---|---|---|
| Chat | Header `Untitled`, đổi tên, tìm kiếm, menu; lời chào; composer và chọn model | Tập trung vào hội thoại, nền `#121212`, surface `#1E1E1E` |
| Tin nhắn | System prompt màu cam, bong bóng user xanh, AI có Markdown, reasoning thu gọn, tác vụ Copy/Edit/Retry/More | Mỗi phản hồi AI có các thao tác rõ ràng |
| Model sheet | Nhóm Advanced/Basic, khóa cho nhóm nâng cao, info và yêu thích | Dữ liệu model ghim hiện có được trình bày theo nhóm |
| Conversation settings | Name, Instruction, sliders Max context/Temperature/Top P, toggle | Lưu cục bộ vào hội thoại hiện tại |
| Attachment/actions | Attach image, select file; Thread history, export, clear | Giữ thêm Location/Map/Camera/MCP của MCP Hub |
| Drawer | Pinned, Chats, New Chat, Create Image, shortcut đáy | Trượt từ trái và có mũi tên đóng |
| Settings | Provider, Default Models, Chat Settings, General Settings, About, Copilots | Hàng cài đặt phân cấp, có mũi tên quay lại |

## Quy ước thị giác

Nền chính dùng `#121212`; bề mặt dùng `#1E1E1E`; xanh dương là hành động chính; cam biểu thị system prompt; đỏ dùng cho hành động huỷ dữ liệu. Tiêu đề ở khoảng 18–20sp, nội dung chat 15–16sp và chú thích 12–14sp. Sheet trượt từ dưới lên với backdrop tối; điều hướng trang đi từ phải sang; drawer đi từ trái sang.

## Phạm vi giữ lại của MCP Hub

Các luồng provider, API key lưu an toàn, model ghim, cấu hình MCP/OAuth, Tools vị trí/bản đồ/camera/ảnh, AI Cloud và báo lỗi provider không bị loại bỏ. Chúng được đặt vào các bề mặt và menu tương ứng với video.
