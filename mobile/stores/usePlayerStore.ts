import { migrateStoreToMMKV } from '@/lib/mmkvMigration';
import { mmkvStorage, storage } from '@/lib/mmkvStorage';
import { setupPlayer } from '@/lib/trackPlayerSetup';
import {
    DUMMY_URL,
    buildPlayableQueue,
    buildPlayableTrack,
    isValidPlaybackUrl
} from '@/utils/buildPlayableTrack';
import { syncAutoCache } from '@/utils/syncAutoCache';
import { syncWidget } from '@/utils/widgetSync';
import * as Sentry from '@sentry/react-native';
import { AppState } from 'react-native';
import TrackPlayer, {
    RepeatMode,
    State,
    Event as TrackPlayerEvent,
    type Track
} from 'react-native-track-player';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useStreamStore } from './useStreamStore';

function normalizeForDedup(str: string | undefined): string {
    if (!str) return "";
    let clean = str.toLowerCase();

    // 1. Strip parenthesized/bracketed content with suffixes
    const bracketRegex = /[\(\[][^\)\]]*(?:from|remaster|live|acoustic|version|extended|official|audio|lyrics|ost|soundtrack|hits|original|motion|picture)[^\)\]]*[\)\]]/gi;
    clean = clean.replace(bracketRegex, "");

    // 2. Remove standard parentheses and brackets contents
    clean = clean.replace(/\([^)]*\)/g, "");
    clean = clean.replace(/\[[^\]]*\]/g, "");

    // 3. Common suffixes
    const suffixTerms = [
        "original motion picture soundtrack",
        "original motion picture",
        "motion picture soundtrack",
        "motion picture",
        "soundtrack",
        "remastered",
        "remaster",
        "live",
        "acoustic",
        "version",
        "extended",
        "official",
        "audio",
        "lyrics",
        "ost",
        "greatest hits",
        "greatest hit",
        "from"
    ];

    // 4. Split on hyphen/dash/colon
    const splitMatch = clean.split(/[-–:]/);
    if (splitMatch.length > 1) {
        const rightSide = splitMatch.slice(1).join(" ");
        if (suffixTerms.some(term => rightSide.includes(term))) {
            clean = splitMatch[0];
        }
    }

    // 5. Strip suffix words using regex with boundary
    suffixTerms.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        clean = clean.replace(regex, ' ');
    });

    // 6. Safe punctuation removal
    clean = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?|'""]/g, " ");

    // 7. Collapse spaces and trim
    clean = clean.replace(/\s+/g, " ").trim();

    return clean;
}

function getAlbumVersionScore(title: string | undefined, album: string | undefined): number {
    const t = (title || "").toLowerCase();
    const a = (album || "").toLowerCase();

    // 6. Karaoke / instrumental / tribute / cover / other (Lowest priority)
    if (t.includes("karaoke") || t.includes("instrumental") || t.includes("tribute") || t.includes("cover") || t.includes("ringtone") ||
        a.includes("karaoke") || a.includes("instrumental") || a.includes("tribute") || a.includes("cover") || a.includes("ringtone")) {
        return 0;
    }

    // 5. Live
    if (t.includes("live") || a.includes("live")) {
        return 1;
    }

    // 4. Remaster
    if (t.includes("remaster") || a.includes("remaster")) {
        return 2;
    }

    // 3. Compilation / Greatest Hits
    if (t.includes("greatest hits") || t.includes("compilation") || t.includes("hits") || t.includes("best of") ||
        a.includes("greatest hits") || a.includes("compilation") || a.includes("hits") || a.includes("best of")) {
        return 3;
    }

    // 2. Single
    if (t.includes("single") || a.includes("single")) {
        return 4;
    }

    // 1. Original release / Official album (default)
    return 5;
}

function processCandidates(
    rawCandidates: any[],
    existingIds: Set<string>,
    existingExternalIds: Set<string>,
    existingNormKeys: Set<string>
): any[] {
    // 1. First, basic validation and filter out any tracks already in the player queue (by ID or normKey)
    const filteredFromQueue = rawCandidates.filter(s => {
        const sid = (s.externalId || s.id)?.toString();
        if (!sid || existingIds.has(sid) || existingExternalIds.has(sid)) return false;
        const normKey = `${normalizeForDedup(s.title)}_${normalizeForDedup(s.artist)}`;
        if (existingNormKeys.has(normKey)) return false;
        return true;
    });

    // 2. Group by normalized title + artist to compete versions
    const groups = new Map<string, any[]>();
    for (const s of filteredFromQueue) {
        const normKey = `${normalizeForDedup(s.title)}_${normalizeForDedup(s.artist)}`;
        if (!groups.has(normKey)) {
            groups.set(normKey, []);
        }
        groups.get(normKey)!.push(s);
    }

    // 3. For each group, select the best version based on album version score
    const bestCandidates: any[] = [];
    for (const songs of groups.values()) {
        if (songs.length === 1) {
            bestCandidates.push(songs[0]);
        } else {
            // Sort by album version score descending, fallback to index order (original order)
            const sorted = [...songs].sort((a, b) => {
                const scoreA = getAlbumVersionScore(a.title, a.album || a.artwork);
                const scoreB = getAlbumVersionScore(b.title, b.album || b.artwork);
                if (scoreA !== scoreB) {
                    return scoreB - scoreA; // Descending
                }
                const playA = a.playCount || 0;
                const playB = b.playCount || 0;
                return playB - playA;
            });
            bestCandidates.push(sorted[0]);
        }
    }

    return bestCandidates;
}

function naturalMix(songs: any[]): any[] {
    const result: any[] = [];
    const remaining = [...songs];

    while (remaining.length > 0) {
        if (result.length === 0) {
            result.push(remaining.shift()!);
            continue;
        }

        const last = result[result.length - 1];
        const lastArtist = last.artist ? last.artist.split(',')[0].trim().toLowerCase() : "";
        const lastAlbum = last.album ? last.album.trim().toLowerCase() : "";

        // Find the best next song
        let bestIdx = -1;

        // Try 1: Avoid same artist AND same album
        bestIdx = remaining.findIndex(s => {
            const artist = s.artist ? s.artist.split(',')[0].trim().toLowerCase() : "";
            const album = s.album ? s.album.trim().toLowerCase() : "";
            return artist !== lastArtist && (!album || album !== lastAlbum);
        });

        // Try 2: Avoid same artist only
        if (bestIdx === -1) {
            bestIdx = remaining.findIndex(s => {
                const artist = s.artist ? s.artist.split(',')[0].trim().toLowerCase() : "";
                return artist !== lastArtist;
            });
        }

        // Try 3: Just take the first available
        if (bestIdx === -1) {
            bestIdx = 0;
        }

        result.push(remaining.splice(bestIdx, 1)[0]);
    }

    return result;
}

let progressInterval: any = null;
let lastPostedPosition = -1;
let lastPostedHistoryId: string | null = null;

let transitionQueue: Promise<void> = Promise.resolve();
const enqueueTransition = <T>(fn: () => Promise<T>): Promise<T> => {
    const nextPromise = transitionQueue.then(async () => {
        return await fn();
    });
    transitionQueue = nextPromise.then(() => {}).catch(() => {});
    return nextPromise;
};

const updateWidgetState = async (passedState?: any) => {
    try {
        const state = passedState || (typeof usePlayerStore !== 'undefined' ? usePlayerStore.getState() : null);
        if (!state) return;
        const currentTrack = state.currentTrack;
        const isPlaying = state.isPlaying || 
                          state.playbackState === State.Buffering || 
                          state.playbackState === State.Loading;
        if (currentTrack) {
            await syncWidget(
                currentTrack.title || 'Unknown Title',
                currentTrack.artist || 'Unknown Artist',
                currentTrack.artwork || '',
                isPlaying
            );
        } else {
            await syncWidget('Not Playing', 'Open Vibra to play music', '', false);
        }
    } catch (e) {
        console.error('[PlayerStore] Error updating widget state:', e);
    }
};

const startProgressLoop = () => {
    if (progressInterval) return;

    progressInterval = setInterval(async () => {
        try {
            const state = usePlayerStore.getState();
            const historyId = state.activeHistoryId;
            if (!historyId) return;

            const progress = await TrackPlayer.getProgress();
            const position = progress.position;
            const duration = progress.duration || 1;
            const completionPercentage = Math.round((position / duration) * 100);

            // Write progress to MMKV (write-ahead log)
            storage.set('pending_progress_sync', JSON.stringify({
                historyId,
                position,
                completionPercentage,
                timestamp: Date.now()
            }));

            // Sync with backend if 30 seconds have passed since last sync
            if (position - lastPostedPosition >= 30) {
                await state.syncProgress();
            }
        } catch (err) {
            // Silently catch errors in background loop
        }
    }, 1000);
};

const stopProgressLoop = () => {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
};

const flushUnsyncedProgress = async () => {
    try {
        const { axiosInstance, getAuthToken } = await import('@/lib/axios');
        if (!getAuthToken()) {
            return;
        }

        const raw = storage.getString('pending_progress_sync');
        if (raw) {
            storage.delete('pending_progress_sync');
            const data = JSON.parse(raw);
            if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                await axiosInstance.post('/history/track/progress', {
                    historyId: data.historyId,
                    playDuration: data.position,
                    completionPercentage: data.completionPercentage
                });
            }
        }
    } catch (e) {
        console.error('[PlayerStore] Failed to flush unsynced progress:', e);
    }
};

interface PlayerStore {
    // State
    currentTrack: Track | null;
    isPlaying: boolean;
    queue: Track[];
    originalQueue: Track[]; // Store original order for shuffle restore
    currentIndex: number;
    shuffleMode: boolean;
    repeatMode: 'off' | 'track' | 'queue';
    isPlayerReady: boolean;
    pendingQueueSelection: boolean;
    hasTrackedCurrentTrack: boolean;
    currentContext: { type: 'album' | 'playlist' | 'artist' | 'discovery' | 'search', id: string, title?: string } | null;
    playbackState: State | null;
    skipFailureCount: number;
    isResolving: boolean;
    activeHistoryId: string | null;
    syncProgress: () => Promise<void>;
    consecutiveBackendFailures: number;
    playbackError: string | null;

    // Core actions
    initPlayer: () => Promise<void>;
    playTrack: (track: Track, context?: { type: 'album' | 'playlist' | 'artist' | 'discovery' | 'search', id: string, title?: string }) => Promise<void>;
    pauseTrack: () => Promise<void>;
    resumeTrack: () => Promise<void>;
    togglePlay: () => Promise<void>;
    playNext: () => Promise<void>;
    playPrevious: () => Promise<void>;
    seekTo: (position: number) => Promise<void>;

    // Queue management
    initializeQueue: (tracks: Track[], startIndex?: number, context?: { type: 'album' | 'playlist' | 'artist' | 'discovery' | 'search', id: string, title?: string }) => Promise<boolean>;
    addToQueue: (track: Track) => Promise<void>;
    setPlayNext: (track: Track) => Promise<void>;
    removeFromQueue: (index: number) => Promise<void>;
    clearQueue: () => Promise<void>;

    // Modes
    toggleShuffle: () => Promise<void>;
    toggleRepeat: () => Promise<void>;
    reorderQueue: (fromIndex: number, toIndex: number) => Promise<void>;

    // Helpers
    resolveAudioUrl: (track: Track, force?: boolean) => Promise<string | null>;
    syncWithTrackPlayer: () => Promise<void>;
    preloadUpcomingTracks: () => Promise<void>;
    handleBackendFailure: () => void;
    resetBackendFailures: () => void;

    // Auto-fill
    _isRefilling: boolean;
    autoRefillQueue: () => Promise<void>;

    // History
    trackHistory: (track: Track) => Promise<void>;
    resumePlayback: (item: {
        track: any;
        position: number;
    }) => Promise<void>;
    reset: () => Promise<void>;
    flushUnsyncedProgress: () => Promise<void>;
}

function sanitizeTrackForPersistence(track: Track): Track {
    const isJioSaavn = (track as any).source === 'jiosaavn' || (track as any).source === 'saavn';
    const isYouTube = (track as any).source === 'youtube';
    
    if (isJioSaavn || isYouTube) {
        // Only persist metadata — strip ephemeral stream URL
        const { url, ...rest } = track as any;
        return {
            ...rest,
            url: DUMMY_URL,  // Placeholder so TrackPlayer doesn't crash on boot before URL is refreshed
        } as Track;
    }
    
    return track; // Local files: keep url as-is
}

export const usePlayerStore = create<PlayerStore>()(
    persist(
        (set, get) => ({
    currentTrack: null,
    isPlaying: false,
    queue: [],
    originalQueue: [],
    currentIndex: -1,
    shuffleMode: false,
    repeatMode: 'off',
    isPlayerReady: false,
    pendingQueueSelection: false,
    _isRefilling: false,
    hasTrackedCurrentTrack: false,
    currentContext: null,
    playbackState: null,
    skipFailureCount: 0,
    isResolving: false,
    activeHistoryId: null,
    consecutiveBackendFailures: 0,
    playbackError: null,

    // ═══════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════
    initPlayer: async () => {
        const currentIsReady = get().isPlayerReady;
        if (currentIsReady) return;

        // Set initial app_state Sentry tag based on restored queue existence
        const hasRestoredQueue = get().queue.length > 0;
        Sentry.setTag('app_state', hasRestoredQueue ? 'restored_session' : 'cold_start');

        // Dynamically update app_state tag on AppState changes
        try {
            Sentry.setTag('app_state', AppState.currentState);
            AppState.addEventListener('change', async (nextAppState) => {
                Sentry.setTag('app_state', nextAppState);
                if (nextAppState === 'background') {
                    stopProgressLoop();
                    await get().syncProgress();
                } else if (nextAppState === 'active') {
                    const pbState = await TrackPlayer.getPlaybackState();
                    if (pbState.state === State.Playing) {
                        startProgressLoop();
                    }
                }
            });
        } catch (e) {
            // Silently ignore AppState listener failure
        }

        try {
            const success = await setupPlayer();
            set({ isPlayerReady: success });
            updateWidgetState();

            if (success) {
                // --- GLOBAL LISTENERS ---
                // Native Track Change (Auto-advance & Resolution)
                TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackActiveTrackChanged, async (event) => {
                    if (get().pendingQueueSelection) {
                        return; // Ignore events triggered by queue initialization steps
                    }

                    const track = event.track;
                    const index = event.index;

                    // Stop progress loop for previous track and sync its final position
                    stopProgressLoop();
                    get().syncProgress().catch(err => console.error('[PlayerStore] syncProgress error:', err));

                    // Reset sync variables for new track
                    lastPostedPosition = -1;
                    lastPostedHistoryId = null;
                    set({ activeHistoryId: null });

                    if (track) {
                        set({
                            currentTrack: { ...track, artwork: track.artwork || (track as any).imageUrl || undefined },
                            currentIndex: index ?? get().currentIndex,
                            hasTrackedCurrentTrack: false
                        });

                        // Set Sentry context tags for current track
                        Sentry.setTag('playback_source', get().currentContext?.type || 'unknown');
                        Sentry.setTag('provider', (track as any).source || 'unknown');

                        // ─── RESOLUTION NOT NEEDED (Stable Redirect Strategy) ───
                        // The getPlayableUrl now returns a stable backend redirector URL
                        // which TrackPlayer handles natively. No more Skip Spirals!
                        set({ skipFailureCount: 0, isResolving: false });

                        // Trigger history tracking and preloading
                        await get().trackHistory(track);
                        
                        // Start progress loop if we are playing
                        const playbackState = await TrackPlayer.getPlaybackState();
                        if (playbackState.state === State.Playing) {
                            startProgressLoop();
                        }

                        get().preloadUpcomingTracks();
                        updateWidgetState();
                    }
                });

                // Native Playback State Change
                // Only push a widget update when the play⇔pause state *actually flips*.
                // Intermediate states (Loading, Buffering, Stopped) fire this event
                // too but carry no new widget-visible information — they would only
                // create redundant concurrent native calls that race each other.
                let _lastWidgetIsPlaying: boolean | null = null;
                TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackState, async (event) => {
                    const isPausedOrStopped = event.state === State.Paused || event.state === State.Stopped || event.state === State.None;
                    
                    let isPlayingNow = get().isPlaying;
                    if (event.state === State.Playing || event.state === State.Buffering || event.state === State.Loading) {
                        isPlayingNow = true;
                    } else if (isPausedOrStopped) {
                        isPlayingNow = false;
                    }
                    
                    set({
                        isPlaying: isPlayingNow,
                        playbackState: event.state
                    });

                    if (isPlayingNow) {
                        startProgressLoop();
                    } else {
                        stopProgressLoop();
                        // Sync immediately on pause
                        await get().syncProgress();
                    }

                    // Only update the widget when the playing flag flips.
                    // This prevents Loading → Buffering → Playing from firing
                    // three concurrent syncWidget calls on every track change.
                    if (isPlayingNow !== _lastWidgetIsPlaying) {
                        _lastWidgetIsPlaying = isPlayingNow;
                        updateWidgetState();
                    }
                });

                // Queue Ended — widget state is already correct via PlaybackState above.
                TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackQueueEnded, () => {
                    set({ isPlaying: false });
                    // No updateWidgetState() call: PlaybackState:Paused/Stopped fires
                    // immediately after and handles the icon flip via the boundary check.
                });


                // Playback Error (Spiral Breaker)
                TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackError, async (error: any) => {
                    console.error('[PlayerStore] Native Playback Error:', error);

                    const state = get();

                    // Capture playback error in Sentry with full context (without sensitive URL)
                    Sentry.captureException(error, {
                        tags: {
                            playback_source: state.currentContext?.type || 'unknown',
                            provider: (state.currentTrack as any)?.source || 'unknown',
                            playback_error_code: error.code || 'unknown',
                        },
                        extra: {
                            trackId: state.currentTrack?.id,
                            trackTitle: state.currentTrack?.title,
                            trackArtist: state.currentTrack?.artist,
                            queueLength: state.queue.length,
                            currentIndex: state.currentIndex,
                            skipFailureCount: state.skipFailureCount,
                            playbackState: state.playbackState,
                            nativeErrorMessage: error.message,
                        }
                    });

                    // Check if it's a redirector failure (meaning backend is down)
                    const isRedirectorUrl = state.currentTrack?.url?.includes('/api/stream/play/');
                    if (isRedirectorUrl) {
                        get().handleBackendFailure();
                    }

                    // If backend circuit breaker is triggered, stop retries and pause
                    if (get().consecutiveBackendFailures >= 3) {
                        console.error('[PlayerStore] Circuit breaker active. Stopping retries.');
                        await TrackPlayer.pause();
                        set({ isPlaying: false });
                        return;
                    }

                    const errorMessage = error.message || '';
                    const is404 = errorMessage.includes('404');
                    const is403 = errorMessage.includes('403') || errorMessage.includes('410') || 
                                  (error.code === 'android-io-bad-http-status' && !is404);

                    if (is404) {
                        console.log('[PlayerStore] HTTP 404 detected. Skipping immediately.');
                        const newFailureCount = state.skipFailureCount + 1;
                        set({ skipFailureCount: newFailureCount });
                        
                        if (newFailureCount >= 3) {
                            console.error('[PlayerStore] Skip failure limit reached. Stopping playback.');
                            set({ isPlaying: false, skipFailureCount: 0 });
                            return;
                        }
                        
                        await get().playNext();
                        return;
                    }

                    const newFailureCount = state.skipFailureCount + 1;
                    set({ skipFailureCount: newFailureCount });

                    if (newFailureCount >= 3) {
                        console.error('[PlayerStore] Skip failure limit reached. Stopping playback.');
                        set({ isPlaying: false, skipFailureCount: 0 });
                        return;
                    }

                    // --- REFRESH LOGIC ---
                    if (is403 && state.currentTrack && (state.currentTrack as any).source !== 'local') {
                        console.log('[PlayerStore] Attempting to refresh expired URL...');
                        const freshUrl = await get().resolveAudioUrl(state.currentTrack, true);
                        
                        if (freshUrl && freshUrl !== state.currentTrack.url) {
                            const updatedTrack = { ...state.currentTrack, url: freshUrl };
                            const activeIdx = state.currentIndex;
                            
                            if (activeIdx !== -1) {
                                await TrackPlayer.remove(activeIdx);
                                await TrackPlayer.add([updatedTrack], activeIdx);
                                await TrackPlayer.skip(activeIdx);
                                await TrackPlayer.play();
                                
                                set(s => {
                                    const newQueue = [...s.queue];
                                    newQueue[activeIdx] = updatedTrack;
                                    return { 
                                        currentTrack: updatedTrack,
                                        queue: newQueue,
                                        skipFailureCount: 0 // Reset since we fixed it
                                    };
                                });
                                return;
                            }
                        }
                    }

                    // --- SPIRAL BREAKER: Add delay before skipping ---
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await get().playNext();
                });

                // --- PERSISTENCE RESTORATION ---
                const state = get();
                const nativeQueue = await TrackPlayer.getQueue();
                
                if (nativeQueue.length === 0 && state.queue.length > 0) {
                    console.log('[PlayerStore] Restoring persisted queue:', state.queue.length, 'tracks');

                    const { axiosInstance } = await import('@/lib/axios');
                    const baseURL = axiosInstance.defaults.baseURL ?? null;

                    // Phase 2: run every persisted track through the canonical builder.
                    // Tracks that were stored with DUMMY_URL get rebuilt with valid redirectors.
                    // Truly unresolvable tracks are skipped and logged by the builder.
                    let restoredQueue: Track[];
                    try {
                        restoredQueue = await buildPlayableQueue(state.queue, { baseURL });
                    } catch (buildErr) {
                        console.error('[PlayerStore] buildPlayableQueue failed during restoration:', buildErr);
                        restoredQueue = [];
                    }

                    if (restoredQueue.length === 0) {
                        console.warn('[PlayerStore] No valid tracks after queue restoration — starting fresh.');
                    } else {
                        // Add all tracks to native player
                        await TrackPlayer.add(restoredQueue);
                        set({ queue: restoredQueue });

                        // Skip to last active index (clamped to new queue size)
                        const targetIdx = Math.min(
                            Math.max(state.currentIndex, 0),
                            restoredQueue.length - 1,
                        );
                        try {
                            await TrackPlayer.skip(targetIdx);

                            // Phase 2: rebuild the current track through the builder to
                            // ensure the URL is fully resolved (not DUMMY_URL).
                            const restoredCurrent = restoredQueue[targetIdx];
                            // restoredCurrent.url is already a valid redirector URL from
                            // buildPlayableQueue — so TrackPlayer.load is only needed if
                            // the builder fell back to DUMMY_URL for the active slot.
                            if (!isValidPlaybackUrl(restoredCurrent?.url)) {
                                const fresh = await buildPlayableTrack(state.queue[state.currentIndex], { baseURL });
                                if (fresh.ok) {
                                    await TrackPlayer.load(fresh.track);
                                }
                            }

                            // Restore repeat mode
                            let tpMode = RepeatMode.Off;
                            if (state.repeatMode === 'track') tpMode = RepeatMode.Track;
                            if (state.repeatMode === 'queue') tpMode = RepeatMode.Queue;
                            await TrackPlayer.setRepeatMode(tpMode);
                        } catch (e) {
                            console.error('[PlayerStore] Restore skip/refresh failed:', e);
                            Sentry.captureException(e, {
                                tags: {
                                    operation: 'queue_restoration',
                                    app_state: 'restored_session',
                                },
                                extra: {
                                    queueLength: restoredQueue.length,
                                    currentIndex: state.currentIndex,
                                }
                            });
                        }
                    }
                }

                // Sync state AFTER restoration (or normal boot) to avoid wiping hydrated queue
                await get().syncWithTrackPlayer();
                
                // Flush any unsynced progress stored locally in MMKV
                flushUnsyncedProgress();
            }
        } catch (error) {
            console.error('[PlayerStore] Init failed:', error);
            Sentry.captureException(error, {
                tags: { operation: 'player_init' }
            });
            set({ isPlayerReady: false });
        }
    },

    syncWithTrackPlayer: async () => {
        try {
            const queue = await TrackPlayer.getQueue();
            const index = await TrackPlayer.getActiveTrackIndex();
            const state = await TrackPlayer.getPlaybackState();

            const mappedQueue = queue.map((t: any) => ({ ...t, artwork: t.artwork || t.imageUrl || undefined }));
            const isPlayingNow = state.state === State.Playing || state.state === State.Buffering || state.state === State.Loading;
            set({
                queue: mappedQueue,
                currentIndex: index ?? -1,
                currentTrack: index !== undefined && index >= 0 && index < queue.length ? { ...queue[index], artwork: queue[index].artwork || queue[index].imageUrl || undefined } : null,
                isPlaying: isPlayingNow,
            });
            
            // Sync Android Auto catalog
            syncAutoCache(mappedQueue);
        } catch (error) {
            console.error('[PlayerStore] Sync failed:', error);
        }
    },

    // ═══════════════════════════════════════════
    // URL RESOLUTION
    // ═══════════════════════════════════════════
    resolveAudioUrl: async (track: Track, force: boolean = false): Promise<string | null> => {
        // If we have a URL, check if it's local or needs resolution
        // If we DON'T have a URL but have an ID and source, we can still resolve
        const hasUrl = !!track.url && typeof track.url === 'string';
        const hasExternalRepo = !!((track as any).source && (track.id || (track as any).externalId));

        if (!hasUrl && !hasExternalRepo) return null;

        // 1. Check if it's already a local file
        if (hasUrl && track.url.startsWith('file://')) {
            return track.url;
        }

        // 2. Check if it's in our download store (Lazy import to avoid circular dependencies)
        try {
            const { useDownloadStore } = await import('./useDownloadStore');
            const downloadedSong = useDownloadStore.getState().downloadedSongs[track.id];

            if (downloadedSong?.localUri) {
                // console.log(`[PlayerStore] Playing track from local storage: ${track.title}`);
                return downloadedSong.localUri;
            }
        } catch (e) {
            // Silently fail if store is not accessible at this moment
        }

        // 3. External stream resolution
        try {
            const { getPlayableUrl } = useStreamStore.getState();

            // Force resolution if URL is missing, it's a YouTube track, or it's a JioSaavn track, or force is true
            const isJioSaavn = (track as any).source === 'jiosaavn' || (track as any).source === 'saavn';
            const isYouTube = (track as any).source === 'youtube';
            const needsResolution = force || !track.url || track.url.length < 10 || isYouTube || isJioSaavn;

            if (needsResolution && (track as any).source) {
                const url = await getPlayableUrl({
                    ...track,
                    videoId: (track as any).videoId || (track as any).id || '',
                    streamUrl: (track as any).streamUrl || track.url,
                    audioUrl: (track as any).audioUrl || track.url,
                });

                if (url && url !== DUMMY_URL) return url;
            }

            if (track.url && track.url !== DUMMY_URL) {
                return track.url;
            }
        } catch (error) {
            console.error('[PlayerStore] resolveAudioUrl error:', error);
            Sentry.captureException(error, {
                tags: {
                    operation: 'resolveAudioUrl',
                    provider: (track as any)?.source || 'unknown',
                    playback_source: get().currentContext?.type || 'unknown',
                },
                extra: {
                    trackId: track.id,
                    trackTitle: track.title,
                    trackArtist: track.artist,
                }
            });
        }

        // (Phase 3: Removed redundant absolute fallback manual redirector builder block. 
        // getPlayableUrl handles it upstream, and buildPlayableTrack handles it downstream.)

        return track.url || null;
    },

    // ═══════════════════════════════════════════
    // PLAYBACK CONTROLS
    // ═══════════════════════════════════════════
    playTrack: async (track: Track, context?: { type: 'album' | 'playlist' | 'artist' | 'discovery' | 'search', id: string, title?: string }) => {
        // console.log(`[PlayerStore] playTrack called. Context:`, context);
        try {
            const { axiosInstance } = await import('@/lib/axios');
            const baseURL = axiosInstance.defaults.baseURL ?? null;

            const res = await buildPlayableTrack(track, { baseURL });
            if (!res.ok) {
                console.error('[PlayerStore] Could not resolve playable track for:', track.title, 'Reason:', res.reason);
                Sentry.captureMessage(`Stream resolution returned null: ${track.title}`, {
                    level: 'error',
                    tags: {
                        operation: 'playTrack_resolution_fail',
                        provider: (track as any)?.source || 'unknown',
                        playback_source: context?.type || get().currentContext?.type || 'unknown',
                    },
                    extra: {
                        trackId: track.id,
                        trackTitle: track.title,
                        trackArtist: track.artist,
                    }
                });
                return;
            }

            const playableTrack = res.track;

            await TrackPlayer.reset();
            await TrackPlayer.add([playableTrack]);

            // Re-apply options to ensure Media Session is active for this track
            const { setupPlayer } = await import('@/lib/trackPlayerSetup');
            await setupPlayer(); // This handles updateOptions

            await TrackPlayer.play();

            set({
                currentTrack: playableTrack,
                isPlaying: true,
                currentIndex: 0,
                queue: [playableTrack],
                currentContext: context || null,
            });
        } catch (error) {
            console.error('[PlayerStore] playTrack error:', error);
            Sentry.captureException(error, {
                tags: {
                    operation: 'playTrack',
                    provider: (track as any)?.source || 'unknown',
                    playback_source: context?.type || get().currentContext?.type || 'unknown',
                },
                extra: {
                    trackId: track.id,
                    trackTitle: track.title,
                }
            });
        }
    },

    pauseTrack: async () => {
        try {
            await TrackPlayer.pause();
            set({ isPlaying: false });
        } catch (error) {
            console.error('[PlayerStore] pause error:', error);
        }
    },

    resumeTrack: async () => {
        try {
            await TrackPlayer.play();
            set({ isPlaying: true });
        } catch (error) {
            console.error('[PlayerStore] resume error:', error);
        }
    },

    togglePlay: async () => {
        const { isPlaying, pauseTrack, resumeTrack } = get();
        if (isPlaying) {
            await pauseTrack();
        } else {
            await resumeTrack();
        }
    },

    seekTo: async (position: number) => {
        try {
            await TrackPlayer.seekTo(position);
        } catch (error) {
            console.error('[PlayerStore] seekTo error:', error);
        }
    },

    // ═══════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════
    playNext: async () => {
        return enqueueTransition(async () => {
            try {
                const state = get();

                // Handle repeat track mode
                if (state.repeatMode === 'track' && state.currentTrack) {
                    await TrackPlayer.seekTo(0);
                    await TrackPlayer.play();
                    return;
                }

                const currentIdx = await TrackPlayer.getActiveTrackIndex() ?? -1;
                const nextIdx = currentIdx + 1;

                // Check if we've reached the end
                if (nextIdx >= state.queue.length) {
                    if (state.repeatMode === 'queue' && state.queue.length > 0) {
                        await TrackPlayer.skip(0);
                        await TrackPlayer.play();
                    } else {
                        set({ isPlaying: false });
                    }
                    return;
                }

                // SIMPLIFIED: Just skip. The listener handles the resolution.
                await TrackPlayer.skipToNext();
                await TrackPlayer.play();

                // Pre-emptive auto-refill if queue is running out
                const remainingTracks = state.queue.length - 1 - nextIdx;
                if (remainingTracks < 5) {
                    get().autoRefillQueue();
                }

            } catch (error) {
                console.error('[PlayerStore] playNext error:', error);
            }
        });
    },

    playPrevious: async () => {
        return enqueueTransition(async () => {
            try {
                const position = await TrackPlayer.getPosition();

                // If more than 3 seconds in, restart current track
                if (position > 3) {
                    await TrackPlayer.seekTo(0);
                    return;
                }

                const currentIdx = await TrackPlayer.getActiveTrackIndex() ?? 0;

                if (currentIdx > 0) {
                    await TrackPlayer.skipToPrevious();
                    await TrackPlayer.play();
                } else {
                    // At start of queue, just restart
                    await TrackPlayer.seekTo(0);
                }
            } catch (error) {
                console.error('[PlayerStore] playPrevious error:', error);
            }
        });
    },

    // ═══════════════════════════════════════════
    // QUEUE MANAGEMENT
    // ═══════════════════════════════════════════
    initializeQueue: async (tracks: Track[], startIndex: number = 0, context?: { type: 'album' | 'playlist' | 'artist' | 'discovery' | 'search', id: string, title?: string }) => {
        try {
            if (!tracks.length) return false;

            const { axiosInstance } = await import('@/lib/axios');
            const baseURL = axiosInstance.defaults.baseURL ?? null;

            // Use canonical track builder for all incoming tracks
            const resolvedTracks = await buildPlayableQueue(tracks, { baseURL });
            if (resolvedTracks.length === 0) {
                console.warn('[PlayerStore] initializeQueue: No playable tracks survived validation.');
                return false;
            }

            // Ensure startIndex is safe relative to the newly filtered array
            const safeIndex = Math.min(startIndex, resolvedTracks.length - 1);

            const currentShuffleMode = get().shuffleMode;
            let finalQueue = resolvedTracks;
            let finalStartIndex = safeIndex;

            if (currentShuffleMode && resolvedTracks.length > 1) {
                const startTrack = resolvedTracks[safeIndex];
                const otherTracks = resolvedTracks.filter((_, idx) => idx !== safeIndex);
                // Fisher-Yates shuffle
                for (let i = otherTracks.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
                }
                finalQueue = [startTrack, ...otherTracks];
                finalStartIndex = 0;
            }

            await TrackPlayer.reset();
            
            set({ pendingQueueSelection: true });
            await TrackPlayer.add(finalQueue);

            // Re-apply options
            const { setupPlayer } = await import('@/lib/trackPlayerSetup');
            await setupPlayer();

            await TrackPlayer.skip(finalStartIndex);
            await TrackPlayer.play();

            set({
                queue: finalQueue,
                originalQueue: [...resolvedTracks], // Save original order
                currentTrack: finalQueue[finalStartIndex],
                currentIndex: finalStartIndex,
                isPlaying: true,
                currentContext: context || null,
                pendingQueueSelection: false,
            });

            // Sync Android Auto catalog (no-op on iOS)
            syncAutoCache(finalQueue);

            // Async resolve the rest
            get().preloadUpcomingTracks();

            // Setup auto-refill if queue is short
            const remainingTracks = resolvedTracks.length - 1 - safeIndex;
            if (remainingTracks < 5) {
                get().autoRefillQueue();
            }

            return true;

        } catch (error) {
            console.error('[PlayerStore] initializeQueue error:', error);
            Sentry.captureException(error, {
                tags: {
                    operation: 'initializeQueue',
                    playback_source: context?.type || 'unknown',
                },
                extra: {
                    tracksCount: tracks.length,
                    startIndex,
                }
            });
            return false;
        }
    },

    preloadUpcomingTracks: async () => {
        try {
            const currentIdx = await TrackPlayer.getActiveTrackIndex();
            if (currentIdx === undefined) return;

            const state = get();

            // 1. Proactively check if queue needs refill (Buffer Management)
            const remaining = state.queue.length - 1 - currentIdx;
            if (remaining < 5 && !state._isRefilling) {
                get().autoRefillQueue();
            }

            // 2. Pre-resolve URLs and Lyrics for the next 3 tracks
            const { useLyricsStore } = await import('./useLyricsStore');
            const lyricsStore = useLyricsStore.getState();

            for (let i = 1; i <= 3; i++) {
                const targetIdx = currentIdx + i;
                if (targetIdx < state.queue.length) {
                    const track = state.queue[targetIdx];

                    // Pre-fetch Lyrics
                    if (track.title && track.artist) {
                        lyricsStore.fetchLyrics(track.id, track.title, track.artist, track.duration);
                    }

                    // Pre-fetch Artwork for the very next track (i === 1) to make transitions instantaneous
                    if (i === 1 && track.artwork) {
                        try {
                            const { Image } = require('expo-image');
                            const { resolveAssetUrl } = require('@/lib/url');
                            const resolvedArtworkUrl = resolveAssetUrl(track.artwork);
                            if (resolvedArtworkUrl) {
                                Image.prefetch(resolvedArtworkUrl);
                                Sentry.addBreadcrumb({
                                    category: 'image_prefetch',
                                    message: `Prefetched next track artwork: ${track.title}`,
                                    level: 'info',
                                    data: { url: resolvedArtworkUrl }
                                });
                            }
                        } catch (err) {
                            // Silently ignore prefetch errors
                        }
                    }

                    // Pre-resolve URLs only if they are missing or are DUMMY_URL placeholders
                    const isRedirector = track.url && (track.url.includes('/stream/play/') || track.url.includes('/api/stream/play/'));
                    if ((track as any).source && (!track.url || track.url === DUMMY_URL) && !isRedirector) {
                        const resolvedUrl = await get().resolveAudioUrl(track);
                        if (resolvedUrl && track.url !== resolvedUrl) {
                            const updatedTrack = {
                                ...track,
                                url: resolvedUrl,
                                artwork: track.artwork || (track as any).imageUrl || undefined
                            };

                            // Double check if the track at targetIdx still has the same ID to prevent races
                            const latestQueue = await TrackPlayer.getQueue();
                            if (targetIdx < latestQueue.length && latestQueue[targetIdx].id === track.id) {
                                await TrackPlayer.remove(targetIdx);
                                await TrackPlayer.add([updatedTrack], targetIdx);

                                // Update internal state
                                set((s) => {
                                    if (targetIdx < s.queue.length && s.queue[targetIdx].id === track.id) {
                                        const newQueue = [...s.queue];
                                        newQueue[targetIdx] = updatedTrack;
                                        return { queue: newQueue };
                                    }
                                    return {};
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // silently fail preloads
        }
    },

    addToQueue: async (track: Track) => {
        try {
            const { axiosInstance } = await import('@/lib/axios');
            const res = await buildPlayableTrack(track, { baseURL: axiosInstance.defaults.baseURL ?? null });
            if (!res.ok) {
                console.warn('[PlayerStore] addToQueue rejected track:', track.title, res.reason);
                return;
            }
            const playableTrack = res.track;

            const store = get();
            const currentQueue = store.queue;

            await TrackPlayer.add([playableTrack]);

            // If the player was stopped or queue empty, it might need explicit play 
            // but usually we just want to add it to the END.

            set({ queue: [...currentQueue, playableTrack] });

            // console.log(`[PlayerStore] Added to queue: ${track.title}`);
        } catch (error) {
            console.error('[PlayerStore] addToQueue error:', error);
        }
    },

    setPlayNext: async (track: Track) => {
        try {
            const { axiosInstance } = await import('@/lib/axios');
            const res = await buildPlayableTrack(track, { baseURL: axiosInstance.defaults.baseURL ?? null });
            if (!res.ok) {
                console.warn('[PlayerStore] setPlayNext rejected track:', track.title, res.reason);
                return;
            }
            const playableTrack = res.track;

            const store = get();
            const currentIdx = await TrackPlayer.getActiveTrackIndex();
            const insertIdx = (currentIdx !== undefined) ? currentIdx + 1 : 0;

            // Find and remove existing occurrence of this track (if it's already in queue)
            const existingIdx = store.queue.findIndex(
                (t, i) => i > (currentIdx ?? -1) && (t.id === track.id)
            );

            if (existingIdx !== -1) {
                // Remove from TrackPlayer and our queue first
                await TrackPlayer.remove(existingIdx);
                const newQueue = [...store.queue];
                newQueue.splice(existingIdx, 1);

                // Recalculate insert index after removal
                const adjustedInsertIdx = existingIdx < insertIdx ? insertIdx - 1 : insertIdx;

                await TrackPlayer.add([playableTrack], adjustedInsertIdx);
                newQueue.splice(adjustedInsertIdx, 0, playableTrack);

                set({ queue: newQueue });
            } else {
                // Track not in queue yet, just insert
                await TrackPlayer.add([playableTrack], insertIdx);
                const newQueue = [...store.queue];
                newQueue.splice(insertIdx, 0, playableTrack);
                set({
                    queue: newQueue,
                    currentIndex: (currentIdx === undefined && store.queue.length === 0) ? 0 : store.currentIndex
                });
            }
        } catch (error) {
            console.error('[PlayerStore] setPlayNext error:', error);
        }
    },

    removeFromQueue: async (index: number) => {
        try {
            const state = get();

            // Don't remove currently playing track
            if (index === state.currentIndex) return;

            // 1. Optimistic UI update
            const newQueue = [...state.queue];
            newQueue.splice(index, 1);

            let newIndex = state.currentIndex;
            if (index < state.currentIndex) {
                newIndex = state.currentIndex - 1;
            }

            set({ queue: newQueue, currentIndex: newIndex });

            // 2. Async native removal (don't await to avoid UI lag)
            TrackPlayer.remove(index).catch(err => {
                console.error('[PlayerStore] Background removal failed:', err);
                // Sync back if it fails significantly
                get().syncWithTrackPlayer();
            });
        } catch (error) {
            console.error('[PlayerStore] removeFromQueue error:', error);
        }
    },

    clearQueue: async () => {
        try {
            await TrackPlayer.reset();
            set({
                queue: [],
                currentTrack: null,
                currentIndex: -1,
                isPlaying: false,
            });
            updateWidgetState();
        } catch (error) {
            console.error('[PlayerStore] clearQueue error:', error);
        }
    },

    // ═══════════════════════════════════════════
    // MODES
    // ═══════════════════════════════════════════
    toggleShuffle: async () => {
        const { shuffleMode, queue, originalQueue, currentTrack } = get();
        const newShuffle = !shuffleMode;
        set({ shuffleMode: newShuffle });

        try {
            const nativeActiveIdx = await TrackPlayer.getActiveTrackIndex();

            if (newShuffle) {
                // SHUFFLE: Save current queue as original if empty
                if (originalQueue.length === 0) set({ originalQueue: [...queue] });

                const otherTracks = queue.filter(t => t.id !== currentTrack?.id);
                // Fisher-Yates shuffle
                for (let i = otherTracks.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
                }

                const shuffledQueue = currentTrack ? [currentTrack, ...otherTracks] : otherTracks;

                if (nativeActiveIdx !== undefined) {
                    const totalTracks = (await TrackPlayer.getQueue()).length;
                    const afterIndices = Array.from({ length: totalTracks - (nativeActiveIdx + 1) }, (_, i) => nativeActiveIdx + i + 1);
                    const beforeIndices = Array.from({ length: nativeActiveIdx }, (_, i) => i);

                    if (afterIndices.length > 0) await TrackPlayer.remove(afterIndices);
                    if (beforeIndices.length > 0) await TrackPlayer.remove(beforeIndices);

                    const { axiosInstance } = await import('@/lib/axios');
                    const baseURL = axiosInstance.defaults.baseURL ?? null;
                    const tracksToAppend = await buildPlayableQueue(otherTracks, { baseURL });
                    
                    if (tracksToAppend.length > 0) {
                        await TrackPlayer.add(tracksToAppend);
                    }
                }

                set({ queue: shuffledQueue, currentIndex: 0 });
            } else {
                // RESTORE: Use originalQueue
                if (originalQueue.length > 0) {
                    const originalIdx = originalQueue.findIndex(t => t.id === currentTrack?.id);

                    if (nativeActiveIdx !== undefined) {
                        const totalTracks = (await TrackPlayer.getQueue()).length;
                        const afterIndices = Array.from({ length: totalTracks - (nativeActiveIdx + 1) }, (_, i) => nativeActiveIdx + i + 1);
                        const beforeIndices = Array.from({ length: nativeActiveIdx }, (_, i) => i);

                        if (afterIndices.length > 0) await TrackPlayer.remove(afterIndices);
                        if (beforeIndices.length > 0) await TrackPlayer.remove(beforeIndices);

                        // Rebuild around current
                        const indexInOrig = originalQueue.findIndex(t => t.id === currentTrack?.id);

                        const { axiosInstance } = await import('@/lib/axios');
                        const baseURL = axiosInstance.defaults.baseURL ?? null;
                        const tracksToAdd = await buildPlayableQueue(originalQueue, { baseURL });

                        const tracksBefore = tracksToAdd.slice(0, indexInOrig);
                        const tracksAfter = tracksToAdd.slice(indexInOrig + 1);

                        if (tracksAfter.length > 0) await TrackPlayer.add(tracksAfter);
                        if (tracksBefore.length > 0) await TrackPlayer.add(tracksBefore, 0);
                    }

                    set({ queue: [...originalQueue], currentIndex: originalIdx !== -1 ? originalIdx : 0 });
                }
            }
        } catch (error) {
            console.error("[PlayerStore] toggleShuffle error:", error);
        }
    },

    toggleRepeat: async () => {
        const currentMode = get().repeatMode;
        const nextMode = currentMode === 'queue' ? 'off' : 'queue';

        const tpMode = nextMode === 'queue' ? RepeatMode.Queue : RepeatMode.Off;

        await TrackPlayer.setRepeatMode(tpMode);
        set({ repeatMode: nextMode });
    },

    reorderQueue: async (fromIndex: number, toIndex: number) => {
        try {
            const state = get();
            if (fromIndex < 0 || fromIndex >= state.queue.length || toIndex < 0 || toIndex >= state.queue.length) return;

            // 1. Calculate new index of the active track to keep Zustand perfectly in sync
            let newCurrentIndex = state.currentIndex;
            if (state.currentIndex !== -1) {
                if (fromIndex === state.currentIndex) {
                    newCurrentIndex = toIndex;
                } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
                    newCurrentIndex = state.currentIndex - 1;
                } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
                    newCurrentIndex = state.currentIndex + 1;
                }
            }

            // 2. Update state queue and index
            const newQueue = [...state.queue];
            const [removed] = newQueue.splice(fromIndex, 1);
            newQueue.splice(toIndex, 0, removed);

            set({
                queue: newQueue,
                currentIndex: newCurrentIndex
            });

            // 3. Move natively in TrackPlayer
            await TrackPlayer.move(fromIndex, toIndex);

            // Double check index from native player to prevent desync
            const nativeIndex = await TrackPlayer.getActiveTrackIndex();
            if (nativeIndex !== undefined && nativeIndex !== newCurrentIndex) {
                set({ currentIndex: nativeIndex });
            }
        } catch (error) {
            console.error('[PlayerStore] reorderQueue error:', error);
            // Re-sync if it fails
            await get().syncWithTrackPlayer();
        }
    },

    // ═══════════════════════════════════════════
    // AUTO-REFILL QUEUE
    // ═══════════════════════════════════════════
    autoRefillQueue: async () => {
        try {
            const { useSettingsStore } = await import('./useSettingsStore');
            if (!useSettingsStore.getState().autoplay) return;
        } catch (e) {
            // silent fallback
        }
        const state = get();
        if (state._isRefilling || !state.currentTrack) return;

        const remaining = state.queue.length - 1 - state.currentIndex;
        if (remaining >= 8) return;

        set({ _isRefilling: true });

        try {
            const { axiosInstance } = await import('@/lib/axios');
            const streamStore = useStreamStore.getState();
            const track = state.currentTrack;

            let source = (track as any).source;
            if (!source) {
                if (track.id?.startsWith('yt_')) source = 'youtube';
                else if (track.id?.startsWith('jiosaavn_') || /^\d+$/.test(track.id || '')) source = 'jiosaavn';
                else source = 'local';
            }

            const trackId = ((track as any).externalId || track.id || '').replace('jiosaavn_', '').replace('yt_', '');
            let pool: any[] = [];

            const existingIds = new Set(get().queue.map(t => t.id?.toString()));
            const existingExternalIds = new Set(get().queue.map(t => (t as any).externalId?.toString()));
            const existingNormKeys = new Set(get().queue.map(t => `${normalizeForDedup(t.title)}_${normalizeForDedup(t.artist)}`));

            // ─── Strategy 1: Targeted Recommendations (JioSaavn/YouTube) ───
            if (trackId && (source === 'jiosaavn' || source === 'youtube')) {
                try {
                    const { useOnboardingStore } = await import('./useOnboardingStore');
                    const langs = useOnboardingStore.getState().getLanguageString();

                    const res = await axiosInstance.get(`/stream/recommendations/${source}/${trackId}`, {
                        params: { languages: langs, limit: 15 }
                    });
                    const recoResults = res.data?.results || [];

                    if (Array.isArray(recoResults) && recoResults.length > 0) {
                        pool = [...pool, ...recoResults];
                    }
                } catch (err) {
                    // silent
                }
            }

            let candidates = processCandidates(pool, existingIds, existingExternalIds, existingNormKeys);

            // ─── Strategy 2: Search-based fallback (like web) ───
            if (candidates.length < 12 && track.title) {
                try {
                    const query = (track.artist && track.artist !== 'Unknown Artist')
                        ? `${track.artist.split(',')[0].trim()} ${track.title}`
                        : track.title;

                    const searchRes = await axiosInstance.get("/stream/search", {
                        params: { q: query, limit: 12, source: 'jiosaavn' },
                    });
                    const searchResults = searchRes.data?.results || [];

                    if (Array.isArray(searchResults) && searchResults.length > 0) {
                        pool = [...pool, ...searchResults];
                        candidates = processCandidates(pool, existingIds, existingExternalIds, existingNormKeys);
                    }
                } catch (err) {
                    // silent
                }
            }

            // ─── Strategy 2.5: High-Quality Artist Fallback (fetch artist's page details) ───
            if (candidates.length < 12 && track.artist && track.artist !== 'Unknown Artist') {
                try {
                    const artistOnly = track.artist.split(',')[0].trim();
                    let artistId = (track as any).artistId;

                    if (!artistId) {
                        const searchAllRes = await axiosInstance.get("/stream/search/all", {
                            params: { q: artistOnly, limit: 1 }
                        });
                        const artists = searchAllRes.data?.artists || [];
                        if (artists.length > 0) {
                            artistId = artists[0].externalId?.replace("jiosaavn_artist_", "");
                        }
                    }

                    if (artistId) {
                        const artistRes = await axiosInstance.get(`/stream/artists/jiosaavn/${artistId}`);
                        const artistData = artistRes.data;
                        const topSongs = artistData?.topSongs || [];
                        if (Array.isArray(topSongs) && topSongs.length > 0) {
                            const shuffledTop = [...topSongs].sort(() => Math.random() - 0.5);
                            pool = [...pool, ...shuffledTop];
                            candidates = processCandidates(pool, existingIds, existingExternalIds, existingNormKeys);
                        }
                    }
                } catch (err) {
                    // silent
                }
            }

            // ─── Strategy 3: Daily Mix Fallback (Absolute last resort) ───
            if (candidates.length < 12) {
                try {
                    await streamStore.fetchDailyMix();
                    const dailyMix = streamStore.dailyMix || [];
                    if (Array.isArray(dailyMix) && dailyMix.length > 0) {
                        pool = [...pool, ...dailyMix];
                        candidates = processCandidates(pool, existingIds, existingExternalIds, existingNormKeys);
                    }
                } catch (err) {
                    // silent
                }
            }

            if (candidates.length > 0) {
                // Initialize rolling artist history from the end of the current queue (last 5 songs)
                const queueEnd = state.queue.slice(Math.max(0, state.queue.length - 5));
                const recentArtists = queueEnd
                    .map(t => t.artist ? t.artist.split(',')[0].trim().toLowerCase() : "")
                    .filter(Boolean);

                const selectedSongs: any[] = [];
                const activeRecentArtists = [...recentArtists];

                // Pick up to 12 tracks, prioritizing artists not recently chosen
                while (selectedSongs.length < 12 && candidates.length > 0) {
                    let bestIdx = -1;
                    let bestRecency = 999;

                    for (let i = 0; i < candidates.length; i++) {
                        const s = candidates[i];
                        const artistNorm = s.artist ? s.artist.split(',')[0].trim().toLowerCase() : "";
                        const idx = activeRecentArtists.indexOf(artistNorm);

                        if (idx === -1) {
                            bestIdx = i;
                            break; // Not recently chosen - select immediately to preserve quality/order
                        } else {
                            if (idx < bestRecency) {
                                bestRecency = idx;
                                bestIdx = i;
                            }
                        }
                    }

                    if (bestIdx !== -1) {
                        const song = candidates.splice(bestIdx, 1)[0];
                        selectedSongs.push(song);

                        const artistNorm = song.artist ? song.artist.split(',')[0].trim().toLowerCase() : "";
                        if (artistNorm) {
                            activeRecentArtists.push(artistNorm);
                            if (activeRecentArtists.length > 5) {
                                activeRecentArtists.shift();
                            }
                        }
                    } else {
                        break;
                    }
                }

                // Naturally mix the songs to avoid clusters of same artist/album
                const finalSongs = naturalMix(selectedSongs);

                const { axiosInstance } = await import('@/lib/axios');
                const baseURL = axiosInstance.defaults.baseURL ?? null;

                // Phase 2: Canonical track builder replaces manual fallback logic
                const validatedTracks = await buildPlayableQueue(finalSongs, { baseURL });

                if (validatedTracks.length > 0) {
                    await TrackPlayer.add(validatedTracks);
                    set((s) => ({ queue: [...s.queue, ...validatedTracks] }));
                    // console.log(`[SmartAutoplay] Refilled ${validatedTracks.length} tracks`);
                }
            }
        } catch (error) {
            console.error('[PlayerStore] autoRefillQueue critical error:', error);
        } finally {
            set({ _isRefilling: false });
        }
    },

    trackHistory: async (track: Track) => {
        if (!track || get().hasTrackedCurrentTrack) return;

        try {
            const { axiosInstance, getAuthToken } = await import('@/lib/axios');

            // Guard: do not send history requests before auth token is available.
            // On cold-start restore, PlaybackActiveTrackChanged fires before Clerk resolves.
            // Reset hasTrackedCurrentTrack so this will be retried on the next track change.
            if (!getAuthToken()) {
                if (__DEV__) console.log('[PlayerStore] trackHistory skipped: auth token not ready yet.');
                return;
            }

            set({ hasTrackedCurrentTrack: true });

            const isExternal =
                track.source === 'jiosaavn' ||
                track.source === 'youtube' ||
                track.id?.startsWith('jiosaavn_') ||
                track.id?.startsWith('yt_');

            let res;
            if (isExternal) {
                res = await axiosInstance.post('/history/track', {
                    songId: track.id,
                    isExternal: true,
                    context: get().currentContext,
                    externalData: {
                        title: track.title,
                        artist: track.artist,
                        imageUrl: track.artwork || '',
                        duration: track.duration,
                        source: track.source || 'jiosaavn',
                        externalId: track.id,
                        album: track.album || '',
                        albumId: (track as any).albumId || '',
                        streamUrl: track.url || '',
                    },
                });
            } else {
                res = await axiosInstance.post('/history/track', {
                    songId: track.id,
                    isExternal: false,
                });
            }

            if (res?.data?.historyId) {
                set({ activeHistoryId: res.data.historyId });
            }
        } catch (error) {
            console.error('[PlayerStore] Failed to track history:', error);
        }
    },

    syncProgress: async () => {
        const historyId = get().activeHistoryId;
        if (!historyId) return;

        try {
            const progress = await TrackPlayer.getProgress();
            const position = progress.position;

            // Check if we already synced this exact position for this history ID
            if (historyId === lastPostedHistoryId && Math.abs(position - lastPostedPosition) < 0.1) {
                
            return;
            }

            const { axiosInstance } = await import('@/lib/axios');
            const duration = progress.duration || 1;
            const completionPercentage = Math.round((position / duration) * 100);

            lastPostedPosition = position;
            lastPostedHistoryId = historyId;

            // Write progress to MMKV (write-ahead log)
            storage.set('pending_progress_sync', JSON.stringify({
                historyId,
                position,
                completionPercentage,
                timestamp: Date.now()
            }));

            // Sync with backend
            await axiosInstance.post('/history/track/progress', {
                historyId,
                playDuration: position,
                completionPercentage
            });

            // Clean up MMKV pending sync on success
            storage.delete('pending_progress_sync');
        } catch (error) {
            console.error('[PlayerStore] Failed to sync progress:', error);
        }
    },

    handleBackendFailure: () => {
        const currentFailures = get().consecutiveBackendFailures + 1;
        set({ consecutiveBackendFailures: currentFailures });

        const trackId = get().currentTrack?.id;
        const isOfflineTrack = get().currentTrack?.url?.startsWith('file://') || 
                              (trackId && 
                               (() => {
                                   try {
                                       const { useDownloadStore } = require('./useDownloadStore');
                                       return !!useDownloadStore.getState().downloadedSongs[trackId]?.localUri;
                                   } catch (e) {
                                       return false;
                                   }
                               })());

        if (currentFailures >= 3 && !isOfflineTrack) {
            console.error('[PlayerStore] Circuit breaker triggered: 3 consecutive backend failures.');
            TrackPlayer.pause();
            set({ 
                isPlaying: false, 
                playbackError: 'Vibra backend is currently unreachable. Please check your internet connection or try again later.' 
            });
        }
    },

    resetBackendFailures: () => {
        set({ consecutiveBackendFailures: 0, playbackError: null });
    },

    resumePlayback: async (item) => {
        try {
            const { track, position } = item;
            
            // Map the track object to expected raw shape for initializeQueue
            const formattedTrack = {
                ...track,
                artwork: track.artwork || (track as any).imageUrl,
            };

            // Stop any current progress loop before initializing
            stopProgressLoop();

            // Set the queue and start playing
            const success = await get().initializeQueue([formattedTrack], 0);
            
            if (success) {
                try {
                    await TrackPlayer.seekTo(position || 0);
                    await TrackPlayer.play();
                } catch (seekError) {
                    console.error('[PlayerStore] Error seeking during resume:', seekError);
                }
            }

        } catch (error) {
            console.error('[PlayerStore] Failed to resume playback:', error);
        }
    },

    reset: async () => {
        try {
            stopProgressLoop();
            await get().syncProgress();
            await TrackPlayer.reset();
            set({
                currentTrack: null,
                isPlaying: false,
                queue: [],
                currentIndex: -1,
                hasTrackedCurrentTrack: false,
                currentContext: null,
                activeHistoryId: null,
            });
        } catch (error) {
            console.error('[PlayerStore] Reset failed:', error);
        }
    },

    flushUnsyncedProgress: async () => {
        await flushUnsyncedProgress();
    },
}),
{
    name: 'vibra-player-storage',
    storage: createJSONStorage(() => mmkvStorage),
    version: 2,
    migrate: (persistedState: any, version: number) => {
        if (version === 0) {
            // v0 → v1: Discard originalQueue to halve the queue payload size
            const { originalQueue, ...rest } = persistedState;
            return rest;
        }
        if (version === 1) {
            // v1 → v2: MMKV migration. State shape is identical, just pass through.
            return persistedState;
        }
        return persistedState;
    },
    partialize: (state) => ({
        currentTrack: state.currentTrack ? sanitizeTrackForPersistence(state.currentTrack) : null,
        queue: state.queue.map(sanitizeTrackForPersistence),
        currentIndex: state.currentIndex,
        currentContext: state.currentContext,
        shuffleMode: state.shuffleMode,
        repeatMode: state.repeatMode,
    }),
    onRehydrateStorage: () => (state, error) => {
        if (error) {
            console.error('[PlayerStore] Hydration failed:', error);
            Sentry.captureException(error, {
                tags: { operation: 'store_hydration' }
            });
            return;
        }
        if (state) {
            state.consecutiveBackendFailures = 0;
            state.playbackError = null;
        }
        if (__DEV__) {
            const queueLength = state?.queue?.length ?? 0;
            const track = state?.currentTrack?.title ?? 'none';
            console.log(`[PlayerStore] Hydration complete. Queue: ${queueLength} tracks. Last track: "${track}".`);
        }
        updateWidgetState(state);
    }
}
)
);

// Trigger one-time async migration from AsyncStorage on first launch after this update.
// MMKV hydrates synchronously before React renders, so by the time initPlayer() fires
// in useEffect([]), state.queue is already populated — eliminating the hydration race.
migrateStoreToMMKV('vibra-player-storage').then((migrated) => {
    if (migrated) {
        if (__DEV__) console.log('[PlayerStore] AsyncStorage → MMKV migration complete. Rehydrating...');
        usePlayerStore.persist.rehydrate();
    }
});

// Auto-sync Android Auto catalog cache whenever the queue changes
let lastQueueRef: any = null;
usePlayerStore.subscribe((state) => {
    if (state.queue !== lastQueueRef) {
        lastQueueRef = state.queue;
        syncAutoCache(state.queue);
    }
});