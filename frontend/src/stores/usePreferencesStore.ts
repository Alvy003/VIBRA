// src/stores/usePreferencesStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Song } from "@/types";

interface LastPlayedState {
  song: Song | null;
  position: number; // in seconds
  timestamp: number; // when it was saved
}

interface RecentSong {
  _id: string;
  title: string;
  artist: string;
  imageUrl: string;
  audioUrl: string;
  duration: number;
  playedAt: number;
}

interface PreferencesStore {
  // Last played song (for resume)
  lastPlayed: LastPlayedState | null;
  setLastPlayed: (song: Song | null, position: number) => void;
  clearLastPlayed: () => void;

  // Chat & Social preferences (NEW)
  showMusicActivityInChat: boolean;
  setShowMusicActivityInChat: (value: boolean) => void;

  // Search history
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;

  // Recently played songs from search
  recentlyPlayedFromSearch: RecentSong[];
  addRecentlyPlayedFromSearch: (song: Song) => void;
  removeRecentlyPlayedFromSearch: (songId: string) => void;
  clearRecentlyPlayedFromSearch: () => void;

  // Navigation memory
  lastViewedAlbumId: string | null;
  setLastViewedAlbum: (id: string | null) => void;

  // Quick liked songs lookup (just IDs for fast checking)
  likedSongIds: string[];
  setLikedSongIds: (ids: string[]) => void;
  addLikedSongId: (id: string) => void;
  removeLikedSongId: (id: string) => void;
  isLiked: (id: string) => boolean;

  // UI preferences
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Audio preferences (synced with player)
  volume: number;
  setVolume: (v: number) => void;
  isShuffle: boolean;
  setIsShuffle: (v: boolean) => void;
  isRepeat: boolean;
  setIsRepeat: (v: boolean) => void;

  // Call preferences
  callMutePreference: boolean;
  setCallMutePreference: (muted: boolean) => void;
}

// Max age for last played (24 hours) - don't resume very old sessions
const LAST_PLAYED_MAX_AGE = 24 * 60 * 60 * 1000;

// Add constant
const RECENT_SONGS_LIMIT = 15;

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set, get) => ({
      // Last played
      lastPlayed: null,
      setLastPlayed: (song: Song | null, position: number) => {
        if (!song) {
          set({ lastPlayed: null });
          return;
        }
        set({
          lastPlayed: {
            song,
            position,
            timestamp: Date.now(),
          },
        });
      },
      clearLastPlayed: () => set({ lastPlayed: null }),

      // Chat & Social preferences
      showMusicActivityInChat: true,
      setShowMusicActivityInChat: (value: boolean) => set({ showMusicActivityInChat: value }),

      // Search history
      recentSearches: [],
      addRecentSearch: (query: string) => {
        if (!query.trim()) return;
        set((state) => {
          const filtered = state.recentSearches.filter(
            (s) => s.toLowerCase() !== query.toLowerCase()
          );
          return {
            recentSearches: [query, ...filtered].slice(0, 10),
          };
        });
      },
      clearRecentSearches: () => set({ recentSearches: [] }),

      // Add to store implementation (after clearRecentSearches)
      recentlyPlayedFromSearch: [],
      addRecentlyPlayedFromSearch: (song: Song) => {
        set((state) => {
          const filtered = state.recentlyPlayedFromSearch.filter(
            (s) => s._id !== song._id
          );
          const recentSong: RecentSong = {
            _id: song._id,
            title: song.title,
            artist: song.artist,
            imageUrl: song.imageUrl,
            audioUrl: song.audioUrl,
            duration: song.duration,
            playedAt: Date.now(),
          };
          return {
            recentlyPlayedFromSearch: [recentSong, ...filtered].slice(0, RECENT_SONGS_LIMIT),
          };
        });
      },
      removeRecentlyPlayedFromSearch: (songId: string) => {
        set((state) => ({
          recentlyPlayedFromSearch: state.recentlyPlayedFromSearch.filter(
            (s) => s._id !== songId
          ),
        }));
      },
      clearRecentlyPlayedFromSearch: () => set({ recentlyPlayedFromSearch: [] }),

      // Last viewed album
      lastViewedAlbumId: null,
      setLastViewedAlbum: (id) => set({ lastViewedAlbumId: id }),

      // Liked songs IDs
      likedSongIds: [],
      setLikedSongIds: (ids: string[]) => set({ likedSongIds: ids }),
      addLikedSongId: (id: string) =>
        set((state) => {
          if (state.likedSongIds.includes(id)) return state;
          return { likedSongIds: [...state.likedSongIds, id] };
        }),
      removeLikedSongId: (id: string) =>
        set((state) => ({
          likedSongIds: state.likedSongIds.filter((i) => i !== id),
        })),
      isLiked: (id: string) => get().likedSongIds.includes(id),

      // UI preferences
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Audio preferences
      volume: 100,
      setVolume: (v) => set({ volume: Math.max(0, Math.min(100, v)) }),
      isShuffle: false,
      setIsShuffle: (v) => set({ isShuffle: v }),
      isRepeat: false,
      setIsRepeat: (v) => set({ isRepeat: v }),

      // Call preferences
      callMutePreference: false,
      setCallMutePreference: (muted) => set({ callMutePreference: muted }),
    }),
    {
      name: "vibra-preferences",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Only persist what we need
      partialize: (state) => ({
        lastPlayed: state.lastPlayed,
        recentSearches: state.recentSearches,
        recentlyPlayedFromSearch: state.recentlyPlayedFromSearch,
        lastViewedAlbumId: state.lastViewedAlbumId,
        likedSongIds: state.likedSongIds,
        sidebarCollapsed: state.sidebarCollapsed,
        volume: state.volume,
        isShuffle: state.isShuffle,
        isRepeat: state.isRepeat,
        callMutePreference: state.callMutePreference,
        showMusicActivityInChat: state.showMusicActivityInChat,
      }),
      // Validate last played on rehydration
      onRehydrateStorage: () => (state) => {
        if (state?.lastPlayed) {
          const age = Date.now() - state.lastPlayed.timestamp;
          if (age > LAST_PLAYED_MAX_AGE) {
            state.lastPlayed = null;
          }
        }
      },
    }
  )
);

// Helper to check if we should offer resume
export const shouldOfferResume = (): boolean => {
  const state = usePreferencesStore.getState();
  if (!state.lastPlayed?.song) return false;
  
  const age = Date.now() - state.lastPlayed.timestamp;
  if (age > LAST_PLAYED_MAX_AGE) return false;
  
  // Only offer resume if position is meaningful (> 10 seconds in)
  return state.lastPlayed.position > 10;
};