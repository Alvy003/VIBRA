import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { axiosInstance, setAuthToken } from "@/lib/axios";
import * as Haptics from 'expo-haptics';
import { mmkvStorage } from "@/lib/mmkvStorage";
import { migrateStoreToMMKV } from "@/lib/mmkvMigration";

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
    trendingSongs: Song[];
    isLoading: boolean;
    musicError: string | null;
    likedSongs: Song[];
    recentlyPlayed: Song[];
    quickPicks: Song[];
    recentCollections: any[];
    frequentCollections: any[];


    currentAlbum: Album | null;
    fetchAlbums: () => Promise<void>;
    fetchFeaturedSongs: () => Promise<void>;
    fetchTrendingSongs: () => Promise<void>;
    fetchAlbumById: (id: string) => Promise<void>;
    fetchLikedSongs: (token?: string) => Promise<void>;
    fetchRecentlyPlayed: () => Promise<void>;
    fetchQuickPicks: () => Promise<void>;
    fetchRecentCollections: () => Promise<void>;
    fetchFrequentCollections: () => Promise<void>;
    toggleLikeSong: (song: any) => Promise<boolean>;
    isSongLiked: (song: any) => boolean;
    isSongMatch: (track1: any, track2: any) => boolean;
    reset: () => void;
}


export const useMusicStore = create<MusicStore>()(
    persist(
        (set, get) => ({
            albums: [],
            featuredSongs: [],
            trendingSongs: [],
            currentAlbum: null,
            isLoading: false,
            musicError: null,
            likedSongs: [],
            recentlyPlayed: [],
            quickPicks: [],
            recentCollections: [],
            frequentCollections: [],

            fetchAlbums: async () => {
                console.log("[MusicStore] Fetching albums from:", axiosInstance.defaults.baseURL + "/albums");
                set({ isLoading: true, musicError: null });

                try {
                    const response = await axiosInstance.get("/albums");
                    const data = Array.isArray(response.data) ? response.data : [];
                    console.log("[MusicStore] Albums received:", data.length);
                    set({ albums: data });
                } catch (error: any) {
                    console.error("[MusicStore] Fetch error:", error.message);
                    const message = error.response?.data?.message || error.message || "Failed to fetch albums";
                    set({ musicError: message });

                } finally {

                    set({ isLoading: false });
                }
            },

            fetchFeaturedSongs: async () => {
                console.log("[MusicStore] Fetching featured songs from:", axiosInstance.defaults.baseURL + "/songs/featured");
                try {
                    const response = await axiosInstance.get("/songs/featured");
                    const data = Array.isArray(response.data) ? response.data : [];
                    console.log("[MusicStore] Featured songs received:", data.length);
                    set({ featuredSongs: data });
                } catch (error: any) {
                    console.error("[MusicStore] Fetch error:", error.message);
                    const message = error.response?.data?.message || error.message || "Failed to fetch featured songs";
                    set({ musicError: message });

                }

            },

            fetchTrendingSongs: async () => {
                console.log("[MusicStore] Fetching trending songs from:", axiosInstance.defaults.baseURL + "/songs/trending");
                try {
                    const response = await axiosInstance.get("/songs/trending");
                    const data = Array.isArray(response.data) ? response.data : [];
                    console.log("[MusicStore] Trending songs received:", data.length);
                    set({ trendingSongs: data });
                } catch (error: any) {
                    console.error("[MusicStore] Fetch error:", error.message);
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
                    console.error("[MusicStore] Fetch album error:", error.message);
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
                    console.error("[MusicStore] Liked songs error:", err.message);
                }
            },

            fetchRecentlyPlayed: async () => {
                try {
                    const response = await axiosInstance.get("/history/recently-played?limit=6");
                    set({ recentlyPlayed: Array.isArray(response.data) ? response.data : [] });
                } catch (error: any) {
                    console.error("[MusicStore] Failed to fetch recently played:", error.message);
                }
            },

            fetchQuickPicks: async () => {
                try {
                    const response = await axiosInstance.get("/stream/quick-picks");
                    set({ quickPicks: Array.isArray(response.data) ? response.data : [] });
                } catch (error: any) {
                    console.error("[MusicStore] Failed to fetch quick picks:", error.message);
                }
            },

            fetchRecentCollections: async () => {
                try {
                    const response = await axiosInstance.get("/history/recent-collections");
                    set({ recentCollections: Array.isArray(response.data) ? response.data : [] });
                } catch (error: any) {
                    console.error("[MusicStore] Failed to fetch recent collections:", error.message);
                }
            },
            
            fetchFrequentCollections: async () => {
                try {
                    const response = await axiosInstance.get("/history/frequent-collections?limit=6");
                    set({ frequentCollections: Array.isArray(response.data) ? response.data : [] });
                } catch (error: any) {
                    console.error("[MusicStore] Failed to fetch frequent collections:", error.message);
                }
            },

            toggleLikeSong: async (track: any) => {
                const prevState = get().likedSongs;
                const isLiked = get().isSongLiked(track);

                try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    
                    // Optimistic update
                    if (isLiked) {
                        set({ likedSongs: prevState.filter(s => !get().isSongMatch(s, track)) });
                    } else {
                        set({ likedSongs: [track, ...prevState] });
                    }

                    let res;
                    if (isLiked) {
                        // UNLIKE
                        const likedSong = prevState.find((s: any) => get().isSongMatch(s, track));
                        const isExternal = (likedSong as any)?._likedType === "external" || !!(likedSong as any)?.externalId;
                        
                        if (isExternal) {
                            const extId = (likedSong as any)?.externalId || track.externalId || track.id;
                            res = await axiosInstance.delete(`/users/me/unlike-external/${String(extId)}`);
                        } else {
                            const localId = (likedSong as any)?._id || track._id;
                            res = await axiosInstance.delete(`/users/me/unlike/${localId}`);
                        }
                    } else {
                        // LIKE
                        if (track.externalId || track.id) {
                            res = await axiosInstance.post("/users/me/like-external", {
                                title: track.title,
                                artist: track.artist,
                                imageUrl: track.imageUrl || track.artwork,
                                audioUrl: track.audioUrl || track.url,
                                duration: track.duration,
                                externalId: String(track.externalId || track.id),
                                source: track.source || 'jiosaavn'
                            });
                        } else {
                            const id = track._id || track.id;
                            res = await axiosInstance.post(`/users/me/like/${id}`);
                        }
                    }
                    
                    // Sync full state from response (backend returns the merged array)
                    if (res?.data && Array.isArray(res.data)) {
                        set({ likedSongs: res.data });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                    return !isLiked;
                } catch (err: any) {
                    const errorMsg = err.response?.data?.message || err.message;
                    console.error("[MusicStore] toggleLikeSong error:", errorMsg);
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

            reset: () => {
                set({
                    likedSongs: [],
                    recentlyPlayed: [],
                    quickPicks: [],
                    recentCollections: [],
                    frequentCollections: [],
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
            }),
            onRehydrateStorage: () => (state) => {
                if (__DEV__) {
                    console.log(`[MusicStore] Hydration complete. Liked songs: ${state?.likedSongs?.length ?? 0}.`);
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

