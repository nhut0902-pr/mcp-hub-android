# Kiểm tra domain OAuth/API

Ngày 28/08/2026.

Domain `https://mcpconfig-htxjzuzg.manus.space` là domain deployment của project MCP Hub. GET `/` trả nội dung `This site is under maintenance.`; GET `/api/auth/me` trả JSON `{"error":"Not authenticated","user":null}`. Vì vậy domain có route backend auth và có thể là API base root, nhưng trang root đang bảo trì và chưa chứng minh đây là OAuth portal hoặc OAuth server.

Không được tự đặt `EXPO_PUBLIC_OAUTH_PORTAL_URL`, `EXPO_PUBLIC_OAUTH_SERVER_URL` hoặc `EXPO_PUBLIC_APP_ID` theo domain này. API base nếu backend production thực sự dùng domain này thì mã app hiện tại cần nhận root `https://mcpconfig-htxjzuzg.manus.space`, không thêm `/api`; app tự nối các route `/api/...`. Portal/server/App ID cần đối chiếu với cấu hình OAuth backend thực tế.

Nguồn kiểm tra: `https://mcpconfig-htxjzuzg.manus.space/` và `https://mcpconfig-htxjzuzg.manus.space/api/auth/me`.

Kết luận: domain này có thể dùng để thử `EXPO_PUBLIC_API_BASE_URL` sau khi xác nhận deployment production, nhưng chưa thể dùng làm ba giá trị OAuth còn lại.

Chưa kiểm tra bằng token thật hoặc thực hiện đăng nhập/thay đổi dữ liệu.

