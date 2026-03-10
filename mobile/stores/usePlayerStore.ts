// stores/usePlayerStore.ts
import { create } from 'zustand';
import TrackPlayer, {
    Track,
    RepeatMode,
    State,
} from 'react-native-track-player';
import { useStreamStore } from './useStreamStore';
import { setupPlayer } from '@/lib/trackPlayerSetup';

const DUMMY_URL = 'https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3';

interface PlayerStore {
    // State
    currentTrack: Track | null;
    isPlaying: boolean;
    queue: Track[];
    currentIndex: number;
    shuffleMode: boolean;
    repeatMode: 'off' | 'track' | 'queue';
    isPlayerReady: boolean;

    // Core actions
    initPlayer: () => Promise<void>;
    playTrack: (track: Track) => Promise<void>;
    pauseTrack: () => Promise<void>;
    resumeTrack: () => Promise<void>;
    togglePlay: () => Promise<void>;
    playNext: () => Promise<void>;
    playPrevious: () => Promise<void>;
    seekTo: (position: number) => Promise<void>;

    // Queue management
    initializeQueue: (tracks: Track[], startIndex?: number) => Promise<void>;
    addToQueue: (track: Track) => Promise<void>;
    setPlayNext: (track: Track) => Promise<void>;
    removeFromQueue: (index: number) => Promise<void>;
    clearQueue: () => Promise<void>;

    // Modes
    toggleShuffle: () => Promise<void>;
    toggleRepeat: () => Promise<void>;

    // Helpers
    resolveAudioUrl: (track: Track) => Promise<string | null>;
    syncWithTrackPlayer: () => Promise<void>;
    preloadUpcomingTracks: () => Promise<void>;

    // Auto-fill
    _isRefilling: boolean;
    autoRefillQueue: () => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
    currentTrack: null,
    isPlaying: false,
    queue: [],
    currentIndex: -1,
    shuffleMode: false,
    repeatMode: 'off',
    isPlayerReady: false,
    _isRefilling: false,

    // ═══════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════
    initPlayer: async () => {
        try {
            const success = await setupPlayer();
            set({ isPlayerReady: success });

            if (success) {
                // Sync state with TrackPlayer
                await get().syncWithTrackPlayer();
            }
        } catch (error) {
            console.error('[PlayerStore] Init failed:', error);
            set({ isPlayerReady: false });
        }
    },

    syncWithTrackPlayer: async () => {
        try {
            const queue = await TrackPlayer.getQueue();
            const index = await TrackPlayer.getActiveTrackIndex();
            const state = await TrackPlayer.getPlaybackState();

            set({
                queue: queue.map(t => ({ ...t, artwork: t.artwork || t.imageUrl || '' })),
                currentIndex: index ?? -1,
                currentTrack: index !== undefined ? { ...queue[index], artwork: queue[index].artwork || queue[index].imageUrl || '' } : null,
                isPlaying: state.state === State.Playing,
            });
        } catch (error) {
            console.error('[PlayerStore] Sync failed:', error);
        }
    },

    // ═══════════════════════════════════════════
    // URL RESOLUTION
    // ═══════════════════════════════════════════
    resolveAudioUrl: async (track: Track): Promise<string | null> => {
        if (!track.url || typeof track.url !== 'string') return null;

        // Local/backend URLs (direct)
        if (
            track.url.includes('http') &&
            !(track as any).source
        ) {
            return track.url;
        }

        try {
            const { getPlayableUrl } = useStreamStore.getState();

            const url = await getPlayableUrl({
                ...track,
                videoId: (track as any).videoId || (track as any).id || '',
                streamUrl: (track as any).streamUrl || track.url,
                audioUrl: (track as any).audioUrl || track.url,
            });

            return url || track.url || null;
        } catch (error) {
            console.error('[PlayerStore] resolveAudioUrl error:', error);
        }

        return track.url;
    },

    // ═══════════════════════════════════════════
    // PLAYBACK CONTROLS
    // ═══════════════════════════════════════════
    playTrack: async (track: Track) => {
        try {
            // Resolve URL if needed
            const playableUrl = await get().resolveAudioUrl(track);
            if (!playableUrl) {
                console.error('[PlayerStore] Could not resolve URL for:', track.title);
                return;
            }

            const playableTrack = {
                ...track,
                url: playableUrl,
                artwork: track.artwork || (track as any).imageUrl || '',
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Referer": "https://www.jiosaavn.com/"
                }
            };

            // console.log(`[PlayerStore] Resolving track ${track.title} with URL:`, playableUrl);

            await TrackPlayer.reset();
            await TrackPlayer.add([playableTrack]);
            await TrackPlayer.play();

            set({
                currentTrack: playableTrack,
                isPlaying: true,
                currentIndex: 0,
                queue: [playableTrack],
            });
        } catch (error) {
            console.error('[PlayerStore] playTrack error:', error);
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
            // First sync state to ensure we have the correct queue and index if awoken from background
            await get().syncWithTrackPlayer();

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
                    const track = state.queue[0];
                    set({ currentTrack: track, currentIndex: 0, isPlaying: true });
                } else {
                    set({ isPlaying: false });
                }
                return;
            }

            let nextTrack = state.queue[nextIdx];

            // Resolve advanced streaming URLs before playing
            if ((nextTrack as any).source) {
                const resolvedUrl = await get().resolveAudioUrl(nextTrack);
                if (resolvedUrl && nextTrack.url !== resolvedUrl) {
                    const updatedTrack = { ...nextTrack, url: resolvedUrl };

                    await TrackPlayer.remove(nextIdx);
                    await TrackPlayer.add([updatedTrack], nextIdx);

                    const newQueue = [...state.queue];
                    newQueue[nextIdx] = updatedTrack;
                    set({ queue: newQueue });

                    nextTrack = updatedTrack;
                } else if (!resolvedUrl) {
                    set({ currentIndex: nextIdx });
                    await get().playNext();
                    return;
                }
            }

            await TrackPlayer.skip(nextIdx);
            await TrackPlayer.play();

            set({
                currentTrack: nextTrack,
                currentIndex: nextIdx,
                isPlaying: true,
            });

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
            // First sync state to ensure we have the correct queue and index if awoken from background
            await get().syncWithTrackPlayer();

            const position = await TrackPlayer.getPosition();

            // If more than 3 seconds in, restart current track
            if (position > 3) {
                await TrackPlayer.seekTo(0);
                return;
            }

            const currentIdx = await TrackPlayer.getActiveTrackIndex() ?? 0;

            if (currentIdx > 0) {
                await TrackPlayer.skipToPrevious();
                const track = await TrackPlayer.getTrack(currentIdx - 1);

                if (track) {
                    set({
                        currentTrack: track,
                        currentIndex: currentIdx - 1,
                        isPlaying: true,
                    });
                }
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
    initializeQueue: async (tracks: Track[], startIndex: number = 0) => {
        try {
            if (!tracks.length) return;

            // Ensure we immediately resolve the URL for the first playable track
            const safeIndex = Math.min(startIndex, tracks.length - 1);
            const startTrack = tracks[safeIndex];
            const startUrl = await get().resolveAudioUrl(startTrack);

            const resolvedTracks = tracks.map((track, i) => {
                const mappedTrack = {
                    ...track,
                    artwork: track.artwork || (track as any).imageUrl || '',
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Referer": "https://www.jiosaavn.com/"
                    }
                };
                if (i === safeIndex && startUrl) {
                    // console.log(`[PlayerStore] initQueue startUrl:`, startUrl);
                    return { ...mappedTrack, url: startUrl };
                }
                return { ...mappedTrack, url: mappedTrack.url || DUMMY_URL };
            });

            await TrackPlayer.reset();
            await TrackPlayer.add(resolvedTracks);

            await TrackPlayer.skip(safeIndex);
            await TrackPlayer.play();

            set({
                queue: resolvedTracks,
                currentTrack: resolvedTracks[safeIndex],
                currentIndex: safeIndex,
                isPlaying: true,
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
        }
    },

    preloadUpcomingTracks: async () => {
        try {
            const currentIdx = await TrackPlayer.getActiveTrackIndex();
            if (currentIdx === undefined) return;

            const state = get();

            // Pre-resolve next 2 tracks natively in the background
            for (let i = 1; i <= 2; i++) {
                const targetIdx = currentIdx + i;
                if (targetIdx < state.queue.length) {
                    const track = state.queue[targetIdx];
                    if ((track as any).source && (!track.url || track.url === DUMMY_URL)) {
                        const resolvedUrl = await get().resolveAudioUrl(track);
                        if (resolvedUrl && track.url !== resolvedUrl) {
                            const updatedTrack = { ...track, url: resolvedUrl };
                            await TrackPlayer.remove(targetIdx);
                            await TrackPlayer.add([updatedTrack], targetIdx);

                            const newQueue = [...get().queue];
                            newQueue[targetIdx] = updatedTrack;
                            set({ queue: newQueue });
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
            if (!track.url) {
                track.url = DUMMY_URL;
            }
            const url = await get().resolveAudioUrl(track);
            const playableTrack = {
                ...track,
                url: url || DUMMY_URL,
                artwork: track.artwork || (track as any).imageUrl || '',
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Referer": "https://www.jiosaavn.com/"
                }
            };

            // console.log(`[PlayerStore] addToQueue appending:`, playableTrack.url);
            await TrackPlayer.add([playableTrack]);

            set({ queue: [...get().queue, playableTrack] });
        } catch (error) {
            // console.error('[PlayerStore] addToQueue error:', error);
        }
    },

    setPlayNext: async (track: Track) => {
        try {
            if (!track.url) {
                track.url = DUMMY_URL;
            }
            const url = await get().resolveAudioUrl(track);
            const playableTrack = {
                ...track,
                url: url || DUMMY_URL,
                artwork: track.artwork || (track as any).imageUrl || '',
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Referer": "https://www.jiosaavn.com/"
                }
            };
            const currentIdx = await TrackPlayer.getActiveTrackIndex() ?? 0;
            const insertIdx = currentIdx + 1;

            // console.log(`[PlayerStore] setPlayNext appending:`, playableTrack.url);
            await TrackPlayer.add([playableTrack], insertIdx);

            const newQueue = [...get().queue];
            newQueue.splice(insertIdx, 0, playableTrack);
            set({ queue: newQueue });
        } catch (error) {
            console.error('[PlayerStore] setPlayNext error:', error);
        }
    },

    removeFromQueue: async (index: number) => {
        try {
            const state = get();

            // Don't remove currently playing track
            if (index === state.currentIndex) return;

            await TrackPlayer.remove(index);

            const newQueue = [...state.queue];
            newQueue.splice(index, 1);

            // Adjust current index if needed
            let newIndex = state.currentIndex;
            if (index < state.currentIndex) {
                newIndex = state.currentIndex - 1;
            }

            set({ queue: newQueue, currentIndex: newIndex });
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
        const newShuffle = !get().shuffleMode;
        set({ shuffleMode: newShuffle });

        // Note: Implement actual shuffle logic by reordering queue
        // TrackPlayer doesn't have built-in shuffle
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

    // ═══════════════════════════════════════════
    // AUTO-REFILL QUEUE
    // ═══════════════════════════════════════════
    autoRefillQueue: async () => {
        const state = get();
        if (state._isRefilling || !state.currentTrack) return;

        const remainingTracks = state.queue.length - 1 - state.currentIndex;
        if (remainingTracks >= 8) return;

        set({ _isRefilling: true });

        try {
            const currentTrack = state.currentTrack;
            let newSongs: Track[] = [];

            // 1. Local Search strategy (similar to web)
            try {
                const { axiosInstance } = require('@/lib/axios');
                const searchQuery = currentTrack.artist && currentTrack.artist !== 'Unknown Artist'
                    ? currentTrack.artist.split(',')[0].trim()
                    : currentTrack.title;

                if (searchQuery) {
                    const searchRes = await axiosInstance.get('/stream/search', {
                        params: { q: searchQuery, limit: 15, source: 'jiosaavn' }
                    });

                    const results = searchRes.data?.results || [];
                    newSongs = results
                        .filter((s: any) => s.streamUrl && s.externalId !== (currentTrack as any).externalId)
                        .slice(0, 10)
                        .map((s: any) => ({
                            id: s.externalId,
                            title: s.title,
                            artist: s.artist,
                            duration: s.duration,
                            artwork: s.imageUrl,
                            url: s.streamUrl || DUMMY_URL,
                            source: 'jiosaavn'
                        }));
                }
            } catch (error) {
                console.log('[PlayerStore] Search auto-refill failed', error);
            }

            // 2. Random fallback strategy
            if (newSongs.length < 5) {
                try {
                    const { axiosInstance } = require('@/lib/axios');
                    const res = await axiosInstance.get(`/songs/random?limit=${10 - newSongs.length}`);
                    const randomSongs = res.data || [];

                    const mappedRandom = randomSongs.map((s: any) => ({
                        id: s._id || s.externalId || Math.random().toString(),
                        title: s.title,
                        artist: s.artist,
                        duration: s.duration,
                        artwork: s.imageUrl,
                        url: s.audioUrl || s.streamUrl || DUMMY_URL,
                        source: s.source || 'local'
                    }));
                    newSongs = [...newSongs, ...mappedRandom];
                } catch (error) {
                    // console.log('[PlayerStore] Random auto-refill failed', error);
                }
            }

            if (newSongs.length > 0) {
                // Remove duplicates that are already in the queue
                const existingIds = new Set(state.queue.map(t => t.id));
                const uniqueNewSongs = newSongs.filter(s => !existingIds.has(s.id));

                if (uniqueNewSongs.length > 0) {
                    await TrackPlayer.add(uniqueNewSongs);
                    set((s) => ({ queue: [...s.queue, ...uniqueNewSongs] }));
                }
            }
        } catch (error) {
            // console.error('[PlayerStore] autoRefillQueue error', error);
        } finally {
            set({ _isRefilling: false });
        }
    },
}));