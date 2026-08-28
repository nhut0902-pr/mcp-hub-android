# Rà soát nguồn Python standalone cho Terminal Android

Ngày kiểm tra: 28/08/2026.

URL do người dùng cung cấp cho `cpython-3.11.7+20240107-aarch64-linux-android-install_only.tar.gz` đã chuyển từ `indygreg` sang kho `astral-sh` và hiện trả về **Not Found**. Trang release hiện hành của Python Build Standalone có các artifact Apple và Linux nhưng danh sách asset hiển thị không có target `aarch64-linux-android`.

Vì artifact cũ không còn tải được và không có checksum tin cậy từ release hiện hành, ứng dụng không được tự động tải hoặc giải nén URL này. Hướng xử lý là đảm bảo bootstrap Termux đã cài được `curl`/`wget`, dùng repository package manager đã pin checksum cho thư viện thông thường, và chỉ thêm Python standalone khi có URL artifact sống kèm SHA-256 được kiểm chứng.

Nguồn kiểm tra:

- https://github.com/astral-sh/python-build-standalone/releases/download/20240107/cpython-3.11.7+20240107-aarch64-linux-android-install_only.tar.gz
- https://github.com/astral-sh/python-build-standalone/releases
