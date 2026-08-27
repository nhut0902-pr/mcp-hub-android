import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

export type ClawLinkRuntimeStatus = {
  state: "not_installed" | "installing" | "ready" | "running" | "stopped" | "error";
  detail: string;
  updatedAt: number;
  runtimePath: string;
};

type McpHubRuntimeNativeModule = {
  getRuntimeStatus(): ClawLinkRuntimeStatus;
  installTerminalBootstrap(): Promise<ClawLinkRuntimeStatus>;
  installGatewayRuntime(): Promise<ClawLinkRuntimeStatus>;
  startGatewayService(): ClawLinkRuntimeStatus;
  stopGatewayService(): ClawLinkRuntimeStatus;
  getGatewayLog(): string;
  getGatewaySetupLog(): string;
};

/** Android-only bridge. It intentionally resolves to null on web/Expo Go so all old UI has a safe fallback. */
export const mcpHubRuntime: McpHubRuntimeNativeModule | null =
  Platform.OS === "android"
    ? requireOptionalNativeModule<McpHubRuntimeNativeModule>("McpHubRuntime")
    : null;

export const hasNativeMcpHubRuntime = Boolean(mcpHubRuntime);
