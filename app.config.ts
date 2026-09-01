const foregroundServicePlugin = require("./plugins/foreground-service-plugin");

const config = {
  name: "MCP Hub",
  slug: "mcp-provider-configurator",
  version: "1.0.44",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  // v1.0.23: Changed scheme from `manus${timestamp}` (derived from bundleId
  // `com.app.mcpproviderconfigurator` → `manusmcpproviderconfigurator`) to
  // just `mcphub`. The old scheme leaked the "manus" brand name in OAuth
  // consent screens (Notion, GitHub, Slack, etc. showed
  // "manusmcpproviderconfigurator" as the app requesting access).
  //
  // Single scheme means we lose backward compat with deep links created by
  // v1.0.22 and earlier — but those were only used for one-time OAuth
  // callbacks that are stored per-server, so users just need to re-authorize
  // MCP servers after upgrading. The /mobile-login web auth flow uses the
  // scheme dynamically (app passes ?scheme=mcphub), so login flow works
  // without any migration.
  scheme: "mcphub",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.nhutcoder.mcphub",
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#0F1117",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.nhutcoder.mcphub",
    permissions: ["POST_NOTIFICATIONS", "FOREGROUND_SERVICE", "FOREGROUND_SERVICE_DATA_SYNC", "FOREGROUND_SERVICE_SPECIAL_USE", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "CAMERA", "REQUEST_INSTALL_PACKAGES"],
    intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: "mcphub", host: "mcp-oauth" }, { scheme: "mcphub", host: "auth" }], category: ["BROWSABLE", "DEFAULT"] }],
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
    ["expo-notifications", { enableForegroundService: true, foregroundServiceNotification: { title: "MCP Hub Bot dang chay", body: "Bot dang lang nghe tin nhan moi...", priority: "low", vibrate: false } }],
    ["expo-video", { supportsBackgroundPlayback: true, supportsPictureInPicture: true }],
    ["expo-splash-screen", { image: "./assets/images/splash-icon.png", imageWidth: 200, resizeMode: "contain", backgroundColor: "#F7F8FC", dark: { backgroundColor: "#111827" } }],
    ["expo-build-properties", { android: { buildArchs: ["armeabi-v7a", "arm64-v8a"], minSdkVersion: 24, compileSdkVersion: 36, targetSdkVersion: 36, buildToolsVersion: "36.0.0" } }],
    foregroundServicePlugin,
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    appName: "MCP Hub",
    logoUrl: "/manus-storage/mcp-hub-icon_ca900851.png",
    // v1.0.22+: apiBaseUrl now defaults to the NhutCoder Team web app (Vercel).
    // Previously defaulted to "https://mcpconfig-htxjzuzg.manus.space" (Manus
    // backend) which caused the app to call /api/auth/me on Manus instead of
    // on the web — and Manus returned "Not authenticated" because the JWT
    // is signed with the WEB's AUTH_SECRET, not Manus's sdk session secret.
    // To override for local dev, set EXPO_PUBLIC_API_BASE_URL env var.
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://nhutcoder-team-v2.vercel.app",
    aiCloudProxyUrl: "https://mcp-hub-ai-cloud.vercel.app",
    webAuthUrl: process.env.EXPO_PUBLIC_WEB_AUTH_URL ?? "https://nhutcoder-team-v2.vercel.app",
  },
};

export default config;
