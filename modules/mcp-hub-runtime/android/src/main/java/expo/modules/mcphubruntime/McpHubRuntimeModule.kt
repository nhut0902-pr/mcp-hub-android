package expo.modules.mcphubruntime

import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.openclaw.android.ClawLinkForegroundService
import com.openclaw.android.GatewayProcessController
import com.openclaw.android.GatewayRuntimeInstaller
import com.openclaw.android.RuntimeInstaller
import com.openclaw.android.RuntimeStatusStore

class McpHubRuntimeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("McpHubRuntime")

    View(McpHubTerminalView::class) {
      Events("onSessionState")
      Prop("command") { view: McpHubTerminalView, command: String? ->
        view.setPendingCommand(command)
      }
      Prop("commandNonce") { view: McpHubTerminalView, nonce: Int? ->
        if (nonce != null) view.runPendingCommand()
      }
      Prop("restartNonce") { view: McpHubTerminalView, nonce: Int? ->
        if (nonce != null) view.restartSession(nonce)
      }
      Prop("fontSize") { view: McpHubTerminalView, fontSize: Double? ->
        if (fontSize != null) view.setTerminalFontSize(fontSize.toInt())
      }
    }

    Function("getRuntimeStatus") {
      RuntimeInstaller(requireContext()).runtimeStatus()
    }

    AsyncFunction("installTerminalBootstrap") {
      RuntimeInstaller(requireContext()).installTerminalBootstrap()
    }.runOnQueue(Queues.DEFAULT)

    AsyncFunction("repairTerminalBootstrap") {
      RuntimeInstaller(requireContext()).installTerminalBootstrap(force = true)
    }.runOnQueue(Queues.DEFAULT)

    AsyncFunction("installGatewayRuntime") {
      GatewayRuntimeInstaller(requireContext()).install()
    }.runOnQueue(Queues.DEFAULT)

    Function("startGatewayService") {
      val context = requireContext()
      val result = GatewayProcessController.start(context)
      if (result["state"] == "running") ClawLinkForegroundService.start(context)
      result
    }

    Function("stopGatewayService") {
      val context = requireContext()
      GatewayProcessController.stop(context)
      context.stopService(Intent(context, ClawLinkForegroundService::class.java))
      RuntimeStatusStore.snapshot(context)
    }

    Function("getGatewayLog") { GatewayProcessController.readLog(requireContext()) }

    Function("getGatewaySetupLog") { GatewayRuntimeInstaller(requireContext()).readLog() }
  }

  private fun requireContext(): Context =
    appContext.reactContext ?: throw IllegalStateException("Android context chưa sẵn sàng")
}
