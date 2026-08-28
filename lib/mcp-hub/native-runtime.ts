import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

export type ClawLinkRuntimeStatus = {
  state: "not_installed" | "installing" | "ready" | "running" | "stopped" | "error";
  detail: string;
  updatedAt: number;
  runtimePath: string;
  packageToolsReady?: boolean;
};

type McpHubRuntimeNativeModule = {
  getRuntimeStatus(): ClawLinkRuntimeStatus;
  installTerminalBootstrap(): Promise<ClawLinkRuntimeStatus>;
  repairTerminalBootstrap(): Promise<ClawLinkRuntimeStatus>;
  installGatewayRuntime(): Promise<ClawLinkRuntimeStatus>;
  startGatewayService(): ClawLinkRuntimeStatus;
  stopGatewayService(): ClawLinkRuntimeStatus;
  getGatewayLog(): string;
  getGatewaySetupLog(): string;
};

export type NativeRuntimeProbe = {
  platform: string;
  executionEnvironment: string;
  bridgeAvailable: boolean;
  expectedInThisRuntime: boolean;
};

/**
 * Resolves on demand instead of permanently caching an early lookup. This lets a development
 * build retry after Expo's JSI bridge completes while web and Expo Go remain safely unavailable.
 */
export function resolveMcpHubRuntime(): McpHubRuntimeNativeModule | null {
  if (Platform.OS !== "android") return null;
  return requireOptionalNativeModule<McpHubRuntimeNativeModule>("McpHubRuntime");
}

/** Backward-compatible snapshot for older consumers. */
export const mcpHubRuntime = resolveMcpHubRuntime();

export const hasNativeMcpHubRuntime = Boolean(mcpHubRuntime);

export function getNativeRuntimeProbe(runtime = resolveMcpHubRuntime()): NativeRuntimeProbe {
  const executionEnvironment = Constants.executionEnvironment ?? "unknown";
  return {
    platform: Platform.OS,
    executionEnvironment,
    bridgeAvailable: Boolean(runtime),
    expectedInThisRuntime: Platform.OS === "android" && executionEnvironment !== "storeClient",
  };
}
