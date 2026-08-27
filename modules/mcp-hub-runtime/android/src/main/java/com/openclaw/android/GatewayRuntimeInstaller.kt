package com.openclaw.android

import android.content.Context
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

/**
 * User-triggered OpenClaw CLI setup. There is no curl pipe or remote shell script: it uses the
 * installed runtime package manager, pins the OpenClaw version, validates its packed tarball's
 * SHA-512 SRI and lets npm verify dependency integrity during the local global install.
 */
class GatewayRuntimeInstaller(private val context: Context) {
  companion object {
    private const val OPENCLAW_VERSION = "2026.7.1-2"
    private const val OPENCLAW_SRI = "sha512-ycF3yPcbjN6bUPeaUx6Mh6vze1hQWoD3CT/wWcmD7a8xaHHHRUaAlaq+lFxMHf1ssEgODVAwjlzYqp2twkYZ7g=="
    private const val MAX_GATEWAY_INSTALL_MS = 12L * 60L * 1000L
  }

  fun install(): Map<String, Any> {
    val prefix = File(context.filesDir, "runtime/usr")
    val bash = File(prefix, "bin/bash").takeIf { it.canExecute() } ?: File(prefix, "bin/sh")
    if (!bash.canExecute()) {
      RuntimeStatusStore.set(context, "error", "Cần cài Terminal bootstrap thành công trước khi cài Gateway.")
      return RuntimeStatusStore.snapshot(context)
    }
    val log = File(context.filesDir, "runtime/logs/clawlink-setup.log").apply { parentFile?.mkdirs(); writeText("") }
    val home = File(context.filesDir, "runtime/home").apply { mkdirs() }
    val dollar = '$'
    val script = """
      set -eu
      export NPM_CONFIG_PREFIX="${dollar}{HOME}/.npm-global"
      export PATH="${dollar}{NPM_CONFIG_PREFIX}/bin:${dollar}{PATH}"
      mkdir -p "${dollar}{NPM_CONFIG_PREFIX}" "${dollar}{HOME}/.clawlink-downloads"
      if ! command -v node >/dev/null 2>&1; then
        pkg update
        pkg install -y nodejs-lts
      fi
      node -e 'const [major,minor,patch]=process.versions.node.split(".").map(Number); if (!(major===22&&minor>=22&&patch>=3) && !(major===24&&minor>=15) && !(major>=25)) process.exit(42)'
      cd "${dollar}{HOME}/.clawlink-downloads"
      archive="${dollar}(npm pack openclaw@$OPENCLAW_VERSION --silent)"
      actual="${dollar}(node -e 'const fs=require("fs"),crypto=require("crypto"); console.log("sha512-"+crypto.createHash("sha512").update(fs.readFileSync(process.argv[1])).digest("base64"))' "${dollar}{archive}")"
      test "${dollar}{actual}" = "$OPENCLAW_SRI"
      npm_major="${dollar}(npm --version | cut -d. -f1)"
      if [ "${dollar}{npm_major}" -ge 12 ]; then
        npm install -g --allow-scripts=openclaw "${dollar}{archive}"
      else
        npm install -g "${dollar}{archive}"
      fi
      openclaw --version
    """.trimIndent()
    return try {
      RuntimeStatusStore.set(context, "installing", "Đang cài Node và OpenClaw $OPENCLAW_VERSION trong runtime cục bộ; tiến trình có thể mất vài phút.")
      val process = ProcessBuilder(bash.absolutePath, "-lc", script)
        .directory(home)
        .redirectErrorStream(true)
        .apply { environment().clear(); environment().putAll(RuntimeEnvironment.build(context)) }
        .start()
      process.inputStream.bufferedReader().useLines { lines -> lines.forEach { append(log, "$it\n") } }
      if (!process.waitFor(MAX_GATEWAY_INSTALL_MS, TimeUnit.MILLISECONDS)) {
        process.destroyForcibly()
        RuntimeStatusStore.set(context, "error", "Cài Gateway quá thời gian chờ; xem nhật ký để biết bước đang dở.")
      } else if (process.exitValue() != 0) {
        RuntimeStatusStore.set(context, "error", "Cài Gateway thất bại (mã ${process.exitValue()}); checksum/sự tương thích hoặc kết nối có thể là nguyên nhân.")
      } else {
        RuntimeStatusStore.set(context, "ready", "Đã cài OpenClaw $OPENCLAW_VERSION trong runtime cục bộ. Mở Terminal để chạy `openclaw onboard`, sau đó quay lại khởi động Gateway.")
      }
      RuntimeStatusStore.snapshot(context)
    } catch (error: Exception) {
      RuntimeStatusStore.set(context, "error", "Không thể chạy cài Gateway: ${error.message ?: "lỗi không xác định"}")
      RuntimeStatusStore.snapshot(context)
    }
  }

  fun readLog(): String {
    val log = File(context.filesDir, "runtime/logs/clawlink-setup.log")
    return if (log.isFile) log.readText().takeLast(12_000) else "Chưa có nhật ký cài Gateway."
  }

  private fun append(file: File, message: String) {
    FileOutputStream(file, true).bufferedWriter().use { it.append(message) }
  }
}
