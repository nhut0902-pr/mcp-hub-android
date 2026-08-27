package com.openclaw.android

import android.content.Context
import java.io.File

object RuntimeEnvironment {
  fun build(context: Context): Map<String, String> {
    val root = File(context.filesDir, "runtime")
    val prefix = File(root, "usr")
    val home = File(root, "home").apply { mkdirs() }
    val tmp = File(root, "tmp").apply { mkdirs() }
    val env = linkedMapOf(
      "HOME" to home.absolutePath,
      "PREFIX" to prefix.absolutePath,
      "TMPDIR" to tmp.absolutePath,
      "PATH" to "${File(home, ".npm-global/bin").absolutePath}:${prefix.absolutePath}/bin:${prefix.absolutePath}/bin/applets:/system/bin:/system/xbin",
      "LD_LIBRARY_PATH" to "${prefix.absolutePath}/lib",
      "TERM" to "xterm-256color",
      "LANG" to "C.UTF-8",
      "TERMUX__PREFIX" to prefix.absolutePath,
      "TERMUX_PREFIX" to prefix.absolutePath,
      "TERMUX__ROOTFS" to root.absolutePath,
      "TERMUX_APP__DATA_DIR" to (context.filesDir.parentFile?.absolutePath ?: context.filesDir.absolutePath),
      "TERMUX_APP__LEGACY_DATA_DIR" to "/data/data/com.termux",
      "APT_CONFIG" to "${prefix.absolutePath}/etc/apt/apt.conf",
      "DPKG_ADMINDIR" to "${prefix.absolutePath}/var/lib/dpkg",
      "DPKG_ROOT" to prefix.absolutePath,
      "SSL_CERT_FILE" to "${prefix.absolutePath}/etc/tls/cert.pem",
      "CURL_CA_BUNDLE" to "${prefix.absolutePath}/etc/tls/cert.pem",
      "GIT_CONFIG_NOSYSTEM" to "1",
    )
    val termuxExec = File(prefix, "lib/libtermux-exec.so")
    if (termuxExec.canRead()) env["LD_PRELOAD"] = termuxExec.absolutePath
    return env
  }

  fun findGatewayCli(context: Context): File? {
    val root = File(context.filesDir, "runtime")
    val home = File(root, "home")
    val prefix = File(root, "usr")
    return listOf(
      File(home, ".npm-global/bin/openclaw"),
      File(home, ".local/bin/openclaw"),
      File(prefix, "bin/openclaw"),
    ).firstOrNull { it.isFile && it.canExecute() }
  }
}
