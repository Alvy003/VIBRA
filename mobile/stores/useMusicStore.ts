import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { axiosInstance, setAuthToken } from "@/lib/axios";

interface Song {
    _id: string;
    title: string;
    artist: string;
    imageUrl: string;
    audioUrl: string;
    duration: number;
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


    currentAlbum: Album | null;
    fetchAlbums: () => Promise<void>;
    fetchFeaturedSongs: () => Promise<void>;
    fetchTrendingSongs: () => Promise<void>;
    fetchAlbumById: (id: string) => Promise<void>;
    fetchLikedSongs: (token?: string) => Promise<void>;
    fetchRecentlyPlayed: () => Promise<void>;
    fetchQuickPicks: () => Promise<void>;
    fetchRecentCollections: () => Promise<void>;
    reset: () => void;
}


export const useMusicStore = create<MusicStore>()(
    persist(
        (set) => ({
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

            fetchAlbums: async () => {
                console.log("[MusicStore] Fetching albums from:", axiosInstance.defaults.baseURL + "/albums");
                set({ isLoading: true, musicError: null });

                try {
                    const response = await axiosInstance.get("/albums");
                    console.log("[MusicStore] Albums received:", response.data?.length);
                    set({ albums: response.data });
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
                    console.log("[MusicStore] Featured songs received:", response.data?.length);
                    set({ featuredSongs: response.data });
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
                    console.log("[MusicStore] Trending songs received:", response.data?.length);
                    set({ trendingSongs: response.data });
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
                    set({ likedSongs: res.data });
                } catch (err: any) {
                    console.error("[MusicStore] Liked songs error:", err.message);
                }
            },
            
            fetchRecentlyPlayed: async () => {
                try {
                    const response = await axiosInstance.get("/history/recently-played?limit=6");
                    set({ recentlyPlayed: response.data });
                } catch (error: any) {
                    console.error("[MusicStore] Failed to fetch recently played:", error.message);
                }
            },
            
            fetchQuickPicks: async () => {
                try {
                    const response = await axiosInstance.get("/stream/quick-picks");
                    set({ quickPicks: response.data });
                } catch (error: any) {
                    console.error("[MusicStore] Failed to fetch quick picks:", error.message);
                }
            },

            fetchRecentCollections: async () => {
                try {
                    const response = await axiosInstance.get("/history/recent-collections");
                    set({ recentCollections: response.data });
                } catch (error: any) {
                    console.error("[MusicStore] Failed to fetch recent collections:", error.message);
                }
            },

            reset: () => {
                set({
                    likedSongs: [],
                    recentlyPlayed: [],
                    quickPicks: [],
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
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ 
                albums: state.albums, 
                featuredSongs: state.featuredSongs,
                likedSongs: state.likedSongs,
                recentCollections: state.recentCollections 
            }),
        }
    )
);

