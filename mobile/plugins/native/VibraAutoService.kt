package com.vibra.mobile.auto

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Bundle
import android.os.IBinder
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import androidx.media.MediaBrowserServiceCompat
import com.doublesymmetry.trackplayer.service.MusicService
import com.tencent.mmkv.MMKV
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.delay
import org.json.JSONArray
import org.json.JSONObject

import android.content.pm.ApplicationInfo
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaControllerCompat

class VibraAutoService : MediaBrowserServiceCompat() {

    private lateinit var session: MediaSessionCompat
    private lateinit var mmkv: MMKV
    private val scope = CoroutineScope(Dispatchers.Main)

    private var realController: MediaControllerCompat? = null

    private val controllerCallback = object : MediaControllerCompat.Callback() {
        override fun onPlaybackStateChanged(state: PlaybackStateCompat?) {
            Log.d(TAG, "VibraAutoService: Syncing PlaybackState from real session to local session")
            session.setPlaybackState(state)
        }

        override fun onMetadataChanged(metadata: MediaMetadataCompat?) {
            Log.d(TAG, "VibraAutoService: Syncing Metadata from real session to local session")
            session.setMetadata(metadata)
        }

        override fun onQueueChanged(queue: MutableList<MediaSessionCompat.QueueItem>?) {
            Log.d(TAG, "VibraAutoService: Syncing Queue from real session to local session")
            session.setQueue(queue)
        }

        override fun onQueueTitleChanged(title: CharSequence?) {
            Log.d(TAG, "VibraAutoService: Syncing QueueTitle from real session to local session")
            session.setQueueTitle(title)
        }

        override fun onExtrasChanged(extras: Bundle?) {
            Log.d(TAG, "VibraAutoService: Syncing Extras from real session to local session")
            session.setExtras(extras)
        }

        override fun onRepeatModeChanged(repeatMode: Int) {
            Log.d(TAG, "VibraAutoService: Syncing RepeatMode from real session to local session: $repeatMode")
            session.setRepeatMode(repeatMode)
        }

        override fun onShuffleModeChanged(shuffleMode: Int) {
            Log.d(TAG, "VibraAutoService: Syncing ShuffleMode from real session to local session: $shuffleMode")
            session.setShuffleMode(shuffleMode)
        }
    }

    companion object {
        private const val TAG = "VibraAuto"
        const val ROOT_ID = "vibra_auto_root"
        const val QUEUE_ID = "vibra_auto_queue"
        const val MMKV_KEY_QUEUE = "auto_catalog_queue"
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "VibraAutoService: onCreate called")
        try {
            MMKV.initialize(this)
            Log.d(TAG, "VibraAutoService: MMKV initialized successfully")
            mmkv = MMKV.mmkvWithID("vibra-app-storage")
        } catch (e: Exception) {
            Log.e(TAG, "VibraAutoService: Failed to initialize MMKV", e)
        }

        session = MediaSessionCompat(this, "VibraAuto").apply {
            setCallback(SessionCallback())
            isActive = true
        }
        sessionToken = session.sessionToken
        Log.d(TAG, "VibraAutoService: MediaSessionCompat created and sessionToken set")

        startRealSessionTokenCheck()
        startQueueJsonObserver()
    }

    override fun onDestroy() {
        Log.d(TAG, "VibraAutoService: onDestroy called")
        realController?.unregisterCallback(controllerCallback)
        session.release()
        super.onDestroy()
    }

    // ── MediaBrowserServiceCompat ─────────────────────────────────────────────

    override fun onGetRoot(
        clientPackageName: String,
        clientUid: Int,
        rootHints: Bundle?
    ): BrowserRoot? {
        Log.d(TAG, "VibraAutoService: onGetRoot called by clientPackageName=$clientPackageName, clientUid=$clientUid")
        val allowed = setOf(
            "com.google.android.projection.gearhead",   // Android Auto
            "com.google.android.googlequicksearchbox",  // Google Assistant
            packageName                                  // DHU testing (same package)
        )
        val isDebug = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        val isAllowed = clientPackageName in allowed || isDebug
        Log.d(TAG, "VibraAutoService: onGetRoot returning ${if (isAllowed) "ROOT_ID" else "null"} for $clientPackageName")
        return if (isAllowed) {
            BrowserRoot(ROOT_ID, null)
        } else null
    }

    override fun onLoadChildren(
        parentId: String,
        result: Result<List<MediaBrowserCompat.MediaItem>>
    ) {
        Log.d(TAG, "VibraAutoService: onLoadChildren called for parentId=$parentId")
        result.detach()

        if (!::mmkv.isInitialized) {
            Log.e(TAG, "VibraAutoService: mmkv is not initialized!")
            result.sendResult(emptyList())
            return
        }

        when (parentId) {
            ROOT_ID -> {
                Log.d(TAG, "VibraAutoService: Serving root folder list")
                val desc = MediaDescriptionCompat.Builder()
                    .setMediaId(QUEUE_ID)
                    .setTitle("Current Queue")
                    .setSubtitle("Now playing in Vibra")
                    .build()
                val folder = MediaBrowserCompat.MediaItem(
                    desc,
                    MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
                )
                result.sendResult(listOf(folder))
            }

            QUEUE_ID -> {
                Log.d(TAG, "VibraAutoService: Loading queue from MMKV key=$MMKV_KEY_QUEUE")
                val json = mmkv.decodeString(MMKV_KEY_QUEUE) ?: ""
                Log.d(TAG, "VibraAutoService: MMKV JSON read in native: '$json'")
                val items = parseQueueJson(json)
                Log.d(TAG, "VibraAutoService: onLoadChildren parsed ${items.size} media items from JSON")
                Log.d(TAG, "VibraAutoService: Returning MediaItems to Android Auto: ${items.map { it.description.title }}")
                
                // Temporary reflection debug
                scope.launch {
                    withMusicService { service ->
                        inspectPlayerReflective(service)
                    }
                }
                
                result.sendResult(items)
            }

            else -> {
                Log.w(TAG, "VibraAutoService: Unknown parentId=$parentId, returning empty list")
                result.sendResult(emptyList())
            }
        }
    }

    // ── JSON → MediaItem ──────────────────────────────────────────────────────

    private fun parseQueueJson(json: String): List<MediaBrowserCompat.MediaItem> {
        if (json.isBlank()) {
            Log.d(TAG, "VibraAutoService: parseQueueJson got blank/null JSON")
            return emptyList()
        }
        return try {
            val arr = JSONArray(json)
            val list = mutableListOf<MediaBrowserCompat.MediaItem>()
            Log.d(TAG, "VibraAutoService: parseQueueJson parsing JSONArray of length=${arr.length()}")
            for (i in 0 until arr.length()) {
                val obj: JSONObject = arr.getJSONObject(i)
                val mediaId = obj.optString("mediaId", "")
                val title   = obj.optString("title",   "Unknown Title")
                val artist  = obj.optString("artist",  "Unknown Artist")
                val artwork = obj.optString("artwork",  "")

                if (mediaId.isBlank()) {
                    Log.w(TAG, "VibraAutoService: Skipping blank mediaId at index $i")
                    continue
                }

                val desc = MediaDescriptionCompat.Builder()
                    .setMediaId(mediaId)
                    .setTitle(title)
                    .setSubtitle(artist)
                    .apply {
                        if (artwork.isNotBlank()) {
                            setIconUri(android.net.Uri.parse(artwork))
                        }
                    }
                    .build()

                Log.d(TAG, "VibraAutoService: Parsed item index=$i: mediaId=$mediaId, title=$title, artist=$artist, artwork=$artwork")
                list.add(
                    MediaBrowserCompat.MediaItem(
                        desc,
                        MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
                    )
                )
            }
            list
        } catch (e: Exception) {
            Log.e(TAG, "VibraAutoService: Error parsing queue JSON", e)
            emptyList()
        }
    }

    // ── MediaSession Callback (routing shim) ──────────────────────────────────

    private inner class SessionCallback : MediaSessionCompat.Callback() {

        override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) {
            Log.d(TAG, "VibraAutoService.SessionCallback: onPlayFromMediaId called with mediaId=$mediaId")
            if (mediaId.isNullOrBlank()) {
                Log.e(TAG, "VibraAutoService.SessionCallback: mediaId is null or blank")
                return
            }
            scope.launch {
                withMusicService { service ->
                    val tracks = service.tracks
                    val idToIdx = mutableMapOf<String, Int>()
                    tracks.forEachIndexed { i, t ->
                        val id = t.originalItem?.getString("id")
                        if (id != null) {
                            idToIdx[id] = i
                        }
                    }
                    Log.d(TAG, "VibraAutoService.SessionCallback: Built ID->Index lookup map (size=${idToIdx.size}): $idToIdx")
                    val index = idToIdx[mediaId]
                    if (index != null) {
                        Log.d(TAG, "VibraAutoService.SessionCallback: Found track ID $mediaId mapped to index $index, skipping and playing")
                        service.skip(index)
                        service.play()
                    } else {
                        Log.e(TAG, "VibraAutoService.SessionCallback: Track ID $mediaId not found in map lookup")
                        // Fallback: if it's an integer, try that
                        val fallbackIndex = mediaId.toIntOrNull()
                        if (fallbackIndex != null && fallbackIndex >= 0 && fallbackIndex < tracks.size) {
                            Log.d(TAG, "VibraAutoService.SessionCallback: Skipping to fallback index $fallbackIndex")
                            service.skip(fallbackIndex)
                            service.play()
                        }
                    }
                }
            }
        }

        override fun onPlay() {
            Log.d(TAG, "VibraAutoService.SessionCallback: onPlay called")
            scope.launch {
                withMusicService { service ->
                    Log.d(TAG, "VibraAutoService.SessionCallback: calling play()")
                    service.play()
                }
            }
        }

        override fun onPause() {
            Log.d(TAG, "VibraAutoService.SessionCallback: onPause called")
            scope.launch {
                withMusicService { service ->
                    Log.d(TAG, "VibraAutoService.SessionCallback: calling pause()")
                    service.pause()
                }
            }
        }

        override fun onSkipToNext() {
            Log.d(TAG, "VibraAutoService.SessionCallback: onSkipToNext called")
            scope.launch {
                withMusicService { service ->
                    Log.d(TAG, "VibraAutoService.SessionCallback: calling skipToNext()")
                    service.skipToNext()
                }
            }
        }

        override fun onSkipToPrevious() {
            Log.d(TAG, "VibraAutoService.SessionCallback: onSkipToPrevious called")
            scope.launch {
                withMusicService { service ->
                    Log.d(TAG, "VibraAutoService.SessionCallback: calling skipToPrevious()")
                    service.skipToPrevious()
                }
            }
        }

        override fun onStop() {
            Log.d(TAG, "VibraAutoService.SessionCallback: onStop called")
            scope.launch {
                withMusicService { service ->
                    Log.d(TAG, "VibraAutoService.SessionCallback: calling stop()")
                    service.stop()
                }
            }
        }

        override fun onSeekTo(pos: Long) {
            Log.d(TAG, "VibraAutoService.SessionCallback: onSeekTo called with pos=$pos")
            scope.launch {
                withMusicService { service ->
                    service.seekTo(pos / 1000f)
                }
            }
        }

        override fun onFastForward() {
            Log.d(TAG, "VibraAutoService.SessionCallback: onFastForward called")
            scope.launch {
                withMusicService { service ->
                    service.seekBy(15f)
                }
            }
        }

        override fun onRewind() {
            Log.d(TAG, "VibraAutoService.SessionCallback: onRewind called")
            scope.launch {
                withMusicService { service ->
                    service.seekBy(-15f)
                }
            }
        }
    }

    // ── MusicService Binding (exact MusicServiceConnection pattern) ───────────

    private suspend fun withMusicService(action: (MusicService) -> Unit) {
        Log.d(TAG, "VibraAutoService: withMusicService start binding")
        val intent = Intent(applicationContext, MusicService::class.java)
        val deferred = CompletableDeferred<MusicService>()

        val connection = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
                Log.d(TAG, "VibraAutoService: ServiceConnection.onServiceConnected name=$name")
                val musicBinder = binder as? MusicService.MusicBinder
                if (musicBinder != null) {
                    Log.d(TAG, "VibraAutoService: Successfully cast binder to MusicBinder")
                    deferred.complete(musicBinder.service)
                } else {
                    Log.e(TAG, "VibraAutoService: Failed to cast binder to MusicBinder, binder=$binder")
                    deferred.completeExceptionally(Exception("Binder cast failed"))
                }
            }
            override fun onServiceDisconnected(name: ComponentName?) {
                Log.d(TAG, "VibraAutoService: ServiceConnection.onServiceDisconnected name=$name")
            }
        }

        try {
            val bound = applicationContext.bindService(
                intent, connection, Context.BIND_AUTO_CREATE
            )
            Log.d(TAG, "VibraAutoService: bindService returned bound=$bound")
            if (!bound) {
                Log.e(TAG, "VibraAutoService: Failed to bind to MusicService")
                return
            }

            val service = withTimeoutOrNull(1500L) { deferred.await() }
            if (service != null) {
                Log.d(TAG, "VibraAutoService: Bound to MusicService successfully, executing action")
                withContext(Dispatchers.Main) { action(service) }
            } else {
                Log.e(TAG, "VibraAutoService: Timeout waiting for MusicService binding")
            }
        } catch (e: Exception) {
            Log.e(TAG, "VibraAutoService: Exception binding to MusicService", e)
        } finally {
            try {
                Log.d(TAG, "VibraAutoService: Unbinding service connection")
                applicationContext.unbindService(connection)
            } catch (e: Exception) {
                Log.w(TAG, "VibraAutoService: Error unbinding service connection", e)
            }
        }
    }

    private fun inspectPlayerReflective(service: MusicService) {
        try {
            val playerField = MusicService::class.java.getDeclaredField("player").apply { isAccessible = true }
            val player = playerField.get(service)
            if (player == null) {
                Log.d(TAG, "inspectPlayerReflective: player is null")
                return
            }
            Log.d(TAG, "inspectPlayerReflective: player class is ${player.javaClass.name}")
            var clazz: Class<*>? = player.javaClass
            while (clazz != null) {
                Log.d(TAG, "inspectPlayerReflective: inspecting class ${clazz.name}")
                for (field in clazz.declaredFields) {
                    Log.d(TAG, "  Field: ${field.name} (type: ${field.type.name})")
                }
                for (method in clazz.declaredMethods) {
                    Log.d(TAG, "  Method: ${method.name} (returns: ${method.returnType.name})")
                }
                clazz = clazz.superclass
            }
        } catch (e: Exception) {
            Log.e(TAG, "inspectPlayerReflective: Failed to reflect player", e)
        }
    }

    private fun getMediaSessionFromPlayer(player: Any): MediaSessionCompat? {
        var clazz: Class<*>? = player.javaClass
        while (clazz != null) {
            try {
                val field = clazz.getDeclaredField("mediaSession")
                field.isAccessible = true
                val session = field.get(player)
                if (session is MediaSessionCompat) {
                    return session
                }
            } catch (e: NoSuchFieldException) {
                // Try parent class
            } catch (e: Exception) {
                Log.e(TAG, "Error getting mediaSession via reflection from ${clazz.name}", e)
            }
            clazz = clazz.superclass
        }
        return null
    }

    private fun startRealSessionTokenCheck() {
        scope.launch {
            Log.d(TAG, "VibraAutoService: Starting polling loop for real MediaSession token")
            var attempts = 0
            var success = false
            var currentDelay = 500L
            while (attempts < 15 && !success) {
                delay(currentDelay)
                attempts++
                withMusicService { service ->
                    try {
                        val playerField = MusicService::class.java.getDeclaredField("player").apply { isAccessible = true }
                        val player = playerField.get(service)
                        if (player != null) {
                            val mediaSession = getMediaSessionFromPlayer(player)
                            if (mediaSession != null) {
                                val realToken = mediaSession.sessionToken
                                Log.d(TAG, "VibraAutoService: Successfully retrieved real MediaSession token from MusicService!")
                                val controller = MediaControllerCompat(this@VibraAutoService, realToken)
                                realController?.unregisterCallback(controllerCallback)
                                realController = controller
                                controller.registerCallback(controllerCallback)
                                
                                // Sync initial state
                                session.setPlaybackState(controller.playbackState)
                                session.setMetadata(controller.metadata)
                                session.setQueue(controller.queue)
                                session.setQueueTitle(controller.queueTitle)
                                session.setRepeatMode(controller.repeatMode)
                                session.setShuffleMode(controller.shuffleMode)
                                session.setExtras(controller.extras)
                                success = true
                            } else {
                                Log.w(TAG, "VibraAutoService: mediaSession is null on player (attempt $attempts)")
                            }
                        } else {
                            Log.d(TAG, "VibraAutoService: player is null (attempt $attempts)")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "VibraAutoService: Error in session token extraction (attempt $attempts)", e)
                    }
                }
                if (!success) {
                    currentDelay = (currentDelay * 2).coerceAtMost(8000L)
                }
            }
            if (!success) {
                Log.w(TAG, "VibraAutoService: Failed to retrieve real MediaSession token after attempts.")
            }
        }
    }

    private fun startQueueJsonObserver() {
        scope.launch {
            Log.d(TAG, "VibraAutoService: Starting MMKV queue observer loop")
            var lastJson = ""
            while (true) {
                try {
                    if (::mmkv.isInitialized) {
                        mmkv.checkContentChangedByOuterProcess()
                        val currentJson = mmkv.decodeString(MMKV_KEY_QUEUE) ?: ""
                        if (currentJson != lastJson) {
                            Log.d(TAG, "VibraAutoService: MMKV queue JSON changed! Triggering notifyChildrenChanged for QUEUE_ID")
                            lastJson = currentJson
                            withContext(Dispatchers.Main) {
                                notifyChildrenChanged(QUEUE_ID)
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "VibraAutoService: Error in queue observer loop", e)
                }
                delay(2000L)
            }
        }
    }
}
