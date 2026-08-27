package com.openclaw.android

import android.content.Context

object RuntimeStatusStore {
  private const val PREFS = "mcp_hub_clawlink_runtime"
  private const val KEY_STATE = "state"
  private const val KEY_DETAIL = "detail"
  private const val KEY_UPDATED_AT = "updatedAt"

  fun set(context: Context, state: String, detail: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putString(KEY_STATE, state)
      .putString(KEY_DETAIL, detail)
      .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
      .apply()
  }

  fun snapshot(context: Context): Map<String, Any> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return mapOf(
      "state" to (prefs.getString(KEY_STATE, "not_installed") ?: "not_installed"),
      "detail" to (prefs.getString(KEY_DETAIL, "Runtime cục bộ chưa được cài.") ?: "Runtime cục bộ chưa được cài."),
      "updatedAt" to prefs.getLong(KEY_UPDATED_AT, 0),
      "runtimePath" to "files/runtime",
    )
  }
}
