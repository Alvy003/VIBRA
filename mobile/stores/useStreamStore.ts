import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

// Mobile does not have CORS restrictions, so we can stream directly from CDNs!
function proxyAudioUrl(originalUrl: string): string {
    return originalUrl;
}

interface StreamStore {
    searchResults: any[];
    searchAllResults: {
        songs: any[];
        albums: any[];
        artists: any[];
        playlists: any[];
    } | null;
    isSearching: boolean;
    searchQuery: string;

    // Discovery
    homepageData: any | null;
    isLoadingHomepage: boolean;

    // Details
    currentExternalAlbum: any | null;
    currentExternalPlaylist: any | null;
    currentExternalArtist: any | null;
    isLoadingDetail: boolean;

    streamUrlCache: Map<string, { url: string; expiresAt: number }>;

    searchAll: (query: string) => Promise<void>;
    clearSearch: () => void;
    fetchHomepage: () => Promise<void>;
    fetchExternalAlbum: (source: string, id: string) => Promise<void>;
    fetchExternalPlaylist: (source: string, id: string) => Promise<void>;
    fetchExternalArtist: (source: string, id: string) => Promise<void>;
    clearDetail: () => void;
    getPlayableUrl: (song: any) => Promise<string | null>;
}



export const useStreamStore = create<StreamStore>((set, get) => ({
    searchResults: [],
    searchAllResults: null,
    isSearching: false,
    searchQuery: "",

    homepageData: null,
    isLoadingHomepage: false,

    currentExternalAlbum: null,
    currentExternalPlaylist: null,
    currentExternalArtist: null,
    isLoadingDetail: false,

    streamUrlCache: new Map(),


    searchAll: async (query) => {
        if (!query.trim()) {
            set({ searchAllResults: null, searchResults: [], searchQuery: "" });
            return;
        }

        set({ isSearching: true, searchQuery: query });

        try {
            const res = await axiosInstance.get("/stream/search/all", {
                params: { q: query, limit: 10 },
            });

            if (get().searchQuery !== query) return;

            set({
                searchAllResults: res.data,
                searchResults: res.data.songs || [],
            });
        } catch (error) {
            console.error("[StreamStore] Search all failed:", error);
            set({ searchAllResults: null, searchResults: [] });
        } finally {
            if (get().searchQuery === query) {
                set({ isSearching: false });
            }
        }
    },

    clearSearch: () => {
        set({
            searchQuery: "",
            searchResults: [],
            searchAllResults: null,
        });
    },

    fetchHomepage: async () => {
        if (get().homepageData) return;
        set({ isLoadingHomepage: true });
        try {
            // Mobile defaults to hindi,english for now
            const res = await axiosInstance.get("/stream/home", {
                params: { languages: "hindi,english" },
            });
            set({ homepageData: res.data });
        } catch (error) {
            console.error("[StreamStore] Failed to fetch homepage:", error);
        } finally {
            set({ isLoadingHomepage: false });
        }
    },

    fetchExternalAlbum: async (source, id) => {
        set({ isLoadingDetail: true, currentExternalAlbum: null });
        try {
            const res = await axiosInstance.get(`/stream/albums/${source}/${id}`);
            set({ currentExternalAlbum: res.data });
        } catch (error) {
            console.error("[StreamStore] Failed to fetch external album:", error);
        } finally {
            set({ isLoadingDetail: false });
        }
    },

    fetchExternalPlaylist: async (source, id) => {
        set({ isLoadingDetail: true, currentExternalPlaylist: null });
        try {
            const res = await axiosInstance.get(`/stream/playlists/${source}/${id}`);
            set({ currentExternalPlaylist: res.data });
        } catch (error) {
            console.error("[StreamStore] Failed to fetch external playlist:", error);
        } finally {
            set({ isLoadingDetail: false });
        }
    },

    fetchExternalArtist: async (source, id) => {
        set({ isLoadingDetail: true, currentExternalArtist: null });
        try {
            const res = await axiosInstance.get(`/stream/artists/${source}/${id}`);
            set({ currentExternalArtist: res.data });
        } catch (error) {
            console.error("[StreamStore] Failed to fetch external artist:", error);
        } finally {
            set({ isLoadingDetail: false });
        }
    },

    clearDetail: () => {
        set({
            currentExternalAlbum: null,
            currentExternalPlaylist: null,
            currentExternalArtist: null,
        });
    },


    getPlayableUrl: async (song) => {
        // Handle JioSaavn
        if (song.source === "jiosaavn" && (song.streamUrl || song.audioUrl)) {
            const url = song.streamUrl || song.audioUrl;
            return proxyAudioUrl(url);
        }

        // Handle YouTube
        if (song.source === "youtube" && (song.videoId || song.id)) {
            const videoId = song.videoId || song.id;
            const cache = get().streamUrlCache;
            const cached = cache.get(videoId);

            // Check if cached URL is still valid (5 min buffer)
            if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
                return cached.url;
            }

            try {
                const res = await axiosInstance.get(`/stream/stream-url/youtube/${videoId}`);

                if (res.data?.url) {
                    const newCache = new Map(cache);
                    newCache.set(videoId, {
                        url: res.data.url,
                        expiresAt: Date.now() + (res.data.expiresIn || 3600) * 1000,
                    });
                    set({ streamUrlCache: newCache });
                    return res.data.url;
                }
            } catch (error) {
                console.error("[StreamStore] Failed to get stream URL:", error);
            }
        }

        // Default: return provided audioUrl (for local/fixed backend tracks)
        return song.audioUrl || null;
    },
}));
