import { create } from 'zustand';
import { axiosInstance } from '@/lib/axios';

interface SearchSuggestions {
    songs: any[];
    albums: any[];
    artists: any[];
    playlists: any[];
}

interface SearchStore {
    query: string;
    suggestions: SearchSuggestions | null;
    results: SearchSuggestions | null;
    isSearching: boolean;
    isSuggesting: boolean;
    recentSearches: string[];
    audioSearchResult: { title: string; artist: string } | null;

    setQuery: (q: string) => void;
    fetchSuggestions: (q: string) => Promise<void>;
    fetchResults: (q: string) => Promise<void>;
    clearSearch: () => void;
    addRecentSearch: (term: string) => void;
    removeRecentSearch: (term: string) => void;
    setAudioSearchResult: (result: { title: string; artist: string } | null) => void;
}

export const useSearchStore = create<SearchStore>((set, get) => ({
    query: '',
    suggestions: null,
    results: null,
    isSearching: false,
    isSuggesting: false,
    recentSearches: [],
    audioSearchResult: null,

    setQuery: (q) => {
        set({ query: q });
    },

    fetchSuggestions: async (q) => {
        if (!q.trim()) {
            set({ suggestions: null, isSuggesting: false });
            return;
        }
        set({ isSuggesting: true });
        try {
            const res = await axiosInstance.get('/stream/search/all', {
                params: { q, limit: 5 },
            });
            // Only update if query hasn't changed while fetching
            if (get().query === q) {
                set({ suggestions: res.data });
            }
        } catch (e) {
            console.error('[SearchStore] fetchSuggestions failed:', e);
        } finally {
            if (get().query === q) {
                set({ isSuggesting: false });
            }
        }
    },

    fetchResults: async (q) => {
        if (!q.trim()) return;
        set({ isSearching: true, results: null });
        try {
            const res = await axiosInstance.get('/stream/search/all', {
                params: { q, limit: 20 },
            });
            set({ results: res.data });
        } catch (e) {
            console.error('[SearchStore] fetchResults failed:', e);
            set({ results: null });
        } finally {
            set({ isSearching: false });
        }
    },

    clearSearch: () => {
        set({ query: '', suggestions: null, results: null, isSuggesting: false });
    },

    addRecentSearch: (term) => {
        const trimmed = term.trim();
        if (!trimmed) return;
        const current = get().recentSearches.filter((r) => r !== trimmed);
        set({ recentSearches: [trimmed, ...current].slice(0, 10) });
    },

    removeRecentSearch: (term) => {
        set({ recentSearches: get().recentSearches.filter((r) => r !== term) });
    },

    setAudioSearchResult: (result) => {
        set({ audioSearchResult: result });
    },
}));
