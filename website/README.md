# MCP Hub website

Website được tách hoàn toàn trong thư mục `website/`. Lệnh Vercel ở root chỉ cài dependency và build thư mục này; mã Expo/Android không được chạy trong quá trình deploy website.

```bash
cd website
npm run build
```
