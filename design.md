# Thiết kế giao diện — MCP Hub

## Mục tiêu trải nghiệm

MCP Hub là công cụ cấu hình cục bộ cho người dùng kỹ thuật. Ứng dụng ưu tiên thao tác bằng một tay trên màn hình dọc 9:16: các hành động chính nằm trong vùng ngón cái, dữ liệu kỹ thuật dài được rút gọn hợp lý, và mọi thay đổi nhạy cảm đều có phản hồi trạng thái rõ ràng. Giao diện bám theo tinh thần iOS HIG với hệ phân cấp chữ rõ ràng, card nhẹ, vùng chạm tối thiểu 44 pt và không che nội dung bởi thanh điều hướng.

## Danh sách màn hình

| Màn hình | Nội dung chính | Chức năng |
| --- | --- | --- |
| Tổng quan | Số provider đang bật, số model đã lưu, thời điểm đồng bộ gần nhất và lời nhắc cấu hình | Điều hướng nhanh tới provider và đồng bộ toàn bộ |
| Provider | Danh sách Nvidia NIM, Groq, OpenRouter và provider tùy chỉnh; trạng thái kích hoạt, endpoint và số model | Bật/tắt, mở chi tiết, thêm provider ngoài |
| Chi tiết provider | Biểu mẫu tên, API base URL, model URL, API key, header tuỳ chỉnh và nút kiểm tra kết nối | Lưu cấu hình, đồng bộ model, xoá provider ngoài |
| Model | Bộ lọc theo provider, danh sách model, mã model và thời gian cập nhật | Tìm kiếm, sao chép model ID và xem nguồn provider |
| MCP | Danh sách cấu hình MCP server gồm tên, transport, URL/command và trạng thái | Thêm, chỉnh sửa, bật/tắt hoặc xoá cấu hình MCP cục bộ |
| Cài đặt | Thông tin lưu trữ, xuất cấu hình JSON và xoá dữ liệu cục bộ | Quản lý dữ liệu trên thiết bị |

## Luồng người dùng chính

Người dùng mở **Tổng quan**, chạm vào provider có sẵn, nhập API key và URL endpoint nếu cần, rồi chọn **Đồng bộ model**. Ứng dụng gọi endpoint model URL, chuẩn hoá các định dạng phản hồi phổ biến, lưu danh sách model cục bộ và hiển thị kết quả trên tab **Model**. API key không xuất hiện lại dưới dạng văn bản sau khi lưu.

Để thêm nguồn ngoài, người dùng mở tab **Provider**, chọn **Thêm provider**, đặt tên, nhập API base URL và URL danh sách model, sau đó lưu. Provider mới xuất hiện trong danh sách và có thể đồng bộ độc lập. Để cấu hình MCP, người dùng vào tab **MCP**, thêm server qua HTTP/SSE hoặc stdio, bật cấu hình mong muốn và lưu trên máy.

## Lựa chọn màu sắc

| Vai trò | Màu | Lý do sử dụng |
| --- | --- | --- |
| Nền chính | `#F7F8FC` | Bề mặt sáng, trung tính cho nội dung kỹ thuật dài |
| Bề mặt/card | `#FFFFFF` | Tạo phân tầng nhẹ, phù hợp màn hình cấu hình |
| Navy chủ đạo | `#162E5C` | Tạo cảm giác đáng tin cậy cho thao tác cấu hình hệ thống |
| Cyan nhấn | `#0B9EC9` | Nhận diện thao tác đồng bộ và trạng thái tương tác |
| Xanh thành công | `#14804A` | Báo provider kết nối và đồng bộ thành công |
| Cam cảnh báo | `#C2410C` | Báo endpoint chưa hoàn tất hoặc cần kiểm tra |
| Đỏ lỗi | `#C62828` | Diễn đạt lỗi mạng, API và thao tác huỷ |

## Mô hình dữ liệu cục bộ

`ProviderConfig` gồm `id`, `kind`, `name`, `apiBaseUrl`, `modelsUrl`, `enabled`, `lastSyncedAt`, `modelCount` và `headers`. `ModelRecord` gồm `id`, `providerId`, `modelId`, `displayName`, `contextLength` và `updatedAt`. `McpServerConfig` gồm `id`, `name`, `transport`, `endpoint`, `command`, `args`, `enabled` và `updatedAt`. Metadata và danh sách model không nhạy cảm sử dụng AsyncStorage; API key của từng provider dùng kho bảo mật của hệ điều hành trên Android.

## Quy ước tương tác

Nút **Đồng bộ** hiện tiến trình trong lúc gọi endpoint và thông báo chính xác số model đã nạp hoặc lý do thất bại. Các trường URL sử dụng bàn phím URL, kiểm tra `https://` trước khi lưu và không gửi API key tới bất kỳ máy chủ trung gian nào. Ứng dụng chỉ lưu cấu hình MCP trên thiết bị; không thể kết nối trực tiếp đến các công cụ MCP thuộc phiên làm việc của người dùng.
