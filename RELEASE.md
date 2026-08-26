# MCP Hub release pipeline

## APK v1.0.0

Khi tag `v1.0.0` được đẩy lên GitHub, workflow `.github/workflows/release-apk.yml` sẽ tạo Android project Expo, build **debug APK có thể cài đặt**, rồi tự tải nó lên GitHub Release của tag đó.

```bash
git tag v1.0.0
git push github v1.0.0
```

APK sẽ có tên `MCP-Hub-v1.0.0.apk`. Bản này phù hợp để cài thử nội bộ. Nếu phát hành Google Play, hãy thêm keystore release và các secrets ký Android trước khi chuyển workflow sang `assembleRelease`.

## Website Vercel

Website nằm riêng tại `website/`. `vercel.json` ở root chỉ chạy `cd website && npm install` và `cd website && npm run build`, sau đó deploy `website/dist`; các tệp Expo/Android không được build trên Vercel.
