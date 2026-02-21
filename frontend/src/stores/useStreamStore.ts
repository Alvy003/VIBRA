// src/stores/useStreamStore.ts
import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";
import type {
  ExternalSong,
  ExternalAlbum,
  ExternalPlaylist,
  ExternalArtist,
  SearchAllResults,
  AutocompleteSuggestion,
  HomepageData,
} from "@/types";

// Cloudflare Worker proxy for audio streaming
const AUDIO_PROXY_URL = import.meta.env.VITE_AUDIO_PROXY_URL || "";

function proxyAudioUrl(originalUrl: string): string {
  // If no proxy configured, return original URL
  if (!AUDIO_PROXY_URL) return originalUrl;
  
  // Only proxy saavncdn.com URLs
  try {
    const parsed = new URL(originalUrl);
    const shouldProxy = [
      'saavncdn.com',
      'jiosaavn.com', 
      'saavn.com',
    ].some(d => parsed.hostname.endsWith(d));
    
    if (shouldProxy) {
      return `${AUDIO_PROXY_URL}?url=${encodeURIComponent(originalUrl)}`;
    }
  } catch {
    // Invalid URL, return as-is
  }
  
  return originalUrl;
}

interface StreamStore {
  // Search
  searchQuery: string;
  searchResults: ExternalSong[];
  searchAllResults: SearchAllResults | null;
  isSearching: boolean;
  searchSource: "all" | "jiosaavn" | "youtube";

  // Autocomplete
  autocompleteSuggestions: AutocompleteSuggestion[];
  isLoadingAutocomplete: boolean;

  // Homepage discovery
  homepageData: HomepageData | null;
  isLoadingHomepage: boolean;

  // Recommendations
  recommendations: ExternalSong[];
  isLoadingRecommendations: boolean;
  currentRecommendationSongId: string | null;

  // External content detail pages
  currentExternalAlbum: (ExternalAlbum & { songs?: ExternalSong[] }) | null;
  currentExternalPlaylist: (ExternalPlaylist & { songs?: ExternalSong[] }) | null;
  currentExternalArtist: ExternalArtist | null;
  isLoadingDetail: boolean;

  // Stream URL cache (for YouTube)
  streamUrlCache: Map<string, { url: string; expiresAt: number }>;

  // Actions
  searchExternal: (query: string) => Promise<void>;
  searchAll: (query: string) => Promise<void>;
  clearSearch: () => void;
  getPlayableUrl: (song: ExternalSong) => Promise<string | null>;
  setSearchSource: (source: "all" | "jiosaavn" | "youtube") => void;
  fetchHomepage: () => Promise<void>;
  fetchRecommendations: (songId: string, source: string) => Promise<ExternalSong[]>;
  fetchAutocomplete: (query: string) => Promise<void>;
  clearAutocomplete: () => void;

  // Detail pages
  fetchExternalAlbum: (source: string, id: string) => Promise<void>;
  fetchExternalPlaylist: (source: string, id: string) => Promise<void>;
  fetchExternalArtist: (source: string, id: string) => Promise<void>;
  clearDetail: () => void;
}

let searchAllController: AbortController | null = null;
let searchExternalController: AbortController | null = null;
let autocompleteController: AbortController | null = null;

export const useStreamStore = create<StreamStore>((set, get) => ({
  searchQuery: "",
  searchResults: [],
  searchAllResults: null,
  isSearching: false,
  searchSource: "all",
  streamUrlCache: new Map(),

  autocompleteSuggestions: [],
  isLoadingAutocomplete: false,

  homepageData: null,
  isLoadingHomepage: false,

  recommendations: [],
  isLoadingRecommendations: false,
  currentRecommendationSongId: null,

  currentExternalAlbum: null,
  currentExternalPlaylist: null,
  currentExternalArtist: null,
  isLoadingDetail: false,

  setSearchSource: (source) => set({ searchSource: source }),

  // ─── Song-only search (existing, for backward compat) ───
  searchExternal: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: "" });
      return;
    }

    if (searchExternalController) {
      searchExternalController.abort();
    }

    searchExternalController = new AbortController();

    set({ isSearching: true, searchQuery: query });

    try {
      const activeSource = get().searchSource;
      const params: Record<string, string | number> = { q: query, limit: 25 };
      if (activeSource !== "all") params.source = activeSource;

      const res = await axiosInstance.get("/stream/search", {
        params,
        signal: searchExternalController.signal,
      });

      if (get().searchQuery !== query) return;

      set({ searchResults: res.data.results || [] });
    } catch (error: any) {
      if (error.code === "ERR_CANCELED") return;

      console.error("External search failed:", error);
      set({ searchResults: [] });
    } finally {
      if (get().searchQuery === query) {
        set({ isSearching: false });
      }
    }
  },

  // ─── Rich search (songs + albums + playlists + artists) ───
  searchAll: async (query) => {
    if (!query.trim()) {
      set({ searchAllResults: null, searchResults: [], searchQuery: "" });
      return;
    }

    // Cancel previous request
    if (searchAllController) {
      searchAllController.abort();
    }

    searchAllController = new AbortController();

    set({ isSearching: true, searchQuery: query });

    try {
      const res = await axiosInstance.get("/stream/search/all", {
        params: { q: query, limit: 10 },
        signal: searchAllController.signal,
      });

      // Prevent stale overwrite
      if (get().searchQuery !== query) return;

      set({
        searchAllResults: res.data,
        searchResults: res.data.songs || [],
      });
    } catch (error: any) {
      if (error.code === "ERR_CANCELED") return;

      console.error("Search all failed:", error);
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
      autocompleteSuggestions: [],
    });
  },

  // ─── Autocomplete ───
 fetchAutocomplete: async (query) => {
  if (!query.trim() || query.trim().length < 2) {
    set({ autocompleteSuggestions: [] });
    return;
  }

  if (autocompleteController) {
    autocompleteController.abort();
  }

  autocompleteController = new AbortController();

  set({ isLoadingAutocomplete: true });

  try {
    const res = await axiosInstance.get("/stream/autocomplete", {
      params: { q: query },
      signal: autocompleteController.signal,
    });

    set({ autocompleteSuggestions: res.data.suggestions || [] });
  } catch (error: any) {
    if (error.code === "ERR_CANCELED") return;
    set({ autocompleteSuggestions: [] });
  } finally {
    set({ isLoadingAutocomplete: false });
  }
},

  clearAutocomplete: () => set({ autocompleteSuggestions: [] }),

  // ─── Homepage discovery ───
  fetchHomepage: async () => {
    if (get().homepageData) return;

    set({ isLoadingHomepage: true });
    try {
      // Get language preferences
      const { useOnboardingStore } = await import("@/stores/useOnboardingStore");
      const langString = useOnboardingStore.getState().getLanguageString();

      const res = await axiosInstance.get("/stream/home", {
        params: { languages: langString },
      });
      set({ homepageData: res.data });
    } catch (error) {
      console.error("Failed to fetch homepage:", error);
    } finally {
      set({ isLoadingHomepage: false });
    }
  },

  // ─── Recommendations ───
  fetchRecommendations: async (songId, source) => {
    // Don't refetch for the same song
    if (get().currentRecommendationSongId === songId && get().recommendations.length > 0) {
      return get().recommendations;
    }

    set({ isLoadingRecommendations: true, currentRecommendationSongId: songId });
    try {
      const cleanId = songId
        .replace("jiosaavn_", "")
        .replace("yt_", "");

      const cleanSource = source === "youtube" ? "youtube" : "jiosaavn";

    // Pass language preferences for better recommendations
    let langString = "hindi,english";
    try {
      const { useOnboardingStore } = await import("@/stores/useOnboardingStore");
      langString = useOnboardingStore.getState().getLanguageString();
    } catch {}

    const res = await axiosInstance.get(
      `/stream/recommendations/${cleanSource}/${cleanId}`,
      { params: { limit: 20, languages: langString } }
    );

      const results = res.data.results || [];
      set({ recommendations: results });
      return results;
    } catch (error) {
      console.error("Recommendations failed:", error);
      set({ recommendations: [] });
      return [];
    } finally {
      set({ isLoadingRecommendations: false });
    }
  },

  // ─── External Album detail ───
  fetchExternalAlbum: async (source, id) => {
    set({ isLoadingDetail: true, currentExternalAlbum: null });
    try {
      const res = await axiosInstance.get(`/stream/albums/${source}/${id}`);
      set({ currentExternalAlbum: res.data });
    } catch (error) {
      console.error("Failed to fetch external album:", error);
    } finally {
      set({ isLoadingDetail: false });
    }
  },

  // ─── External Playlist detail ───
  fetchExternalPlaylist: async (source, id) => {
    set({ isLoadingDetail: true, currentExternalPlaylist: null });
    try {
      const res = await axiosInstance.get(`/stream/playlists/${source}/${id}`);
      set({ currentExternalPlaylist: res.data });
    } catch (error) {
      console.error("Failed to fetch external playlist:", error);
    } finally {
      set({ isLoadingDetail: false });
    }
  },

  // ─── External Artist detail ───
  fetchExternalArtist: async (source, id) => {
    set({ isLoadingDetail: true, currentExternalArtist: null });
    try {
      const res = await axiosInstance.get(`/stream/artists/${source}/${id}`);
      set({ currentExternalArtist: res.data });
    } catch (error) {
      console.error("Failed to fetch external artist:", error);
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

  // ─── Get playable URL (existing) ───
  getPlayableUrl: async (song) => {
      if (song.source === "jiosaavn" && song.streamUrl) {
        return proxyAudioUrl(song.streamUrl);
      }

      if (song.source === "youtube" && song.videoId) {
        const cache = get().streamUrlCache;
        const cached = cache.get(song.videoId);

        if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
          return cached.url;
        }

        try {
          const res = await axiosInstance.get(
            `/stream/stream-url/youtube/${song.videoId}`
          );

          if (res.data?.url) {
            const newCache = new Map(cache);
            newCache.set(song.videoId, {
              url: res.data.url,
              expiresAt: Date.now() + (res.data.expiresIn || 3600) * 1000,
            });
            set({ streamUrlCache: newCache });
            return res.data.url;
          }
        } catch (error) {
          console.error("Failed to get stream URL:", error);
        }
      }

      return null;
    },
}));