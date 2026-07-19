package com.vibra.mobile.widget

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

class VibraWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "VibraWidget"

    @ReactMethod
    fun updateWidget(title: String, artist: String, artworkUri: String, isPlaying: Boolean) {
        val context = reactApplicationContext
        
        val prefs = context.getSharedPreferences("vibra_widget_prefs", Context.MODE_PRIVATE)
        val currentTitle = prefs.getString("title", "") ?: ""
        val currentArtist = prefs.getString("artist", "") ?: ""
        val currentArtworkUri = prefs.getString("artworkUri", "") ?: ""
        val currentIsPlaying = prefs.getBoolean("isPlaying", false)

        val hasChanges = title != currentTitle ||
                         artist != currentArtist ||
                         (artworkUri != "KEEP" && artworkUri != currentArtworkUri) ||
                         isPlaying != currentIsPlaying

        if (!hasChanges) return

        prefs.edit().run {
            putString("title", title)
            putString("artist", artist)
            if (artworkUri != "KEEP") {
                putString("artworkUri", artworkUri)
            }
            putBoolean("isPlaying", isPlaying)
            commit()
        }

        MainScope().launch {
            try {
                VibraWidget().updateAll(context)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
