# Nghiên cứu OAuth MCP và Composio

## Kết luận triển khai

URL `https://backend.composio.dev/v3/mcp/YOUR_SERVER_ID?user_id=YOUR_USER_ID` là **mẫu endpoint MCP theo từng người dùng**, không thể dùng nguyên văn. Người dùng cần tạo MCP server trong Composio, thay `YOUR_SERVER_ID` bằng server ID của cấu hình đó và dùng một `user_id` ổn định của chính họ. Khi kết nối, Composio yêu cầu header `x-api-key` với Composio API key nếu tùy chọn bắt buộc API key đang bật.

Với MCP HTTP chuẩn, lỗi `401` kèm `WWW-Authenticate` có `resource_metadata` báo rằng máy chủ yêu cầu OAuth. Client cần đọc Protected Resource Metadata, khám phá OAuth/OIDC metadata, dùng PKCE để mở trang đăng nhập, nhận authorization code qua redirect URI, đổi lấy token và gửi token bằng `Authorization: Bearer`. Không phải mọi MCP server đều hỗ trợ đăng ký client động; server có thể cần client ID được đăng ký sẵn hoặc người dùng tự cung cấp.

## Thiết kế trong MCP Hub

MCP Hub sẽ luôn kiểm tra kết nối đầu tiên. Nếu nhận diện OAuth chuẩn, UI giải thích nguyên nhân, mở trang đăng nhập trong trình duyệt và chỉ hoàn tất sau khi callback trả về token. Nếu server không công bố metadata/OAuth chuẩn, app sẽ hướng dẫn phương thức riêng (API key hoặc token thủ công) thay vì hứa hẹn tự đăng nhập. Thực thi tool trong Chat phải gọi `tools/list` để lấy schema và `tools/call` qua phiên MCP đã xác thực; tool mang tính thay đổi dữ liệu cần màn hình xác nhận trước khi gọi.

Với Composio, có hai cách không nên lẫn lộn. Preset MCP hiện tại yêu cầu người dùng tạo sẵn MCP server, cung cấp URL theo user và API key của chính project; đây không tự tạo kết nối Gmail/GitHub/Slack. Để cung cấp đăng nhập một chạm, app cần một backend giữ Composio API key, tạo Connect Link cho **user ID ổn định**, sau đó mở `redirect_url` cho người dùng. Composio lưu và làm mới token của connected account, không trả OAuth token cho app. Vì MCP Hub hiện không sở hữu API key Composio của mỗi người dùng, app sẽ hướng dẫn đúng quy trình và chỉ kích hoạt Connect Link sau khi người dùng kết nối project Composio của họ một cách bảo mật.

Đối với các MCP không phải Composio, tính năng đăng nhập tự mở chỉ có thể hoạt động nếu server công bố OAuth metadata và chấp nhận một public client của MCP Hub (qua Client ID Metadata hoặc Dynamic Client Registration). Các server dùng OAuth riêng, API key, hoặc không hỗ trợ đăng ký động vẫn cần thông tin cấu hình do nhà cung cấp phát hành. UI phải hiển thị rõ tình huống này thay vì dán token thủ công hoặc tuyên bố “chỉ nhập URL là xong”.

## Nguồn

1. [Model Context Protocol — Authorization tutorial](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/authorization)
2. [Model Context Protocol — Authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
3. [Composio — Single Toolkit MCP](https://docs.composio.dev/docs/single-toolkit-mcp)
4. [Composio — Glossary](https://docs.composio.dev/reference/glossary)
