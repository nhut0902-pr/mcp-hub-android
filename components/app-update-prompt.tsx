import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";

import { checkForAppUpdate, downloadAndInstallAppUpdate } from "@/lib/mcp-hub/app-update";

export function AppUpdatePrompt() {
  const shown = useRef(false);
  useEffect(() => {
    if (Platform.OS !== "android" || shown.current) return;
    const timer = setTimeout(() => {
      void checkForAppUpdate().then((update) => {
        if (!update || shown.current) return;
        shown.current = true;
        Alert.alert(`Có bản cập nhật V${update.version}`, update.notes, [
          { text: "Để sau", style: "cancel" },
          { text: "Tải và cài", onPress: () => void downloadAndInstallAppUpdate(update).catch((error) => Alert.alert("Không thể cài cập nhật", error instanceof Error ? error.message : "Hãy thử lại sau.")) },
        ]);
      }).catch(() => undefined);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
