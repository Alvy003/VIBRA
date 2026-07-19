package com.vibra.mobile.widget

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.updateAll
import com.doublesymmetry.trackplayer.service.MusicService
import kotlinx.coroutines.*


object MusicServiceConnection {
    private const val TAG = "VibraWidgetActions"

    suspend fun execute(context: Context, action: (MusicService) -> Unit) {
        Log.d(TAG, "MusicServiceConnection.execute called")
        val intent = Intent(context, MusicService::class.java)
        val deferredService = CompletableDeferred<MusicService>()
        
        val connection = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
                Log.d(TAG, "onServiceConnected. ComponentName: $name")
                if (binder != null) {
                    Log.d(TAG, "Binder class name: ${binder.javaClass.name}")
                    val interfaces = binder.javaClass.interfaces.joinToString { it.name }
                    Log.d(TAG, "Binder interfaces: $interfaces")
                    Log.d(TAG, "Binder superclass: ${binder.javaClass.superclass?.name}")
                } else {
                    Log.d(TAG, "Binder is null!")
                }

                val musicBinder = binder as? MusicService.MusicBinder
                if (musicBinder != null) {
                    Log.d(TAG, "Successfully cast binder to MusicService.MusicBinder")
                    deferredService.complete(musicBinder.service)
                } else {
                    val msg = "Could not cast binder to MusicService.MusicBinder. Binder is $binder"
                    Log.e(TAG, msg)
                    deferredService.completeExceptionally(Exception(msg))
                }
            }

            override fun onServiceDisconnected(name: ComponentName?) {
                Log.d(TAG, "onServiceDisconnected. ComponentName: $name")
            }
        }

        try {
            Log.d(TAG, "Attempting to bindService. Intent: $intent")
            val bound = context.applicationContext.bindService(intent, connection, Context.BIND_AUTO_CREATE)
            Log.d(TAG, "bindService return value: $bound")
            if (bound) {
                // Wait up to 1.5 seconds for service connection
                Log.d(TAG, "Waiting for service connection...")
                val service = withTimeoutOrNull(1500) {
                    deferredService.await()
                }
                if (service != null) {
                    Log.d(TAG, "Service obtained successfully. Executing action.")
                    withContext(Dispatchers.Main) {
                        action(service)
                    }
                } else {
                    Log.w(TAG, "Timeout waiting for service connection. Launching app.")
                    launchApp(context)
                }
            } else {
                Log.e(TAG, "Binding failed (bindService returned false). Launching app.")
                launchApp(context)
            }
        } catch (t: Throwable) {
            Log.e(TAG, "Exception during bindService/execution", t)
            launchApp(context)
        } finally {
            try {
                Log.d(TAG, "Unbinding service connection")
                context.applicationContext.unbindService(connection)
            } catch (e: Exception) {
                Log.w(TAG, "Error unbinding service", e)
            }
        }
    }

    private fun launchApp(context: Context) {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            Log.d(TAG, "Launching app fallback...")
            launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(launchIntent)
        } else {
            Log.e(TAG, "Could not get launch intent for package: ${context.packageName}")
        }
    }

    fun updateWidgetState(context: Context, service: MusicService, isPlayingOverride: Boolean? = null) {
        val targetContext = context.applicationContext
        val prefs = targetContext.getSharedPreferences("vibra_widget_prefs", Context.MODE_PRIVATE)
        val currentTitle = prefs.getString("title", "") ?: ""
        val currentArtist = prefs.getString("artist", "") ?: ""
        val currentArtworkUri = prefs.getString("artworkUri", "") ?: ""
        val currentIsPlaying = prefs.getBoolean("isPlaying", false)

        val targetIsPlaying = isPlayingOverride ?: service.playWhenReady
        var newTitle = currentTitle
        var newArtist = currentArtist
        var newArtworkUri = currentArtworkUri

        try {
            val currentTrack = service.currentTrack
            if (currentTrack != null) {
                newTitle = currentTrack.title ?: ""
                newArtist = currentTrack.artist ?: ""
                newArtworkUri = currentTrack.artwork?.toString() ?: ""
            }
        } catch (e: Exception) {
            // No current track metadata available
        }

        val hasChanges = newTitle != currentTitle ||
                         newArtist != currentArtist ||
                         newArtworkUri != currentArtworkUri ||
                         targetIsPlaying != currentIsPlaying

        if (!hasChanges) return

        prefs.edit().run {
            putString("title", newTitle)
            putString("artist", newArtist)
            putString("artworkUri", newArtworkUri)
            putBoolean("isPlaying", targetIsPlaying)
            commit()
        }

        kotlinx.coroutines.MainScope().launch {
            try {
                VibraWidget().updateAll(targetContext)
            } catch (e: Exception) {
                Log.e(TAG, "Error updating widget", e)
            }
        }
    }
}

class PlayPauseCallback : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        Log.d("VibraWidgetActions", "PlayPauseCallback.onAction triggered")
        MusicServiceConnection.execute(context) { service ->
            try {
                val isPlayingNow = service.playWhenReady
                Log.d("VibraWidgetActions", "PlayPauseCallback: service.playWhenReady = $isPlayingNow")
                if (isPlayingNow) {
                    service.pause()
                } else {
                    service.play()
                }
                MusicServiceConnection.updateWidgetState(context, service, isPlayingOverride = !isPlayingNow)
            } catch (t: Throwable) {
                Log.e("VibraWidgetActions", "Error playing/pausing", t)
                // Launch app if player is uninitialized
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (launchIntent != null) {
                    launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    context.startActivity(launchIntent)
                }
            }
        }
    }
}

class NextCallback : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        Log.d("VibraWidgetActions", "NextCallback.onAction triggered")
        MusicServiceConnection.execute(context) { service ->
            try {
                Log.d("VibraWidgetActions", "NextCallback calling service.skipToNext()")
                service.skipToNext()
                MusicServiceConnection.updateWidgetState(context, service)
            } catch (t: Throwable) {
                Log.e("VibraWidgetActions", "Error skipping to next", t)
                // Launch app if player is uninitialized
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (launchIntent != null) {
                    launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    context.startActivity(launchIntent)
                }
            }
        }
    }
}

class PreviousCallback : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        Log.d("VibraWidgetActions", "PreviousCallback.onAction triggered")
        MusicServiceConnection.execute(context) { service ->
            try {
                Log.d("VibraWidgetActions", "PreviousCallback calling service.skipToPrevious()")
                service.skipToPrevious()
                MusicServiceConnection.updateWidgetState(context, service)
            } catch (t: Throwable) {
                Log.e("VibraWidgetActions", "Error skipping to previous", t)
                // Launch app if player is uninitialized
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (launchIntent != null) {
                    launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    context.startActivity(launchIntent)
                }
            }
        }
    }
}
