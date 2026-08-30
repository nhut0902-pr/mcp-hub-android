const rawBundleId = "com.app.mcpproviderconfigurator";
const bundleId = rawBundleId
  .replace(/[-_]/g, ".")
  .replace(/[^a-zA-Z0-9.]/g, "")
  .replace(/\.+/g, ".")
  .replace(/^\.+|\.+$/g, "")
  .toLowerCase()
  .split(".")
  .map((segment) => (/^[a-zA-Z]/.test(segment) ? segment : `x${segment}`))
  .join(".") || "space.manus.app";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";

const config = {
  name: "MCP Hub",
  slug: "mcp-provider-configurator",
  version: "1.0.21",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: [`manus${timestamp}`, "mcphub"],
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: bundleId,
    permissions: ["POST_NOTIFICATIONS", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "CAMERA", "REQUEST_INSTALL_PACKAGES"],
    intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: `manus${timestamp}`, host: "mcp-oauth" }, { scheme: "mcphub", host: "mcp-oauth" }], category: ["BROWSABLE", "DEFAULT"] }],
  },
  web: { bundler: "metro", output: "static", favicon: "./assets/images/favicon.png" },
  plugins: [
    "expo-router",
    ["expo-web-browser", { experimentalLauncherActivity: true }],
    "expo-document-picker",
    ["expo-secure-store", { configureAndroidBackup: true }],
    ["expo-location", { locationWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location for chat tools." }],
    ["expo-image-picker", { photosPermission: "Allow $(PRODUCT_NAME) to access photos for chat attachments.", cameraPermission: "Allow $(PRODUCT_NAME) to use your camera for chat attachments." }],
    ["expo-audio", { microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone." }],
    ["expo-video", { supportsBackgroundPlayback: true, supportsPictureInPicture: true }],
    ["expo-splash-screen", { image: "./assets/images/splash-icon.png", imageWidth: 200, resizeMode: "contain", backgroundColor: "#F7F8FC", dark: { backgroundColor: "#111827" } }],
    ["expo-build-properties", { android: { buildArchs: ["armeabi-v7a", "arm64-v8a"], minSdkVersion: 24, compileSdkVersion: 36, targetSdkVersion: 36, buildToolsVersion: "36.0.0" } }],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    appName: "MCP Hub",
    logoUrl: "/manus-storage/mcp-hub-icon_ca900851.png",
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://mcpconfig-htxjzuzg.manus.space",
    oauthPortalUrl: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "https://manus.im",
    oauthServerUrl: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "https://api.manus.im",
    appId: process.env.EXPO_PUBLIC_APP_ID ?? "HTXjZUzGMdUDVZZQVvSs4U",
    aiCloudProxyUrl: "https://mcp-hub-ai-cloud.vercel.app",
    webAuthUrl: process.env.EXPO_PUBLIC_WEB_AUTH_URL ?? "https://nhutcoder-team-v2.vercel.app",
    // Legacy Supabase config — kept for backward compatibility but no longer used
    // by the login flow (v1.0.17+ uses NhutCoder Team web auth bridge).
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  },
};

export default config;
