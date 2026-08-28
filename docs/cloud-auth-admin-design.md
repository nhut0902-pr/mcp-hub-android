# Thiết kế đăng nhập Cloud và quản trị

## Mục tiêu

Nhutbot 1.0 Flash chỉ phục vụ sau khi người dùng đăng nhập. Terminal, MCP, provider BYOK và Flashcard đã tạo vẫn tiếp tục dùng được khi chưa đăng nhập. Khu vực quản trị chỉ hiện cho `role = admin` do backend xác thực.

## Luồng truy cập

| Bước | Thành phần | Trách nhiệm |
|---|---|---|
| 1 | Ứng dụng Android | Hiển thị trang đăng nhập; dùng OAuth hiện hữu và SecureStore cho session. |
| 2 | API MCP Hub | `protectedProcedure` xác thực session, đọc role/quyền Cloud từ server và chỉ khi hợp lệ mới cấp capability token ngắn hạn. |
| 3 | Proxy Vercel | Xác minh capability token trước `/api/models` và `/api/chat`; không chấp nhận request anonymous. |
| 4 | Admin | `adminProcedure` quản lý người dùng, bật/tắt quyền Nhutbot và xem trạng thái service mà không hiển thị khóa upstream. |

Capability token không dùng session JWT trực tiếp. Nó mang quyền tối thiểu, thời hạn ngắn và cần secret ký/xác minh giống nhau ở API MCP Hub và Vercel. Vercel không thể tin role từ client cache; role phải được xác nhận server-side.

## Rà soát nguồn và giới hạn

URL Python `indygreg` người dùng gửi đã redirect sang Astral nhưng artifact Android cũ trả `Not Found`. Release hiện hành hiển thị artifact Apple/Linux, không có `aarch64-linux-android` trong danh sách đang công bố. Bootstrap Termux đã có `curl`, `apt` và `pkg`; `SYMLINKS.txt` tạo `libtermux-exec.so` từ `libtermux-exec-ld-preload.so`, vì vậy Terminal phải nạp đúng shim này. Tài liệu Termux xác nhận `termux-exec` là shared library dùng qua `LD_PRELOAD` để thực thi shebang/môi trường Terminal. [1] [2] [3]

## Tài liệu tham khảo

[1]: https://github.com/astral-sh/python-build-standalone/releases "Astral Python Build Standalone releases"
[2]: https://github.com/termux/termux-exec-package "Termux Exec Package"
[3]: https://wiki.termux.com/wiki/Termux-exec "Termux-exec documentation"
[4]: https://open.manus.ai/docs/v2/authentication "Manus API Authentication"
[5]: https://manus.im/docs/website-builder/access-control "Manus Access Control"
