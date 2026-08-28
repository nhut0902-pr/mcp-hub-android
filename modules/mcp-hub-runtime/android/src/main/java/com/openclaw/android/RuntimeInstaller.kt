package com.openclaw.android

import android.content.Context
import android.system.Os
import android.os.Build
import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.TimeUnit
import java.util.zip.ZipInputStream

/**
 * Installs only a pinned terminal bootstrap. It intentionally does not invoke shell installers,
 * fetch an unpinned npm package, or claim OpenClaw Gateway readiness. A later Gateway stage must
 * separately verify a Bionic-compatible Node/runtime chain and its licenses.
 */
class RuntimeInstaller(private val context: Context) {
  companion object {
    private const val BOOTSTRAP_URL = "https://github.com/termux/termux-packages/releases/download/bootstrap-2026.02.12-r1%2Bapt.android-7/bootstrap-aarch64.zip"
    private const val BOOTSTRAP_SHA256 = "ea2aeba8819e517db711f8c32369e89e7c52cee73e07930ff91185e1ab93f4f3"
    private const val BOOTSTRAP_SIZE = 30_542_758L
    private const val MIN_FREE_SPACE = 180L * 1024L * 1024L
    private const val MAX_DOWNLOAD_SIZE = 64L * 1024L * 1024L
  }

  fun runtimeStatus(): Map<String, Any> {
    val prefix = File(context.filesDir, "runtime/usr")
    return RuntimeStatusStore.snapshot(context) + mapOf("packageToolsReady" to isRuntimeStructurallyReady(prefix))
  }

  fun installTerminalBootstrap(force: Boolean = false): Map<String, Any> {
    val abi = Build.SUPPORTED_ABIS.firstOrNull().orEmpty()
    if (!Build.SUPPORTED_ABIS.contains("arm64-v8a")) {
      return fail("Thiết bị $abi chưa được hỗ trợ; bootstrap nội bộ hiện chỉ hỗ trợ arm64-v8a.")
    }
    val root = context.filesDir
    if (root.usableSpace < MIN_FREE_SPACE) {
      return fail("Không đủ dung lượng trống. Cần tối thiểu ${MIN_FREE_SPACE / 1024 / 1024} MB trước khi cài runtime.")
    }
    val runtime = File(root, "runtime").apply { mkdirs() }
    val prefix = File(runtime, "usr")
    if (!force && isRuntimeStructurallyReady(prefix)) {
      RuntimeStatusStore.set(context, "ready", "Terminal bootstrap đã tồn tại trong thư mục riêng của MCP Hub.")
      return runtimeStatus()
    }

    val downloads = File(context.cacheDir, "clawlink-downloads").apply { mkdirs() }
    val archive = File(downloads, "bootstrap-aarch64.zip")
    val part = File(downloads, "bootstrap-aarch64.zip.part")
    val staging = File(runtime, "usr-staging-${UUID.randomUUID()}")

    var backup: File? = null
    var activated = false
    try {
      if (prefix.exists()) RuntimeStatusStore.set(context, "installing", "Đang sửa runtime Terminal hiện có trước khi kiểm tra package tools.")
      RuntimeStatusStore.set(context, "installing", "Đang tải terminal bootstrap qua HTTPS (${BOOTSTRAP_SIZE / 1024 / 1024} MB).")
      downloadPinnedArchive(part)
      if (!sha256(part).equals(BOOTSTRAP_SHA256, ignoreCase = true)) {
        part.delete()
        return fail("Checksum bootstrap không khớp; tệp tải đã bị loại bỏ.")
      }
      if (!part.renameTo(archive)) {
        part.copyTo(archive, overwrite = true)
        part.delete()
      }

      RuntimeStatusStore.set(context, "installing", "Đã kiểm tra checksum; đang giải nén an toàn vào vùng staging.")
      safeExtractTermuxFiles(archive, staging, prefix)
      val shell = File(staging, "bin/bash").takeIf { it.isFile } ?: File(staging, "bin/sh")
      require(shell.isFile) { "Bootstrap thiếu bin/bash hoặc bin/sh sau khi giải nén." }
      configureAppPrivatePaths(staging, prefix)
      rewriteTermuxScriptPaths(staging, prefix)
      require(File(staging, "bin/pkg").isFile) { "Bootstrap thiếu lệnh pkg sau khi giải nén." }
      markExecutableTree(staging)
      require(File(staging, "lib/libtermux-exec.so").isFile) { "Bootstrap thiếu shim libtermux-exec.so cần cho pkg/curl." }

      RuntimeStatusStore.set(context, "installing", "Đang kích hoạt runtime trong vùng riêng của MCP Hub.")
      backup = File(runtime, "usr-backup-${UUID.randomUUID()}")
      if (prefix.exists()) require(prefix.renameTo(backup)) { "Không thể bảo toàn prefix runtime cũ trước khi cập nhật." }
      if (!staging.renameTo(prefix)) {
        backup?.renameTo(prefix)
        error("Không thể kích hoạt runtime vừa giải nén.")
      }
      activated = true
      verifyPackageTools(prefix)
      backup?.deleteRecursively()
      RuntimeStatusStore.set(context, "ready", "Terminal bootstrap, pkg và curl đã được kiểm tra trong files/runtime/usr. Gateway chưa được cài.")
      return runtimeStatus()
    } catch (error: Exception) {
      staging.deleteRecursively()
      if (activated && prefix.exists()) prefix.deleteRecursively()
      if (backup?.exists() == true && !prefix.exists()) backup?.renameTo(prefix)
      return fail(error.message ?: "Không thể cài hoặc kiểm tra terminal bootstrap.")
    }
  }

  private fun downloadPinnedArchive(destination: File) {
    val connection = (URL(BOOTSTRAP_URL).openConnection() as HttpURLConnection).apply {
      instanceFollowRedirects = true
      connectTimeout = 20_000
      readTimeout = 45_000
      requestMethod = "GET"
      setRequestProperty("Accept", "application/zip")
    }
    try {
      connection.connect()
      require(connection.url.protocol.equals("https", ignoreCase = true)) { "Nguồn bootstrap không sử dụng HTTPS." }
      require(connection.responseCode in 200..299) { "Tải bootstrap thất bại (HTTP ${connection.responseCode})." }
      val contentLength = connection.contentLengthLong
      require(contentLength <= MAX_DOWNLOAD_SIZE || contentLength == -1L) { "Kích thước bootstrap vượt giới hạn an toàn." }
      BufferedInputStream(connection.inputStream).use { input ->
        FileOutputStream(destination).use { output ->
          val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
          var total = 0L
          while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            total += read
            require(total <= MAX_DOWNLOAD_SIZE) { "Tải bootstrap vượt giới hạn an toàn." }
            output.write(buffer, 0, read)
          }
        }
      }
    } finally {
      connection.disconnect()
    }
  }

  private fun safeExtractTermuxFiles(archive: File, staging: File, finalPrefix: File) {
    val canonicalRoot = staging.canonicalFile
    staging.mkdirs()
    ZipInputStream(BufferedInputStream(archive.inputStream())).use { zip ->
      while (true) {
        val entry = zip.nextEntry ?: break
        val name = entry.name.replace('\\', '/')
        if (name == "SYMLINKS.txt") {
          processSymlinks(zip, staging, canonicalRoot, finalPrefix)
          zip.closeEntry()
          continue
        }
        if (name.startsWith("/") || name.contains("../")) {
          zip.closeEntry()
          continue
        }
        if (name.isBlank()) {
          zip.closeEntry()
          continue
        }
        val target = File(staging, name).canonicalFile
        require(target.path == canonicalRoot.path || target.path.startsWith("${canonicalRoot.path}${File.separator}")) { "Đường dẫn archive không an toàn." }
        if (entry.isDirectory) {
          target.mkdirs()
        } else {
          target.parentFile?.mkdirs()
          FileOutputStream(target).use { output -> zip.copyTo(output) }
        }
        zip.closeEntry()
      }
    }
  }

  private fun markExecutableTree(directory: File) {
    directory.walkTopDown().filter { it.isFile }.forEach { file ->
      val relative = file.relativeTo(directory).path.replace('\\', '/')
      if (relative.startsWith("bin/") || relative.startsWith("libexec/") || relative.endsWith(".so") || relative.contains(".so.")) {
        file.setExecutable(true, false)
      }
    }
  }

  private fun processSymlinks(zip: ZipInputStream, staging: File, canonicalRoot: File, finalPrefix: File) {
    zip.bufferedReader().readLines().forEach { line ->
      val parts = line.split("←", limit = 2)
      if (parts.size != 2) return@forEach
      val target = parts[0].trim().replace("/data/data/com.termux/files/usr", finalPrefix.absolutePath).replace("com.termux", context.packageName)
      val path = parts[1].trim().replace('\\', '/')
      if (path.isBlank() || path.startsWith("/") || path.contains("../")) return@forEach
      val link = File(staging, path).canonicalFile
      require(link.path.startsWith("${canonicalRoot.path}${File.separator}")) { "Symlink bootstrap có đường dẫn không an toàn." }
      link.parentFile?.mkdirs()
      try { Os.symlink(target, link.absolutePath) } catch (_: Exception) { /* Existing/unsupported link is validated by shell check later. */ }
    }
  }

  private fun configureAppPrivatePaths(staging: File, finalPrefix: File) {
    val appDataDir = context.filesDir.parentFile?.absolutePath ?: context.filesDir.absolutePath
    val runtimeRoot = finalPrefix.parentFile ?: context.filesDir
    val home = File(runtimeRoot, "home").apply { mkdirs() }
    val packageCache = File(context.cacheDir, "termux").apply { mkdirs() }
    val oldPrefix = "/data/data/com.termux/files/usr"
    val status = File(staging, "var/lib/dpkg/status")
    if (status.isFile) {
      try { status.writeText(status.readText().replace(oldPrefix, finalPrefix.absolutePath)) } catch (_: Exception) { }
    }
    val aptDir = File(staging, "etc/apt").apply { mkdirs() }
    File(staging, "var/lib/apt").mkdirs()
    File(staging, "var/cache/apt").mkdirs()
    File(staging, "var/log/apt").mkdirs()
    File(staging, "var/lib/dpkg").mkdirs()
    File(packageCache, "apt/archives").mkdirs()
    File(aptDir, "apt.conf").writeText(
      """
      Dir "/";
      Dir::State "${finalPrefix.absolutePath}/var/lib/apt/";
      Dir::State::status "${finalPrefix.absolutePath}/var/lib/dpkg/status";
      Dir::Cache "${finalPrefix.absolutePath}/var/cache/apt/";
      Dir::Log "${finalPrefix.absolutePath}/var/log/apt/";
      Dir::Etc "${finalPrefix.absolutePath}/etc/apt/";
      Dir::Etc::SourceList "${finalPrefix.absolutePath}/etc/apt/sources.list";
      Dir::Etc::SourceParts "";
      Dir::Bin::dpkg "${finalPrefix.absolutePath}/bin/dpkg";
      Dir::Bin::Methods "${finalPrefix.absolutePath}/lib/apt/methods/";
      """.trimIndent(),
    )
    val environment = File(staging, "etc/profile.d/mcp-hub-runtime.sh")
    environment.parentFile?.mkdirs()
    environment.writeText(
      """# MCP Hub app-private runtime environment
      export PREFIX="${finalPrefix.absolutePath}"
      export HOME="${File(runtimeRoot, "home").absolutePath}"
      export TMPDIR="${File(runtimeRoot, "tmp").absolutePath}"
      export TERMUX__PREFIX="${finalPrefix.absolutePath}"
      export TERMUX_PREFIX="${finalPrefix.absolutePath}"
      export TERMUX__ROOTFS="${runtimeRoot.absolutePath}"
      export TERMUX_APP__DATA_DIR="$appDataDir"
      export TERMUX_APP__LEGACY_DATA_DIR="/data/data/com.termux"
      export TERMUX_APP_PACKAGE_MANAGER="apt"
      export TERMUX_MAIN_PACKAGE_FORMAT="debian"
      export APT_CONFIG="${finalPrefix.absolutePath}/etc/apt/apt.conf"
      export DPKG_ADMINDIR="${finalPrefix.absolutePath}/var/lib/dpkg"
      export DPKG_ROOT="${finalPrefix.absolutePath}"
      """.trimIndent(),
    )
  }

  /** Rewrites only UTF-8 shebang scripts; ELF/binary files are deliberately never modified. */
  private fun rewriteTermuxScriptPaths(staging: File, finalPrefix: File) {
    val oldPrefix = "/data/data/com.termux/files/usr"
    val oldHome = "/data/data/com.termux/files/home"
    val oldCache = "/data/data/com.termux/cache"
    val runtimeRoot = finalPrefix.parentFile ?: context.filesDir
    val replacements = listOf(
      oldPrefix to finalPrefix.absolutePath,
      oldHome to File(runtimeRoot, "home").absolutePath,
      oldCache to File(context.cacheDir, "termux").absolutePath,
      "/data/data/com.termux" to (context.filesDir.parentFile?.absolutePath ?: context.filesDir.absolutePath),
    )
    staging.walkTopDown().filter { it.isFile && it.length() <= 512 * 1024 }.forEach { file ->
      val bytes = try { file.readBytes() } catch (_: Exception) { return@forEach }
      if (bytes.size < 2 || bytes[0] != '#'.code.toByte() || bytes[1] != '!'.code.toByte() || bytes.any { it == 0.toByte() }) return@forEach
      val original = bytes.toString(Charsets.UTF_8)
      val rewritten = replacements.fold(original) { value, (from, to) -> value.replace(from, to) }
      if (rewritten != original) file.writeText(rewritten)
    }
  }

  private fun isRuntimeStructurallyReady(prefix: File): Boolean {
    val shell = File(prefix, "bin/bash").takeIf { it.canExecute() } ?: File(prefix, "bin/sh")
    val shim = File(prefix, "lib/libtermux-exec.so")
    return shell.canExecute() && File(prefix, "bin/pkg").canExecute() &&
      File(prefix, "bin/curl").canExecute() && shim.isFile && shim.canRead()
  }

  /** Runs local read-only checks before package commands are exposed to the user. */
  private fun verifyPackageTools(prefix: File) {
    require(isRuntimeStructurallyReady(prefix)) { "Runtime thiếu bash, pkg, curl hoặc libtermux-exec.so." }
    val shell = File(prefix, "bin/bash").takeIf { it.canExecute() } ?: File(prefix, "bin/sh")
    val runtimeRoot = prefix.parentFile ?: context.filesDir
    val home = File(runtimeRoot, "home").apply { mkdirs() }
    val tmp = File(runtimeRoot, "tmp").apply { mkdirs() }
    val process = ProcessBuilder(shell.absolutePath, "-lc", "command -v pkg >/dev/null && command -v curl >/dev/null && pkg --help >/dev/null")
      .directory(home)
      .redirectErrorStream(true)
    val environment = process.environment()
    environment.clear()
    environment["HOME"] = home.absolutePath
    environment["PREFIX"] = prefix.absolutePath
    environment["TMPDIR"] = tmp.absolutePath
    environment["PATH"] = "${prefix.absolutePath}/bin:${prefix.absolutePath}/bin/applets:/system/bin:/system/xbin"
    environment["LD_LIBRARY_PATH"] = "${prefix.absolutePath}/lib"
    environment["LD_PRELOAD"] = File(prefix, "lib/libtermux-exec.so").absolutePath
    environment["TERMUX__PREFIX"] = prefix.absolutePath
    environment["TERMUX_PREFIX"] = prefix.absolutePath
    environment["TERMUX__ROOTFS"] = runtimeRoot.absolutePath
    environment["TERMUX_APP__DATA_DIR"] = context.filesDir.parentFile?.absolutePath ?: context.filesDir.absolutePath
    environment["TERMUX_APP__LEGACY_DATA_DIR"] = "/data/data/com.termux"
    environment["TERMUX_APP_PACKAGE_MANAGER"] = "apt"
    environment["TERMUX_MAIN_PACKAGE_FORMAT"] = "debian"
    environment["APT_CONFIG"] = "${prefix.absolutePath}/etc/apt/apt.conf"
    environment["DPKG_ADMINDIR"] = "${prefix.absolutePath}/var/lib/dpkg"
    environment["DPKG_ROOT"] = prefix.absolutePath
    environment["TERM"] = "xterm-256color"
    environment["LANG"] = "C.UTF-8"
    val started = process.start()
    if (!started.waitFor(8, TimeUnit.SECONDS)) {
      started.destroyForcibly()
      error("Kiểm tra pkg/curl quá thời gian chờ; runtime không được kích hoạt.")
    }
    val output = started.inputStream.bufferedReader().readText().trim().take(280)
    require(started.exitValue() == 0) { "Kiểm tra pkg/curl không đạt${if (output.isNotEmpty()) ": $output" else "."}" }
  }

  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
      val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
      while (true) {
        val read = input.read(buffer)
        if (read < 0) break
        digest.update(buffer, 0, read)
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }

  private fun fail(detail: String): Map<String, Any> {
    RuntimeStatusStore.set(context, "error", detail)
    return runtimeStatus()
  }
}
