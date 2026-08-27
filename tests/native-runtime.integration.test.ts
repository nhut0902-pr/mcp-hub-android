import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const source = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("Native Terminal và ClawLink được tích hợp theo kiểu bổ sung", () => {
  it("giữ fallback Terminal hiện hữu và chỉ dùng native view trên Android khi module có mặt", () => {
    const terminal = source("app/(tabs)/terminal.tsx");
    expect(terminal).toContain('Platform.OS === "android" && hasNativeMcpHubRuntime');
    expect(terminal).toContain("McpHubTerminalView");
    expect(terminal).toContain("Code Assistant");
  });

  it("có route ClawLink và các điểm truy cập cạnh Terminal/Provider", () => {
    expect(source("app/(tabs)/_layout.tsx")).toContain('name="clawlink"');
    expect(source("app/(tabs)/chat.tsx")).toContain('router.push("/clawlink" as never)');
    expect(source("app/(tabs)/providers.tsx")).toContain('navigation.push("/clawlink" as never)');
  });

  it("pin bootstrap và OpenClaw package, đồng thời không dùng shell script tải-rồi-chạy", () => {
    const bootstrap = source("modules/mcp-hub-runtime/android/src/main/java/com/openclaw/android/RuntimeInstaller.kt");
    const gateway = source("modules/mcp-hub-runtime/android/src/main/java/com/openclaw/android/GatewayRuntimeInstaller.kt");
    expect(bootstrap).toContain("BOOTSTRAP_SHA256");
    expect(bootstrap).toContain("private fun sha256");
    expect(bootstrap).toContain("canonicalFile");
    expect(gateway).toContain("OPENCLAW_SRI");
    expect(gateway).toContain("npm pack openclaw@");
    expect(gateway).not.toMatch(/curl\s.*\|\s*(bash|sh)/i);
  });
});
