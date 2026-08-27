package com.openclaw.android

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder

/** Keeps a user-started ClawLink gateway session alive; it does not start a gateway until setup verifies the runtime. */
class ClawLinkForegroundService : Service() {
  companion object {
    private const val CHANNEL_ID = "mcp_hub_clawlink_gateway"
    private const val NOTIFICATION_ID = 731

    fun start(context: Context) {
      val intent = Intent(context, ClawLinkForegroundService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
    }
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIFICATION_ID, createNotification())
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, "ClawLink Gateway", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Giữ phiên Gateway cục bộ do bạn khởi động hoạt động nền"
        setShowBadge(false)
      }
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }

  private fun createNotification(): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, PendingIntent.FLAG_IMMUTABLE)
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID) else Notification.Builder(this)
    return builder
      .setSmallIcon(android.R.drawable.stat_notify_sync)
      .setContentTitle("ClawLink Gateway")
      .setContentText("Runtime cục bộ đang được giữ hoạt động")
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .build()
  }
}
