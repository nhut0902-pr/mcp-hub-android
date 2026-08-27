import type { ViewProps } from "react-native";
import { Platform } from "react-native";
import { requireNativeViewManager } from "expo-modules-core";

export type TerminalStateEvent = { state: "ready" | "running" | "stopped" | "error"; detail: string };

export type McpHubTerminalViewProps = ViewProps & {
  command?: string;
  commandNonce?: number;
  fontSize?: number;
  onSessionState?: (event: { nativeEvent: TerminalStateEvent }) => void;
};

const NativeTerminal = Platform.OS === "web"
  ? null
  : requireNativeViewManager<McpHubTerminalViewProps>("McpHubRuntime");

export function McpHubTerminalView(props: McpHubTerminalViewProps) {
  if (!NativeTerminal) return null;
  return <NativeTerminal {...props} />;
}
