import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";

import { UPDATE_MANIFEST_URL, isNewerVersion, parseAppUpdate, type AppUpdate } from "./app-update-manifest";

export { APP_VERSION, UPDATE_MANIFEST_URL, isNewerVersion, parseAppUpdate, type AppUpdate } from "./app-update-manifest";

export async function checkForAppUpdate(fetcher: typeof fetch = fetch): Promise<AppUpdate | null> {
  const response = await fetcher(UPDATE_MANIFEST_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Không thể kiểm tra cập nhật (HTTP ${response.status}).`);
  const update = parseAppUpdate(await response.json());
  if (!update) throw new Error("Thông tin cập nhật không hợp lệ.");
  return isNewerVersion(update.version) ? update : null;
}

export async function downloadAndInstallAppUpdate(update: AppUpdate, onProgress?: (progress: number) => void): Promise<void> {
  if (Platform.OS !== "android") throw new Error("Tự cập nhật APK hiện chỉ hỗ trợ Android.");
  const target = `${FileSystem.cacheDirectory}MCP-Hub-v${update.version}.apk`;
  const download = FileSystem.createDownloadResumable(update.apkUrl, target, {}, (event) => {
    if (event.totalBytesExpectedToWrite > 0) onProgress?.(event.totalBytesWritten / event.totalBytesExpectedToWrite);
  });
  const result = await download.downloadAsync();
  if (!result?.uri) throw new Error("Tải APK không hoàn tất. Hãy thử lại bằng Wi‑Fi ổn định.");
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    flags: 1,
    type: "application/vnd.android.package-archive",
  });
}
