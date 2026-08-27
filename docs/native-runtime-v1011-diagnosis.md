# Chẩn đoán Terminal Native V1.0.11

Ngày kiểm tra: 27/08/2026.

APK phát hành `MCP-Hub-v1.0.11.apk` đã được kiểm tra trực tiếp. Gói có `lib/arm64-v8a/libtermux.so` và `lib/armeabi-v7a/libtermux.so`. Bytecode `classes3.dex` có `expo.modules.mcphubruntime.McpHubRuntimeModule`, `expo.modules.ExpoModulesPackageList` và `ClawLinkForegroundService`.

Giải mã registry `ExpoModulesPackageList` cho thấy danh sách module có lệnh `const-class ... McpHubRuntimeModule`. Do đó mô-đun không bị thiếu khỏi APK hoặc registry Expo; tệp `android/build/generated/autolinking/autolinking.json` chỉ phản ánh đường React Native package list nên không phải bằng chứng về Expo Module.

Tài liệu Expo xác nhận local module nằm trong `./modules` được Expo Autolinking quét riêng, và custom native code không thể chạy trong Expo Go/web preview. Hướng xử lý V1.0.12 là gọi lại bridge sau khi React runtime sẵn sàng, hiển thị probe môi trường khi bridge không có, và xác minh từ APK Android cài đặt.

Nguồn tham khảo: https://docs.expo.dev/modules/autolinking/ và https://docs.expo.dev/develop/development-builds/introduction/.
