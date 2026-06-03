import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/mmkvStorage';
import { migrateStoreToMMKV } from '@/lib/mmkvMigration';
import TrackPlayer, {
    RepeatMode,
    State,
    Event as TrackPlayerEvent,
    type Track
} from 'react-native-track-player';
import { useStreamStore } from './useStreamStore';
import { setupPlayer } from '@/lib/trackPlayerSetup';
import * as Sentry from '@sentry/react-native';
import { AppState } from 'react-native';

const DUMMY_URL = 'https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3';
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";
const JIOSAAVN_REFERER = "https://www.jiosaavn.com/";

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
    hasTrackedCurrentTrack: boolean;
    currentContext: { type: 'album' | 'playlist' | 'artist' | 'discovery' | 'search', id: string, title?: string } | null;
    playbackState: State | null;
    skipFailureCount: number;
    isResolving: boolean;

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
    initializeQueue: (tracks: Track[], startIndex?: number, context?: { type: 'album' | 'playlist' | 'artist' | 'discovery' | 'search', id: string, title?: string }) => Promise<void>;
    addToQueue: (track: Track) => Promise<void>;
    setPlayNext: (track: Track) => Promise<void>;
    removeFromQueue: (index: number) => Promise<void>;
    clearQueue: () => Promise<void>;

    // Modes
    toggleShuffle: () => Promise<void>;
    toggleRepeat: () => Promise<void>;
    reorderQueue: (fromIndex: number, toIndex: number) => void;

    // Helpers
    resolveAudioUrl: (track: Track, force?: boolean) => Promise<string | null>;
    syncWithTrackPlayer: () => Promise<void>;
    preloadUpcomingTracks: () => Promise<void>;

    // Auto-fill
    _isRefilling: boolean;
    autoRefillQueue: () => Promise<void>;

    // History
    trackHistory: (track: Track) => Promise<void>;
    reset: () => Promise<void>;
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
    _isRefilling: false,
    hasTrackedCurrentTrack: false,
    currentContext: null,
    playbackState: null,
    skipFailureCount: 0,
    isResolving: false,

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
            AppState.addEventListener('change', (nextAppState) => {
                Sentry.setTag('app_state', nextAppState);
            });
        } catch (e) {
            // Silently ignore AppState listener failure
        }

        try {
            const success = await setupPlayer();
            set({ isPlayerReady: success });

            if (success) {
                // --- GLOBAL LISTENERS ---
                // Native Track Change (Auto-advance & Resolution)
                TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackActiveTrackChanged, async (event) => {
                    const track = event.track;
                    const index = event.index;

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
                        get().trackHistory(track);
                        get().preloadUpcomingTracks();
                    }
                });

                // Native Playback State Change
                TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackState, (event) => {
                    set({
                        isPlaying: event.state === State.Playing,
                        playbackState: event.state
                    });
                });

                // Queue Ended
                TrackPlayer.addEventListener(TrackPlayerEvent.PlaybackQueueEnded, () => {
                    set({ isPlaying: false });
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

                    const isBadStatus = error.code === 'android-io-bad-http-status' || error.message?.includes('403') || error.message?.includes('410');
                    
                    const newFailureCount = state.skipFailureCount + 1;
                    set({ skipFailureCount: newFailureCount });

                    if (newFailureCount >= 3) {
                        console.error('[PlayerStore] Skip failure limit reached. Stopping playback.');
                        set({ isPlaying: false, skipFailureCount: 0 });
                        return;
                    }

                    // --- REFRESH LOGIC ---
                    if (isBadStatus && state.currentTrack && (state.currentTrack as any).source !== 'local') {
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
                    
                    // Add all tracks to native player
                    await TrackPlayer.add(state.queue);
                    
                    // Skip to last active index
                    if (state.currentIndex >= 0 && state.currentIndex < state.queue.length) {
                        try {
                            await TrackPlayer.skip(state.currentIndex);
                            
                            // Immediately refresh current track URL so playback works
                            const currentTrack = state.queue[state.currentIndex];
                            const freshUrl = await get().resolveAudioUrl(currentTrack, true); // force=true → redirector
                            if (freshUrl && freshUrl !== DUMMY_URL) {
                                await TrackPlayer.load({ ...currentTrack, url: freshUrl });
                            }

                            // Ensure repeat mode is also restored
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
                                    queueLength: state.queue.length,
                                    currentIndex: state.currentIndex,
                                }
                            });
                        }
                    }
                }

                // Sync state AFTER restoration (or normal boot) to avoid wiping hydrated queue
                await get().syncWithTrackPlayer();
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

            set({
                queue: queue.map((t: any) => ({ ...t, artwork: t.artwork || t.imageUrl || undefined })),
                currentIndex: index ?? -1,
                currentTrack: index !== undefined ? { ...queue[index], artwork: queue[index].artwork || queue[index].imageUrl || undefined } : null,
                isPlaying: state.state === State.Playing,
            });
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

                if (url) return url;
            }

            return track.url || null;
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

        return track.url;
    },

    // ═══════════════════════════════════════════
    // PLAYBACK CONTROLS
    // ═══════════════════════════════════════════
    playTrack: async (track: Track, context?: { type: 'album' | 'playlist' | 'artist' | 'discovery' | 'search', id: string, title?: string }) => {
        // console.log(`[PlayerStore] playTrack called. Context:`, context);
        try {
            // Resolve URL if needed
            const playableUrl = await get().resolveAudioUrl(track);
            if (!playableUrl) {
                console.error('[PlayerStore] Could not resolve URL for:', track.title);
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

            const playableTrack: Track = {
                ...track,
                id: track.id || (track as any)._id || Math.random().toString(),
                url: playableUrl,
                title: track.title || 'Unknown Title',
                artist: track.artist || 'Unknown Artist',
                artwork: track.artwork || (track as any).imageUrl || undefined,
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Referer": "https://www.jiosaavn.com/"
                }
            };

            // console.log(`[PlayerStore] Resolving track ${track.title} with URL:`, playableUrl);

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
    },

    playPrevious: async () => {
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
    },

    // ═══════════════════════════════════════════
    // QUEUE MANAGEMENT
    // ═══════════════════════════════════════════
    initializeQueue: async (tracks: Track[], startIndex: number = 0, context?: { type: 'album' | 'playlist' | 'artist' | 'discovery' | 'search', id: string, title?: string }) => {
        try {
            if (!tracks.length) return;

            // Ensure we immediately resolve the URL for the first playable track
            const safeIndex = Math.min(startIndex, tracks.length - 1);
            const startTrack = tracks[safeIndex];
            const startUrl = await get().resolveAudioUrl(startTrack);

            const resolvedTracks = tracks.map((track, i) => {
                const mappedTrack: Track = {
                    ...track,
                    id: track.id || (track as any)._id || (track as any).externalId || `track-${i}-${Date.now()}`,
                    title: track.title || 'Unknown Title',
                    artist: track.artist || 'Unknown Artist',
                    artwork: track.artwork || (track as any).imageUrl || undefined,
                    // Fix: Map any available URL immediately to avoid DUMMY_URL race
                    url: track.url || (track as any).streamUrl || (track as any).audioUrl || (i === safeIndex ? startUrl : DUMMY_URL),
                    headers: {
                        "User-Agent": MOBILE_UA,
                        "Referer": JIOSAAVN_REFERER
                    }
                };
                return mappedTrack;
            });

            await TrackPlayer.reset();
            await TrackPlayer.add(resolvedTracks);

            // Re-apply options
            const { setupPlayer } = await import('@/lib/trackPlayerSetup');
            await setupPlayer();

            await TrackPlayer.skip(safeIndex);
            await TrackPlayer.play();

            set({
                queue: resolvedTracks,
                originalQueue: [...resolvedTracks], // Save original order
                currentTrack: resolvedTracks[safeIndex],
                currentIndex: safeIndex,
                isPlaying: true,
                currentContext: context || null,
                shuffleMode: false, // Reset shuffle on new queue
            });

            // Async resolve the rest
            get().preloadUpcomingTracks();

            // Setup auto-refill if queue is short
            const remainingTracks = resolvedTracks.length - 1 - safeIndex;
            if (remainingTracks < 5) {
                get().autoRefillQueue();
            }

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

                    // Pre-resolve URLs
                    if ((track as any).source && (!track.url || track.url === DUMMY_URL)) {
                        const resolvedUrl = await get().resolveAudioUrl(track);
                        if (resolvedUrl && track.url !== resolvedUrl) {
                            const updatedTrack = {
                                ...track,
                                url: resolvedUrl,
                                artwork: track.artwork || (track as any).imageUrl || undefined
                            };

                            // Update native player queue
                            await TrackPlayer.remove(targetIdx);
                            await TrackPlayer.add([updatedTrack], targetIdx);

                            // Update internal state
                            set((s) => {
                                const newQueue = [...s.queue];
                                newQueue[targetIdx] = updatedTrack;
                                return { queue: newQueue };
                            });
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
            const url = await get().resolveAudioUrl(track);
            const playableTrack = {
                ...track,
                url: url || DUMMY_URL,
                artwork: track.artwork || (track as any).imageUrl || '',
                headers: {
                    "User-Agent": MOBILE_UA,
                    "Referer": JIOSAAVN_REFERER
                }
            };

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
            const url = await get().resolveAudioUrl(track);
            const playableTrack = {
                ...track,
                url: url || DUMMY_URL,
                artwork: track.artwork || (track as any).imageUrl || '',
                headers: {
                    "User-Agent": MOBILE_UA,
                    "Referer": JIOSAAVN_REFERER
                }
            };

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

                    const tracksToAppend = otherTracks.map(t => ({
                        id: t.id,
                        url: t.url,
                        title: t.title,
                        artist: t.artist,
                        artwork: t.artwork,
                        source: t.source || 'jiosaavn',
                        headers: (t as any).headers
                    }));
                    await TrackPlayer.add(tracksToAppend);
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
                        const tracksToAdd = originalQueue.map(t => ({
                            id: t.id,
                            url: t.url,
                            title: t.title,
                            artist: t.artist,
                            artwork: t.artwork,
                            source: t.source || 'jiosaavn',
                            headers: (t as any).headers
                        }));

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
        const modes: ('off' | 'track' | 'queue')[] = ['off', 'track', 'queue'];
        const currentIdx = modes.indexOf(get().repeatMode);
        const nextMode = modes[(currentIdx + 1) % modes.length];

        let tpMode = RepeatMode.Off;
        if (nextMode === 'track') tpMode = RepeatMode.Track;
        if (nextMode === 'queue') tpMode = RepeatMode.Queue;

        await TrackPlayer.setRepeatMode(tpMode);
        set({ repeatMode: nextMode });
    },

    reorderQueue: (fromIndex: number, toIndex: number) => {
        set((state) => {
            const newQueue = [...state.queue];
            const [removed] = newQueue.splice(fromIndex, 1);
            newQueue.splice(toIndex, 0, removed);
            return { queue: newQueue };
        });
    },

    // ═══════════════════════════════════════════
    // AUTO-REFILL QUEUE
    // ═══════════════════════════════════════════
    autoRefillQueue: async () => {
        const state = get();
        if (state._isRefilling || !state.currentTrack) return;

        const remaining = state.queue.length - 1 - state.currentIndex;
        if (remaining >= 5) return;

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
            let recommendedSongs: any[] = [];

            // ─── Strategy 1: Targeted Recommendations (JioSaavn/YouTube) ───
            if (trackId && (source === 'jiosaavn' || source === 'youtube')) {
                try {
                    const { useOnboardingStore } = await import('./useOnboardingStore');
                    const langs = useOnboardingStore.getState().getLanguageString();

                    const res = await axiosInstance.get(`/stream/recommendations/${source}/${trackId}`, {
                        params: { languages: langs, limit: 12 }
                    });
                    // API returns { results: [...] }
                    const recoResults = res.data?.results || [];

                    if (Array.isArray(recoResults) && recoResults.length > 0) {
                        recommendedSongs = recoResults;
                    }
                } catch (err) {
                    // console.error('[Autorefill] Strategy 1 failed:', err);
                }
            }

            // ─── Strategy 2: Search-based fallback (like web) ───
            if (recommendedSongs.length < 3 && track.title) {
                try {
                    const query = (track.artist && track.artist !== 'Unknown Artist')
                        ? `${track.artist.split(',')[0].trim()} ${track.title}`
                        : track.title;

                    const searchRes = await axiosInstance.get("/stream/search", {
                        params: { q: query, limit: 12, source: 'jiosaavn' },
                    });
                    const searchResults = searchRes.data?.results || [];

                    if (Array.isArray(searchResults)) {
                        recommendedSongs = [...recommendedSongs, ...searchResults];
                    }
                } catch (err) {
                    // console.error('[Autorefill] Strategy 2 failed:', err);
                }
            }

            // ─── Strategy 2.5: Pure Artist Search (if still low on songs) ───
            if (recommendedSongs.length < 5 && track.artist && track.artist !== 'Unknown Artist') {
                try {
                    const artistOnly = track.artist.split(',')[0].trim();
                    const artistRes = await axiosInstance.get("/stream/search", {
                        params: { q: artistOnly, limit: 10, source: 'jiosaavn' },
                    });
                    const artistResults = artistRes.data?.results || [];
                    if (Array.isArray(artistResults)) {
                        recommendedSongs = [...recommendedSongs, ...artistResults];
                    }
                } catch (err) {
                    // silent
                }
            }

            // ─── Strategy 3: Daily Mix Fallback (Absolute last resort) ───
            if (recommendedSongs.length < 4) {
                try {
                    await streamStore.fetchDailyMix();
                    const dailyMix = streamStore.dailyMix || [];
                    if (Array.isArray(dailyMix)) {
                        recommendedSongs = [...recommendedSongs, ...dailyMix];
                    }
                } catch (err) {
                    // console.error('[Autorefill] Strategy 3 failed:', err);
                }
            }

            if (recommendedSongs.length > 0) {
                // Robust deduplication
                const existingIds = new Set(get().queue.map(t => t.id?.toString()));
                const existingExternalIds = new Set(get().queue.map(t => (t as any).externalId?.toString()));

                const uniqueNew = recommendedSongs
                    .filter(s => {
                        const sid = (s.externalId || s.id)?.toString();
                        return sid && !existingIds.has(sid) && !existingExternalIds.has(sid);
                    })
                    .slice(0, 10)
                    .map((s: any) => ({
                        id: s.externalId || s.id,
                        title: s.title,
                        artist: s.artist,
                        duration: s.duration,
                        artwork: s.imageUrl || s.artwork,
                        url: s.streamUrl || s.audioUrl || DUMMY_URL,
                        source: s.source || 'jiosaavn',
                        headers: {
                            "User-Agent": MOBILE_UA,
                            "Referer": JIOSAAVN_REFERER
                        }
                    }));

                if (uniqueNew.length > 0) {
                    await TrackPlayer.add(uniqueNew);
                    set((s) => ({ queue: [...s.queue, ...uniqueNew] }));
                    // console.log(`[SmartAutoplay] Refilled ${uniqueNew.length} tracks`);
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

            if (isExternal) {
                await axiosInstance.post('/history/track', {
                    songId: track.id,
                    isExternal: true,
                    context: get().currentContext,
                    externalData: {
                        title: track.title,
                        artist: track.artist,
                        imageUrl: track.artwork || track.url,
                        duration: track.duration,
                        source: track.source || 'jiosaavn',
                        externalId: track.id,
                        album: track.album || '',
                        albumId: (track as any).albumId || '',
                        streamUrl: track.url || '',
                    },
                });
            } else {
                await axiosInstance.post('/history/track', {
                    songId: track.id,
                    isExternal: false,
                });
            }
        } catch (error) {
            console.error('[PlayerStore] Failed to track history:', error);
        }
    },

    reset: async () => {
        try {
            await TrackPlayer.reset();
            set({
                currentTrack: null,
                isPlaying: false,
                queue: [],
                currentIndex: -1,
                hasTrackedCurrentTrack: false,
                currentContext: null,
            });
        } catch (error) {
            console.error('[PlayerStore] Reset failed:', error);
        }
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
        if (__DEV__) {
            const queueLength = state?.queue?.length ?? 0;
            const track = state?.currentTrack?.title ?? 'none';
            console.log(`[PlayerStore] Hydration complete. Queue: ${queueLength} tracks. Last track: "${track}".`);
        }
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