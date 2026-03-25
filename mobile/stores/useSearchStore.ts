// stores/useSearchStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { axiosInstance } from '@/lib/axios';

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
        set({ isSuggesting: true });
        try {
          const res = await axiosInstance.get('/stream/search/all', {
            params: { q, limit: 5 },
          });
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
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        recentSearches: state.recentSearches,
      }),
    }
  )
);