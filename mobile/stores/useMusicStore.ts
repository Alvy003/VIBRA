import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { axiosInstance, setAuthToken } from "@/lib/axios";
import * as Haptics from 'expo-haptics';
import { mmkvStorage } from "@/lib/mmkvStorage";
import { migrateStoreToMMKV } from "@/lib/mmkvMigration";
import * as Sentry from '@sentry/react-native';
import { useToastStore } from './useToastStore';
import { usePlayerUIStore } from './usePlayerUIStore';
import { useNetworkStore } from './useNetworkStore';

interface Song {
    _id: string;
    title: string;
    artist: string;
    imageUrl: string;
    audioUrl: string;
    duration: number;
    externalId?: string;
    id?: string;
}

interface Album {
    _id: string;
    title: string;
    artist: string;
    imageUrl: string;
    songs: string[] | Song[];
    isActive?: boolean;
    createdAt?: string | number;
}

interface Playlist {
    _id: string;
    title: string;
    imageUrl: string;
    songs: any[];
    createdAt?: string | number;
}

interface SavedItem {
    _id: string;
    title: string;
    imageUrl: string;
    createdAt?: string | number;
}

interface MusicStore {
    albums: Album[];
    featuredSongs: Song[];
    featuredSongsFetchedAt?: number;
    trendingSongs: Song[];
    isLoading: boolean;
    musicError: string | null;
    likedSongs: Song[];
    recentlyPlayed: Song[];
    quickPicks: Song[];
    quickPicksFetchedAt?: number;
    recentCollections: any[];

    isAuthReady: boolean;
    setAuthReady: (ready: boolean) => void;
    currentAlbum: Album | null;
    isLoadingLyrics: boolean;
    refreshVersion: number;
    fetchAlbums: () => Promise<void>;
    fetchFeaturedSongs: (forceRefresh?: boolean) => Promise<void>;
    fetchTrendingSongs: () => Promise<void>;
    fetchAlbumById: (id: string) => Promise<void>;
    fetchLikedSongs: (token?: string) => Promise<void>;
    fetchRecentlyPlayed: () => Promise<void>;
    fetchQuickPicks: (forceRefresh?: boolean) => Promise<void>;
    fetchRecentCollections: () => Promise<void>;
    toggleLikeSong: (song: any) => Promise<boolean>;
    isSongLiked: (song: any) => boolean;
    isSongMatch: (track1: any, track2: any) => boolean;

    triggerRefresh: () => void;
    reset: () => void;
}


export const useMusicStore = create<MusicStore>()(
    persist(
        (set, get) => ({
            albums: [],
            featuredSongs: [],
            featuredSongsFetchedAt: 0,
            trendingSongs: [],
            currentAlbum: null,
            isLoading: false,
            musicError: null,
            likedSongs: [],
            recentlyPlayed: [],
            quickPicks: [],
            quickPicksFetchedAt: 0,
            recentCollections: [],
            isAuthReady: false,
            currentExternalArtist: null,
            isLoadingLyrics: false,
            refreshVersion: 0,
            setAuthReady: (ready) => set({ isAuthReady: ready }),

            fetchAlbums: async () => {
                if (__DEV__) {
                    console.log("[MusicStore] Fetching albums from:", axiosInstance.defaults.baseURL + "/albums");
                }
                set({ isLoading: true, musicError: null });

                try {
                    const response = await axiosInstance.get("/albums");
                    const data = Array.isArray(response.data) ? response.data : [];
                    if (__DEV__) {
                        console.log("[MusicStore] Albums received:", data.length);
                    }
                    set({ albums: data });
                } catch (error: any) {
                    Sentry.captureException(error);
                    const message = error.response?.data?.message || error.message || "Failed to fetch albums";
                    set({ musicError: message });

                } finally {

                    set({ isLoading: false });
                }
            },

            fetchFeaturedSongs: async (forceRefresh = false) => {
                const now = Date.now();
                const lastFetched = get().featuredSongsFetchedAt || 0;
                const hasCache = get().featuredSongs.length > 0;
                const isExpired = !lastFetched || (now - lastFetched > 86400000); // 24 hours TTL
                
                if (hasCache) {
                    const ageSec = Math.round((now - lastFetched) / 1000);
                    if (__DEV__) {
                        console.log(`[MusicStore] fetchFeaturedSongs called. forceRefresh: ${forceRefresh}, hasCache: ${hasCache}, cacheAge: ${ageSec}s, isExpired: ${isExpired}`);
                    }
                    if (!forceRefresh && !isExpired) {
                        if (__DEV__) {
                            console.log(`[MusicStore] Featured songs cache valid (Age: ${ageSec}s <= 86400s). Skipping fetch.`);
                        }
                        return;
                    }
                    if (__DEV__) {
                        console.log(`[MusicStore] Featured songs cache expired/forced (Age: ${ageSec}s). Running silent refresh.`);
                    }
                } else {
                    if (__DEV__) {
                        console.log("[MusicStore] No featured songs cache. Running initial fetch.");
                    }
                    set({ isLoading: true, musicError: null });
                }

                try {
                    const response = await axiosInstance.get("/songs/featured");
                    const data = Array.isArray(response.data) ? response.data : [];
                    
                    const prevDataStr = JSON.stringify(get().featuredSongs);
                    const newDataStr = JSON.stringify(data);
                    
                    if (prevDataStr !== newDataStr) {
                        if (__DEV__) {
                            console.log("[MusicStore] Featured songs updated:", data.length);
                        }
                        set({ featuredSongs: data, featuredSongsFetchedAt: Date.now() });
                    } else {
                        if (__DEV__) {
                            console.log("[MusicStore] Featured songs unchanged");
                        }
                        set({ featuredSongsFetchedAt: Date.now() });
                    }
                } catch (error: any) {
                    Sentry.captureException(error);
                    const message = error.response?.data?.message || error.message || "Failed to fetch featured songs";
                    set({ musicError: message });
                } finally {
                    if (!hasCache) {
                        set({ isLoading: false });
                    }
                }
            },

            fetchTrendingSongs: async () => {
                if (__DEV__) {
                    console.log("[MusicStore] Fetching trending songs from:", axiosInstance.defaults.baseURL + "/songs/trending");
                }
                try {
                    const response = await axiosInstance.get("/songs/trending");
                    const data = Array.isArray(response.data) ? response.data : [];
                    if (__DEV__) {
                        console.log("[MusicStore] Trending songs received:", data.length);
                    }
                    set({ trendingSongs: data });
                } catch (error: any) {
                    Sentry.captureException(error);
                    const message = error.response?.data?.message || error.message || "Failed to fetch trending songs";
                    set({ musicError: message });
                }


            },

            fetchAlbumById: async (id: string) => {
                set({ isLoading: true, musicError: null });
                try {
                    const response = await axiosInstance.get(`/albums/${id}`);
                    set({ currentAlbum: response.data });
                } catch (error: any) {
                    Sentry.captureException(error);
                    const message = error.response?.data?.message || error.message || "Failed to fetch album";
                    set({ musicError: message });
                } finally {
                    set({ isLoading: false });
                }
            },

            fetchLikedSongs: async (token) => {
                if (token) setAuthToken(token);
                try {
                    const res = await axiosInstance.get("/users/me/liked-songs");
                    set({ likedSongs: Array.isArray(res.data) ? res.data : [] });
                } catch (err: any) {
                    Sentry.captureException(err);
                }
            },

            fetchRecentlyPlayed: async () => {
                try {
                    const response = await axiosInstance.get("/history/recently-played?limit=6");
                    set({ recentlyPlayed: Array.isArray(response.data) ? response.data : [] });
                } catch (error: any) {
                    Sentry.captureException(error);
                }
            },

            fetchQuickPicks: async (forceRefresh = false) => {
                if (!get().isAuthReady && !forceRefresh) return;
                const now = Date.now();
                const lastFetched = get().quickPicksFetchedAt || 0;
                const hasCache = get().quickPicks.length > 0;
                const isExpired = !lastFetched || (now - lastFetched > 43200000); // 12 hours TTL
                
                if (hasCache) {
                    const ageSec = Math.round((now - lastFetched) / 1000);
                    if (__DEV__) {
                        console.log(`[MusicStore] fetchQuickPicks called. forceRefresh: ${forceRefresh}, hasCache: ${hasCache}, cacheAge: ${ageSec}s, isExpired: ${isExpired}`);
                    }
                    if (!forceRefresh && !isExpired) {
                        if (__DEV__) {
                            console.log(`[MusicStore] Quick picks cache valid (Age: ${ageSec}s <= 43200s). Skipping fetch.`);
                        }
                        return;
                    }
                    if (__DEV__) {
                        console.log(`[MusicStore] Quick picks cache expired/forced (Age: ${ageSec}s). Running silent refresh.`);
                    }
                } else {
                    if (__DEV__) {
                        console.log("[MusicStore] No quick picks cache. Running initial fetch.");
                    }
                }

                try {
                    const response = await axiosInstance.get("/stream/quick-picks");
                    const data = Array.isArray(response.data) ? response.data : [];
                    
                    const prevDataStr = JSON.stringify(get().quickPicks);
                    const newDataStr = JSON.stringify(data);
                    
                    if (prevDataStr !== newDataStr) {
                        set({ quickPicks: data, quickPicksFetchedAt: Date.now() });
                    } else {
                        set({ quickPicksFetchedAt: Date.now() });
                    }
                } catch (error: any) {
                    Sentry.captureException(error);
                }
            },

            fetchRecentCollections: async () => {
                try {
                    const response = await axiosInstance.get("/history/recent-collections");
                    set({ recentCollections: Array.isArray(response.data) ? response.data : [] });
                } catch (error: any) {
                    Sentry.captureException(error);
                }
            },
            toggleLikeSong: async (track: any) => {
                const prevState = get().likedSongs;
                const isLiked = get().isSongLiked(track);

                if (!useNetworkStore.getState().isOnline) {
                    useToastStore.getState().showToast({
                        message: "Available when you're back online.",
                        iconType: 'none',
                        duration: 2500
                    });
                    return isLiked;
                }

                try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    
                    // Optimistic update
                    if (isLiked) {
                        set({ likedSongs: prevState.filter(s => !get().isSongMatch(s, track)) });
                    } else {
                        set({ likedSongs: [track, ...prevState] });
                    }

                    let res;
                    const getLocalId = (t: any) => {
                        if (!t) return null;
                        const source = t.source;
                        const isExternal = source === 'jiosaavn' || source === 'youtube' || 
                            (t.externalId && !/^[0-9a-fA-F]{24}$/.test(String(t.externalId)));
                        if (isExternal) return null;

                        if (t._id && /^[0-9a-fA-F]{24}$/.test(String(t._id))) return String(t._id);
                        if (t.id && /^[0-9a-fA-F]{24}$/.test(String(t.id))) return String(t.id);
                        return null;
                    };

                    if (isLiked) {
                        // UNLIKE
                        const likedSong = prevState.find((s: any) => get().isSongMatch(s, track));
                        const isExternal = (likedSong as any)?._likedType === "external" || 
                            (!!(likedSong as any)?.externalId && !/^[0-9a-fA-F]{24}$/.test(String((likedSong as any)?.externalId)));
                        
                        if (isExternal) {
                            const extId = (likedSong as any)?.externalId || track.externalId || track.id;
                            res = await axiosInstance.delete(`/users/me/unlike-external/${String(extId)}`);
                        } else {
                            const localId = getLocalId(likedSong) || getLocalId(track);
                            if (localId) {
                                res = await axiosInstance.delete(`/users/me/unlike/${localId}`);
                            }
                        }
                    } else {
                        // LIKE
                        const localId = getLocalId(track);
                        if (localId) {
                            res = await axiosInstance.post(`/users/me/like/${localId}`);
                        } else {
                            const extId = track.externalId || track.id;
                            const cleanId = String(extId).replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/, "");
                            const source = track.source || (String(extId).startsWith("youtube_") ? "youtube" : "jiosaavn");
                            const fallbackUrl = `/api/stream/play/${source}/${cleanId}`;

                            res = await axiosInstance.post("/users/me/like-external", {
                                title: track.title,
                                artist: track.artist,
                                imageUrl: track.imageUrl || track.artwork,
                                audioUrl: track.audioUrl || track.url || track.streamUrl || fallbackUrl,
                                duration: track.duration,
                                externalId: String(extId),
                                source
                            });
                        }
                    }
                    
                    // Sync full state from response (backend returns the merged array)
                    if (res?.data && Array.isArray(res.data)) {
                        set({ likedSongs: res.data });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }

                    // Show Toast Notification
                    if (isLiked) {
                        useToastStore.getState().showToast({
                            message: "Removed from Liked Songs",
                            iconType: 'none',
                            duration: 2500
                        });
                    } else {
                        useToastStore.getState().showToast({
                            message: "Added to Liked Songs",
                            iconType: 'heart',
                            action: {
                                label: "Change",
                                onPress: () => {
                                    const latestRef = usePlayerUIStore.getState().addTrackSheetRef;
                                    if (latestRef) {
                                        latestRef.open(track);
                                    }
                                }
                            },
                            duration: 2500
                        });
                    }

                    return !isLiked;
                } catch (err: any) {
                    Sentry.captureException(err);
                    // Revert on error
                    set({ likedSongs: prevState });
                    return isLiked;
                }
            },

            isSongLiked: (track: any) => {
                if (!track) return false;
                return get().likedSongs.some((s: any) => get().isSongMatch(s, track));
            },

            isSongMatch: (track1: any, track2: any) => {
                if (!track1 || !track2) return false;
                const ids1 = [track1._id, track1.externalId, track1.id].filter(Boolean).map(String);
                const ids2 = [track2._id, track2.externalId, track2.id].filter(Boolean).map(String);
                
                // Primary check: ID overlap
                if (ids1.some(id => ids2.includes(id))) return true;

                // Fallback check: string identity (if one is just an ID string)
                if (typeof track1 === 'string' && ids2.includes(String(track1))) return true;
                if (typeof track2 === 'string' && ids1.includes(String(track2))) return true;

                return false;
            },


            triggerRefresh: () => {
                set((state) => ({ refreshVersion: state.refreshVersion + 1 }));
            },

            reset: () => {
                set({
                    likedSongs: [],
                    recentlyPlayed: [],
                    quickPicks: [],
                    quickPicksFetchedAt: 0,
                    recentCollections: [],
                    currentAlbum: null,
                    musicError: null,
                    isLoading: false
                    // We keep featured/trending/albums as they are general discovery content
                });
            },
        }),
        {
            name: 'vibra-music-storage',
            storage: createJSONStorage(() => mmkvStorage),
            version: 1,
            migrate: (persistedState: any, version: number) => {
                if (version === 0) {
                    // Discard oversized server-truth data from legacy v0 persistence
                    return {
                        likedSongs: persistedState.likedSongs || [],
                    };
                }
                return persistedState;
            },
            partialize: (state) => ({
                likedSongs: state.likedSongs,
                featuredSongs: state.featuredSongs,
                featuredSongsFetchedAt: state.featuredSongsFetchedAt,
                quickPicks: state.quickPicks,
                quickPicksFetchedAt: state.quickPicksFetchedAt,
            }),
            onRehydrateStorage: () => (state) => {
                if (__DEV__) {
                    console.log(`[MusicStore] Hydration complete. Liked songs: ${state?.likedSongs?.length ?? 0}. Cached featured songs: ${state?.featuredSongs?.length ?? 0}. Cached quick picks: ${state?.quickPicks?.length ?? 0} (FetchedAt: ${state?.quickPicksFetchedAt})`);
                }
            }
        }
    )
);

// Trigger one-time async migration from AsyncStorage on first launch.
// likedSongs are now synchronously available on first render — no more heart-icon flicker.
migrateStoreToMMKV('vibra-music-storage').then((migrated) => {
    if (migrated) {
        if (__DEV__) console.log('[MusicStore] AsyncStorage → MMKV migration complete. Rehydrating...');
        useMusicStore.persist.rehydrate();
    }
});

