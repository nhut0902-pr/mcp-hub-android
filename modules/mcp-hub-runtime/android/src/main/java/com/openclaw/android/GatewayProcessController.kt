package com.openclaw.android

import android.content.Context
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

/** Process manager for a user-started, locally installed OpenClaw-compatible Gateway. */
object GatewayProcessController {
  private const val LOG_FILE = "clawlink-gateway.log"
  private var activeProcess: Process? = null

  @Synchronized
  fun start(context: Context): Map<String, Any> {
    val running = activeProcess?.takeIf { it.isAlive }
    if (running != null) {
      RuntimeStatusStore.set(context, "running", "ClawLink Gateway đang chạy cục bộ.")
      return RuntimeStatusStore.snapshot(context)
    }
    val cli = RuntimeEnvironment.findGatewayCli(context)
      ?: run {
        RuntimeStatusStore.set(context, "ready", "Terminal runtime đã sẵn sàng nhưng OpenClaw-compatible CLI chưa được cài. Trình cài Gateway có pin package đang được kiểm thử trước khi kích hoạt.")
        return RuntimeStatusStore.snapshot(context)
      }
    return try {
      val environment = RuntimeEnvironment.build(context)
      val root = File(context.filesDir, "runtime")
      val log = logFile(context).apply { parentFile?.mkdirs(); writeText("") }
      val process = ProcessBuilder(cli.absolutePath, "gateway", "--port", "18789")
        .directory(File(root, "home"))
        .redirectErrorStream(true)
        .apply { environment().clear(); environment().putAll(environment) }
        .start()
      activeProcess = process
      append(log, "[MCP Hub] Khởi động Gateway bằng ${cli.name}\n")
      RuntimeStatusStore.set(context, "running", "ClawLink Gateway đang khởi động trên cổng 18789 trong runtime cục bộ.")
      drainOutput(context, process, log)
      waitForExit(context, process, log)
      RuntimeStatusStore.snapshot(context)
    } catch (error: Exception) {
      RuntimeStatusStore.set(context, "error", "Không thể khởi động Gateway: ${error.message ?: "lỗi không xác định"}")
      RuntimeStatusStore.snapshot(context)
    }
  }

  @Synchronized
  fun stop(context: Context): Map<String, Any> {
    val process = activeProcess
    activeProcess = null
    if (process?.isAlive == true) {
      process.destroy()
      if (!process.waitFor(3, TimeUnit.SECONDS)) process.destroyForcibly()
    }
    append(logFile(context), "[MCP Hub] Gateway đã được dừng bởi người dùng.\n")
    RuntimeStatusStore.set(context, "stopped", "ClawLink Gateway đã dừng.")
    return RuntimeStatusStore.snapshot(context)
  }

  fun readLog(context: Context): String {
    val log = logFile(context)
    if (!log.isFile) return "Chưa có nhật ký Gateway."
    return log.readText().takeLast(12_000)
  }

  private fun drainOutput(context: Context, process: Process, log: File) {
    Thread {
      process.inputStream.bufferedReader().useLines { lines -> lines.forEach { append(log, "$it\n") } }
    }.apply { name = "ClawLinkGatewayOutput"; isDaemon = true; start() }
  }

  private fun waitForExit(context: Context, process: Process, log: File) {
    Thread {
      val exit = process.waitFor()
      synchronized(this) { if (activeProcess === process) activeProcess = null }
      append(log, "[MCP Hub] Gateway kết thúc (mã $exit).\n")
      RuntimeStatusStore.set(context, if (exit == 0) "stopped" else "error", if (exit == 0) "Gateway đã dừng." else "Gateway dừng với mã $exit; xem nhật ký để biết chi tiết.")
    }.apply { name = "ClawLinkGatewayWait"; isDaemon = true; start() }
  }

  private fun logFile(context: Context) = File(context.filesDir, "runtime/logs/$LOG_FILE")
  private fun append(file: File, message: String) {
    file.parentFile?.mkdirs()
    FileOutputStream(file, true).bufferedWriter().use { it.append(message) }
  }
}
