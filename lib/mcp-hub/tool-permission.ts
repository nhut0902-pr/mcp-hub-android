/**
 * MCP Tool Call Permission — asks user before executing MCP tools.
 * 
 * v1.0.44: AI must ask permission before calling MCP tools.
 * This prevents AI from automatically running commands without user consent.
 */
import { Alert } from "react-native";
import type { McpProposedCall } from "./mcp-chat";

export type PermissionResult = "allow" | "deny" | "always_allow";

const alwaysAllowedTools = new Set<string>();

export function isToolAlwaysAllowed(toolName: string, serverName: string): boolean {
  return alwaysAllowedTools.has(`${serverName}:${toolName}`);
}

export function setToolAlwaysAllowed(toolName: string, serverName: string): void {
  alwaysAllowedTools.add(`${serverName}:${toolName}`);
}

export function clearAlwaysAllowed(): void {
  alwaysAllowedTools.clear();
}

/**
 * Ask user for permission to execute an MCP tool.
 * Returns true if user allows, false if denied.
 */
export function askToolPermission(call: McpProposedCall): Promise<boolean> {
  // Check if always allowed
  if (isToolAlwaysAllowed(call.name, call.serverName)) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const toolLabel = `${call.serverName} → ${call.name}`;
    const argsSummary = JSON.stringify(call.arguments, null, 2).substring(0, 300);
    
    Alert.alert(
      "🤖 AI muốn gọi MCP tool",
      `Tool: ${toolLabel}\n\nTham số:\n${argsSummary}`,
      [
        { text: "Từ chối", style: "cancel", onPress: () => resolve(false) },
        { text: "Cho phép lần này", onPress: () => resolve(true) },
        { text: "Luôn cho phép", onPress: () => { setToolAlwaysAllowed(call.name, call.serverName); resolve(true); } },
      ]
    );
  });
}

/**
 * Ask permission for a batch of tool calls.
 */
export async function askBatchPermission(calls: McpProposedCall[]): Promise<McpProposedCall[]> {
  const allowed: McpProposedCall[] = [];
  for (const call of calls) {
    const ok = await askToolPermission(call);
    if (ok) allowed.push(call);
  }
  return allowed;
}
