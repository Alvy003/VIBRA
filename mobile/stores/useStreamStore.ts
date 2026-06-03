import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { axiosInstance } from "@/lib/axios";
import { useOnboardingStore } from "./useOnboardingStore";

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
    dailyMix: any | null;
    weeklyMix: any | null;
    isLoadingHomepage: boolean;
    isLoadingDailyMix: boolean;
    isLoadingWeeklyMix: boolean;

    // Details
    currentExternalAlbum: any | null;
    currentExternalPlaylist: any | null;
    currentExternalArtist: any | null;
    isLoadingDetail: boolean;

    streamUrlCache: Map<string, { url: string; expiresAt: number }>;

    searchAll: (query: string) => Promise<void>;
    clearSearch: () => void;
    fetchHomepage: (forceRefresh?: boolean) => Promise<void>;
    fetchDailyMix: () => Promise<void>;
    fetchWeeklyMix: () => Promise<void>;
    fetchExternalAlbum: (source: string, id: string) => Promise<void>;
    fetchExternalPlaylist: (source: string, id: string) => Promise<void>;
    fetchExternalArtist: (source: string, id: string) => Promise<void>;
    clearDetail: () => void;
    getPlayableUrl: (song: any) => Promise<string | null>;
    reset: () => void;
}



export const useStreamStore = create<StreamStore>()((set, get) => ({
    searchResults: [],
    searchAllResults: null,
    isSearching: false,
    searchQuery: "",

    homepageData: null,
    dailyMix: null,
    weeklyMix: null,
    isLoadingHomepage: false,
    isLoadingDailyMix: false,
    isLoadingWeeklyMix: false,

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

    fetchHomepage: async (forceRefresh = false) => {
        // If we have data and it's not a force refresh, 
        // the persisted state will already be there
        if (get().homepageData && !forceRefresh) return;
        
        set({ isLoadingHomepage: true });
        try {
            const languages = useOnboardingStore.getState().getLanguageString();
            const res = await axiosInstance.get("/stream/home", {
                params: { 
                    languages,
                    ...(forceRefresh ? { refresh: "true" } : {})
                },
            });
            set({ homepageData: res.data });
        } catch (error) {
            console.error("[StreamStore] Failed to fetch homepage:", error);
        } finally {
            set({ isLoadingHomepage: false });
        }
    },

    fetchDailyMix: async () => {
        set({ isLoadingDailyMix: true });
        try {
            const languages = useOnboardingStore.getState().getLanguageString();
            const res = await axiosInstance.get("/stream/daily-mix", {
                params: { languages, limit: 15 },
            });
            // Handle new response format { title, description, results }
            set({ dailyMix: res.data.results || [] });
        } catch (error) {
            console.error("[StreamStore] Failed to fetch daily mix:", error);
        } finally {
            set({ isLoadingDailyMix: false });
        }
    },

    fetchWeeklyMix: async () => {
        set({ isLoadingWeeklyMix: true });
        try {
            const languages = useOnboardingStore.getState().getLanguageString();
            const res = await axiosInstance.get("/stream/weekly-mix", {
                params: { languages },
            });
            set({ weeklyMix: res.data });
        } catch (error) {
            console.error("[StreamStore] Failed to fetch weekly mix:", error);
        } finally {
            set({ isLoadingWeeklyMix: false });
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
            const id = song.id || (song as any).externalId;
            const source = song.source === 'yt' ? 'youtube' : song.source;

            // ALWAYS use the redirector for JioSaavn tracks to ensure fresh, valid links (Chat Parity)
            if (song.source === 'jiosaavn' || song.source === 'saavn') {
                if (id) {
                    const cleanId = id.replace("jiosaavn_", "");
                    return `${axiosInstance.defaults.baseURL}/stream/play/jiosaavn/${cleanId}`;
                }
            }

            // Fallback for direct URLs (mostly YouTube or legacy)
            const url = song.streamUrl || song.audioUrl;
            if (url && url.length > 10 && !url.includes('/api/stream/play/')) {
                // If it's already a full URL and NOT a redirector link, wrap it in proxy
                if (song.source === 'jiosaavn' || song.source === 'saavn') {
                   return proxyAudioUrl(url);
                }
                return url;
            }

            // Fallback to redirector for YouTube/Others
            if (id) {
                const cleanId = id.replace("jiosaavn_", "").replace("yt_", "").replace("youtube_", "");
                return `${axiosInstance.defaults.baseURL}/stream/play/${source}/${cleanId}`;
            }

        // --- SECONDARY FALLBACK: Local Resolution ---
        if ((song.source === "jiosaavn" || song.source === "saavn") && (song.id || (song as any).externalId)) {
            const url = song.streamUrl || song.audioUrl;
            if (url && url.length > 10) return proxyAudioUrl(url);

            try {
                const id = song.id || (song as any).externalId;
                const cleanId = id.replace("jiosaavn_", "");
                const res = await axiosInstance.get(`/stream/stream-url/jiosaavn/${cleanId}`);
                if (res.data?.url) return proxyAudioUrl(res.data.url);
            } catch (error) {
                console.error("[StreamStore] JioSaavn local resolution failed:", error);
            }
        }

        // Handle YouTube Cache
        if (song.source === "youtube" && (song.videoId || song.id)) {
            const videoId = song.videoId || song.id;
            const cache = get().streamUrlCache;
            const cached = cache.get(videoId);
            if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) return cached.url;

            try {
                const cleanVideoId = videoId.replace("yt_", "").replace("youtube_", "");
                const res = await axiosInstance.get(`/stream/stream-url/youtube/${cleanVideoId}`);
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
                console.error("[StreamStore] YouTube local resolution failed:", error);
            }
        }

        return song.audioUrl || song.streamUrl || null;
    },

    reset: () => {
        set({
            homepageData: null,
            dailyMix: null,
            weeklyMix: null,
            searchResults: [],
            searchAllResults: null,
            searchQuery: "",
            currentExternalAlbum: null,
            currentExternalPlaylist: null,
            currentExternalArtist: null,
            streamUrlCache: new Map(),
        });
    },
}));
