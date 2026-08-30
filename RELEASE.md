# MCP Hub release pipeline

## APK v1.0.0

Khi tag `v1.0.0` được đẩy lên GitHub, workflow `.github/workflows/release-apk.yml` sẽ tạo Android project Expo, build **debug APK có thể cài đặt**, rồi tự tải nó lên GitHub Release của tag đó.

```bash
git tag v1.0.0
git push github v1.0.0
```

APK sẽ có tên `MCP-Hub-v1.0.0.apk`. Bản này phù hợp để cài thử nội bộ. Nếu phát hành Google Play, hãy thêm keystore release và các secrets ký Android trước khi chuyển workflow sang `assembleRelease`.

## v1.0.17 — NhutCoder Team web auth bridge

Bản này thay thế Supabase Auth bằng NhutCoder Team web auth bridge:

- App mở `https://nhutcoder-team-v2.vercel.app/mobile-login` trong `expo-web-browser`.
- User đăng nhập qua Auth0 (cùng tài khoản với web NhutCoder Team).
- Web mint một one-time token (64 ký tự hex, TTL 5 phút) lưu vào bảng `mobile_auth_tokens`, rồi redirect deep link `mcphub://auth?token=xxx`.
- App bắt redirect, POST token tới backend `/api/auth/web/session` (Bearer).
- Backend gọi web `/api/auth/mobile/verify?token=xxx` để redeem (single-use) và tạo `app_session_id` như cũ.

Các thay đổi:
- `app/login.tsx`: bỏ UI email/password + Supabase, thay bằng nút "Đăng nhập qua NhutCoder Team" + `WebBrowser.openAuthSessionAsync` + `Linking` deep link listener.
- `lib/_core/api.ts`: thêm `establishWebSession()`. `establishSupabaseSession()` vẫn giữ để backward compat (không còn được gọi).
- `lib/supabase-client.ts`: xoá.
- `package.json`: bỏ `@supabase/supabase-js`.
- `server/_core/oauth.ts`: thêm endpoint `POST /api/auth/web/session` (gọi web `/api/auth/mobile/verify`).
- `constants/oauth.ts`: thêm `WEB_AUTH_URL` (mặc định `https://nhutcoder-team-v2.vercel.app`).
- `app.config.ts`: thêm `extra.webAuthUrl`. `supabaseUrl`/`supabasePublishableKey` mặc định rỗng.

Cấu hình môi trường backend (`mcpconfig-htxjzuzg.manus.space`):
- `EXPO_PUBLIC_WEB_AUTH_URL` — URL web NhutCoder Team (mặc định `https://nhutcoder-team-v2.vercel.app`).
- `MCP_HUB_AUTH_SECRET` (tuỳ chọn) — shared secret để web `/api/auth/mobile/verify` yêu cầu backend gửi kèm header `X-Auth-Secret`. Nếu không đặt, verify mở cho bất kỳ ai gọi được.

## Website Vercel

Website nằm riêng tại `website/`. `vercel.json` ở root chỉ chạy `cd website && npm install` và `cd website && npm run build`, sau đó deploy `website/dist`; các tệp Expo/Android không được build trên Vercel.

