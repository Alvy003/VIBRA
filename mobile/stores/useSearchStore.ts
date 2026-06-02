import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { axiosInstance } from '@/lib/axios';
import { mmkvStorage } from '@/lib/mmkvStorage';
import { migrateStoreToMMKV } from '@/lib/mmkvMigration';

interface SearchSuggestions {
  songs: any[];
  albums: any[];
  artists: any[];
  playlists: any[];
}

export interface RecentSearchItem {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  type: 'song' | 'artist' | 'album';
  timestamp: number;
}

interface SearchStore {
  query: string;
  suggestions: SearchSuggestions | null;
  results: SearchSuggestions | null;
  isSearching: boolean;
  isSuggesting: boolean;
  recentSearches: RecentSearchItem[];
  audioSearchResult: { title: string; artist: string } | null;

  setQuery: (q: string) => void;
  fetchSuggestions: (q: string) => Promise<void>;
  fetchResults: (q: string) => Promise<void>;
  clearSearch: () => void;
  addRecentSearch: (item: RecentSearchItem) => void;
  removeRecentSearch: (id: string) => void;
  clearAllRecentSearches: () => void;
  setAudioSearchResult: (result: { title: string; artist: string } | null) => void;
}

let suggestionAbortController: AbortController | null = null;
let resultAbortController: AbortController | null = null;

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      query: '',
      suggestions: null,
      results: null,
      isSearching: false,
      isSuggesting: false,
      recentSearches: [],
      audioSearchResult: null,

      setQuery: (q) => set({ query: q }),

      fetchSuggestions: async (q) => {
        if (!q.trim()) {
          set({ suggestions: null, isSuggesting: false });
          return;
        }

        suggestionAbortController?.abort();
        suggestionAbortController = new AbortController();

        set({ isSuggesting: true });
        try {
          const res = await axiosInstance.get('/stream/autocomplete', {
            params: { q },
            signal: suggestionAbortController.signal
          });
          
          if (get().query.trim() !== '') {
            // Group flat autocomplete array into categorized format for SearchResults
            const items = res.data.suggestions || [];
            set({
              suggestions: {
                songs: items.filter((i: any) => i.type === 'song'),
                albums: items.filter((i: any) => i.type === 'album'),
                artists: items.filter((i: any) => i.type === 'artist'),
                playlists: items.filter((i: any) => i.type === 'playlist'),
              }
            });
          }
        } catch (e: any) {
          if (e.name === 'CanceledError') return;
          console.error('[SearchStore] fetchSuggestions failed:', e);
        } finally {
          if (get().query.trim() !== '') {
            set({ isSuggesting: false });
          }
        }
      },

      fetchResults: async (q) => {
        if (!q.trim()) return;

        resultAbortController?.abort();
        resultAbortController = new AbortController();

        set({ isSearching: true, results: null });
        try {
          const res = await axiosInstance.get('/stream/search/all', {
            params: { q, limit: 20 },
            signal: resultAbortController.signal
          });
          set({ results: res.data });
        } catch (e: any) {
          if (e.name === 'CanceledError') return;
          console.error('[SearchStore] fetchResults failed:', e);
          set({ results: null });
        } finally {
          set({ isSearching: false });
        }
      },

      clearSearch: () => {
        set({ query: '', suggestions: null, results: null, isSuggesting: false });
      },

      addRecentSearch: (item) => {
        const current = get().recentSearches;
        const filtered = current.filter((r) => r.id !== item.id);
        set({
          recentSearches: [
            { ...item, timestamp: Date.now() },
            ...filtered,
          ].slice(0, 20),
        });
      },

      removeRecentSearch: (id) => {
        set({ recentSearches: get().recentSearches.filter((r) => r.id !== id) });
      },

      clearAllRecentSearches: () => {
        set({ recentSearches: [] });
      },

      setAudioSearchResult: (result) => {
        set({ audioSearchResult: result });
      },
    }),
    {
      name: 'search-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        recentSearches: state.recentSearches,
      }),
    }
  )
);

// Trigger one-time async migration on first launch
migrateStoreToMMKV("search-storage").then((migrated) => {
    if (migrated) {
        useSearchStore.persist.rehydrate();
    }
});