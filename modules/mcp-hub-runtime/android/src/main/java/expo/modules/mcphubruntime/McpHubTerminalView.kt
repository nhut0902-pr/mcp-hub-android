package expo.modules.mcphubruntime

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Color
import android.util.TypedValue
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import android.widget.FrameLayout
import androidx.annotation.NonNull
import com.termux.terminal.TerminalSession
import com.termux.terminal.TerminalSessionClient
import com.termux.view.TerminalView
import com.termux.view.TerminalViewClient
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import java.io.File
import kotlin.math.roundToInt

/**
 * React Native container around the vendored TerminalView. It creates an actual PTY backed by
 * Android's /system/bin/sh until a verified runtime bootstrap is installed in app-private storage.
 */
class McpHubTerminalView(context: Context, @Suppress("UNUSED_PARAMETER") appContext: AppContext) : FrameLayout(context) {
  val onSessionState by EventDispatcher<Map<String, Any>>()

  private val terminalView = TerminalView(context, null)
  private var activeSession: TerminalSession? = null
  private var pendingCommand: String? = null
  private var terminalFontSize = 14

  init {
    setBackgroundColor(Color.rgb(12, 18, 25))
    terminalView.setBackgroundColor(Color.rgb(12, 18, 25))
    terminalView.setTextSize(terminalFontSize)
    terminalView.setTerminalViewClient(ViewClient())
    addView(terminalView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    post { ensureSession() }
  }

  fun setPendingCommand(command: String?) {
    pendingCommand = command?.trim()?.takeIf { it.isNotEmpty() }
  }

  fun runPendingCommand() {
    val command = pendingCommand ?: return
    ensureSession()
    activeSession?.write(command)
    activeSession?.write("\r")
    emit("running", "Đã gửi lệnh vào phiên PTY cục bộ.")
  }

  fun setTerminalFontSize(fontSize: Int) {
    terminalFontSize = fontSize.coerceIn(10, 24)
    terminalView.setTextSize(terminalFontSize)
  }

  private fun ensureSession() {
    if (activeSession != null) return

    val runtimeRoot = File(context.filesDir, "runtime")
    val home = File(runtimeRoot, "home")
    val tmp = File(runtimeRoot, "tmp")
    home.mkdirs()
    tmp.mkdirs()

    val prefix = File(runtimeRoot, "usr")
    val runtimeShell = File(prefix, "bin/bash").takeIf { it.canExecute() } ?: File(prefix, "bin/sh")
    val shell = if (runtimeShell.canExecute()) runtimeShell.absolutePath else "/system/bin/sh"
    val nativeExec = File(prefix, "lib/libtermux-exec.so")
    val environment = mutableListOf(
      "HOME=${home.absolutePath}",
      "PREFIX=${prefix.absolutePath}",
      "TMPDIR=${tmp.absolutePath}",
      "PATH=${prefix.absolutePath}/bin:${prefix.absolutePath}/bin/applets:/system/bin:/system/xbin",
      "LD_LIBRARY_PATH=${prefix.absolutePath}/lib",
      "TERMUX__PREFIX=${prefix.absolutePath}",
      "TERMUX_PREFIX=${prefix.absolutePath}",
      "TERMUX__ROOTFS=${runtimeRoot.absolutePath}",
      "TERMUX_APP__DATA_DIR=${context.filesDir.parentFile?.absolutePath ?: context.filesDir.absolutePath}",
      "TERMUX_APP__LEGACY_DATA_DIR=/data/data/com.termux",
      "APT_CONFIG=${prefix.absolutePath}/etc/apt/apt.conf",
      "DPKG_ADMINDIR=${prefix.absolutePath}/var/lib/dpkg",
      "DPKG_ROOT=${prefix.absolutePath}",
      "TERM=xterm-256color",
      "LANG=C.UTF-8",
    ).apply {
      if (nativeExec.canRead()) add("LD_PRELOAD=${nativeExec.absolutePath}")
    }.toTypedArray()

    activeSession = TerminalSession(
      shell,
      home.absolutePath,
      arrayOf("-l"),
      environment,
      4_000,
      SessionClient(),
    )
    terminalView.attachSession(activeSession)
    terminalView.requestFocus()
    emit("ready", "Terminal PTY nội bộ đã sẵn sàng.")
  }

  private fun emit(state: String, detail: String) {
    post { onSessionState(mapOf("state" to state, "detail" to detail)) }
  }

  private inner class SessionClient : TerminalSessionClient {
    override fun onTextChanged(@NonNull changedSession: TerminalSession) { post { terminalView.invalidate() }; Unit }
    override fun onTitleChanged(@NonNull changedSession: TerminalSession) = Unit
    override fun onSessionFinished(@NonNull finishedSession: TerminalSession) = emit("stopped", "Phiên terminal đã kết thúc.")
    override fun onCopyTextToClipboard(@NonNull session: TerminalSession, text: String) {
      val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
      clipboard.setPrimaryClip(ClipData.newPlainText("MCP Hub terminal", text))
    }
    override fun onPasteTextFromClipboard(session: TerminalSession?) {
      val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
      val text = clipboard.primaryClip?.getItemAt(0)?.coerceToText(context)?.toString() ?: return
      session?.write(text)
    }
    override fun onBell(@NonNull session: TerminalSession) = Unit
    override fun onColorsChanged(@NonNull session: TerminalSession) { post { terminalView.invalidate() }; Unit }
    override fun onTerminalCursorStateChange(state: Boolean) { post { terminalView.invalidate() }; Unit }
    override fun setTerminalShellPid(@NonNull session: TerminalSession, pid: Int) = Unit
    override fun getTerminalCursorStyle(): Int? = null
    override fun logError(tag: String, message: String) = emit("error", "$tag: $message")
    override fun logWarn(tag: String, message: String) = Unit
    override fun logInfo(tag: String, message: String) = Unit
    override fun logDebug(tag: String, message: String) = Unit
    override fun logVerbose(tag: String, message: String) = Unit
    override fun logStackTraceWithMessage(tag: String, message: String, e: Exception) = emit("error", "$tag: $message")
    override fun logStackTrace(tag: String, e: Exception) = emit("error", "$tag: ${e.message ?: "lỗi không xác định"}")
  }

  private inner class ViewClient : TerminalViewClient {
    override fun onScale(scale: Float): Float {
      val previous = terminalFontSize
      val target = (previous * scale).roundToInt().coerceIn(10, 24)
      terminalFontSize = target
      terminalView.setTextSize(target)
      return target.toFloat() / previous
    }
    override fun onSingleTapUp(e: MotionEvent) { terminalView.requestFocus() }
    override fun shouldBackButtonBeMappedToEscape() = false
    override fun shouldEnforceCharBasedInput() = false
    override fun getInputMode() = 0
    override fun shouldUseCtrlSpaceWorkaround() = false
    override fun isTerminalViewSelected() = terminalView.hasFocus()
    override fun copyModeChanged(copyMode: Boolean) = Unit
    override fun onKeyDown(keyCode: Int, e: KeyEvent, session: TerminalSession) = false
    override fun onKeyUp(keyCode: Int, e: KeyEvent) = false
    override fun onLongPress(event: MotionEvent) = false
    override fun readControlKey() = false
    override fun readAltKey() = false
    override fun readShiftKey() = false
    override fun readFnKey() = false
    override fun onCodePoint(codePoint: Int, ctrlDown: Boolean, session: TerminalSession): Boolean {
      session.writeCodePoint(ctrlDown, codePoint)
      return true
    }
    override fun onEmulatorSet() { post { terminalView.invalidate() }; Unit }
    override fun logError(tag: String, message: String) = emit("error", "$tag: $message")
    override fun logWarn(tag: String, message: String) = Unit
    override fun logInfo(tag: String, message: String) = Unit
    override fun logDebug(tag: String, message: String) = Unit
    override fun logVerbose(tag: String, message: String) = Unit
    override fun logStackTraceWithMessage(tag: String, message: String, e: Exception) = emit("error", "$tag: $message")
    override fun logStackTrace(tag: String, e: Exception) = emit("error", "$tag: ${e.message ?: "lỗi không xác định"}")
  }
}
