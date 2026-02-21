import { create } from "zustand";
import { fetchLyrics, fetchLyricsFallback, LyricLine, LyricsResult } from "@/lib/lyrics";
import { usePlayerStore } from "@/stores/usePlayerStore";

const LYRICS_STORAGE_KEY = "lyrics-cache-v1";

function loadPersistentCache(): Map<string, LyricsCache> {
  try {
    const raw = localStorage.getItem(LYRICS_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    return new Map(parsed);
  } catch {
    return new Map();
  }
}

function savePersistentCache(cache: Map<string, LyricsCache>) {
  try {
    const serialized = JSON.stringify(Array.from(cache.entries()));
    localStorage.setItem(LYRICS_STORAGE_KEY, serialized);
  } catch {
    // ignore quota errors
  }
}


interface LyricsCache extends LyricsResult {
  unsyncedLyrics: string | null;
}

interface LyricsState {
  syncedLyrics: LyricLine[] | null;
  plainLyrics: string | null;
  unsyncedLyrics: string | null;
  isLoading: boolean;
  hasLyrics: boolean;
  error: string | null;
  isLyricsVisible: boolean;
  currentLineIndex: number;
  currentSongId: string | null;
  showUnsyncedMode: boolean;
  isFetchingUnsynced: boolean;
  cache: Map<string, LyricsCache>;

  fetchForSong: (
    songId: string,
    title: string,
    artist: string,
    duration?: number
  ) => Promise<void>;
  prefetchForSong: (
    songId: string,
    title: string,
    artist: string,
    duration?: number
  ) => Promise<void>;
  fetchUnsyncedForCurrent: () => Promise<void>;
  setCurrentLineIndex: (index: number) => void;
  toggleLyricsVisible: () => void;
  setLyricsVisible: (visible: boolean) => void;
  setShowUnsyncedMode: (v: boolean) => void;
  reset: () => void;
}

export const useLyricsStore = create<LyricsState>((set, get) => ({
  syncedLyrics: null,
  plainLyrics: null,
  unsyncedLyrics: null,
  isLoading: false,
  hasLyrics: false,
  error: null,
  isLyricsVisible: false,
  currentLineIndex: -1,
  currentSongId: null,
  showUnsyncedMode: false,
  isFetchingUnsynced: false,
  cache: typeof window !== "undefined"
  ? loadPersistentCache()
  : new Map(),


  fetchForSong: async (songId, title, artist, duration) => {
    const { cache, currentSongId } = get();

    if (currentSongId === songId && (get().hasLyrics || get().isLoading)) {
      return;
    }

    // Check cache
    if (cache.has(songId)) {
      const cached = cache.get(songId)!;
      set({
        syncedLyrics: cached.syncedLyrics,
        plainLyrics: cached.plainLyrics,
        unsyncedLyrics: cached.unsyncedLyrics,
        hasLyrics: !!(cached.syncedLyrics || cached.plainLyrics),
        isLoading: false,
        error: null,
        currentLineIndex: -1,
        currentSongId: songId,
        showUnsyncedMode: false,
      });
      return;
    }

    set({
      isLoading: true,
      error: null,
      currentLineIndex: -1,
      currentSongId: songId,
      syncedLyrics: null,
      plainLyrics: null,
      unsyncedLyrics: null,
      showUnsyncedMode: false,
    });

    try {
      const result = await fetchLyrics(title, artist, duration);

      // Check if song changed during fetch
      if (get().currentSongId !== songId) return;

      let finalPlain = result.plainLyrics;

      // If nothing found from primary, try fallback
      if (!result.syncedLyrics?.length && !result.plainLyrics) {
        const fallback = await fetchLyricsFallback(title, artist);
        if (get().currentSongId !== songId) return;
        if (fallback) {
          finalPlain = fallback;
        }
      }

      const cacheEntry: LyricsCache = {
        syncedLyrics: result.syncedLyrics,
        plainLyrics: finalPlain,
        unsyncedLyrics: null,
        source: result.source,
      };

      const newCache = new Map(get().cache);
      newCache.set(songId, cacheEntry);
      if (newCache.size > 50) {
        const firstKey = newCache.keys().next().value;
        if (firstKey) newCache.delete(firstKey);
      }

      savePersistentCache(newCache);

      set({
        syncedLyrics: result.syncedLyrics,
        plainLyrics: finalPlain,
        unsyncedLyrics: null,
        hasLyrics: !!(result.syncedLyrics?.length || finalPlain),
        isLoading: false,
        cache: newCache,
      });
      
    } catch {
      if (get().currentSongId !== songId) return;

      // Cache the "no lyrics" result so we don't re-fetch
      const newCache = new Map(get().cache);
      newCache.set(songId, {
        syncedLyrics: null,
        plainLyrics: null,
        unsyncedLyrics: null,
        source: 'none',
      });
      if (newCache.size > 50) {
        const firstKey = newCache.keys().next().value;
        if (firstKey) newCache.delete(firstKey);
      }
      savePersistentCache(newCache);

      set({
        syncedLyrics: null,
        plainLyrics: null,
        unsyncedLyrics: null,
        hasLyrics: false,
        isLoading: false,
        error: null,
        cache: newCache,
      });
    }
  },

  prefetchForSong: async (songId, title, artist, duration) => {
    const { cache } = get();
    if (cache.has(songId)) return;

    try {
      const result = await fetchLyrics(title, artist, duration);

      let finalPlain = result.plainLyrics;
      if (!result.syncedLyrics?.length && !result.plainLyrics) {
        const fallback = await fetchLyricsFallback(title, artist);
        if (fallback) finalPlain = fallback;
      }

      const newCache = new Map(get().cache);
      newCache.set(songId, {
        syncedLyrics: result.syncedLyrics,
        plainLyrics: finalPlain,
        unsyncedLyrics: null,
        source: result.source,
      });
      if (newCache.size > 50) {
        const firstKey = newCache.keys().next().value;
        if (firstKey) newCache.delete(firstKey);
      }

      set({ cache: newCache });
    } catch {
      // Silent fail
    }
  },

  fetchUnsyncedForCurrent: async () => {
    const { currentSongId, cache } = get();
    if (!currentSongId) return;
  
    const cached = cache.get(currentSongId);
  
    if (cached?.unsyncedLyrics) {
      set({ unsyncedLyrics: cached.unsyncedLyrics, showUnsyncedMode: true });
      return;
    }
  
    if (cached?.plainLyrics) {
      const newCache = new Map(get().cache);
      const entry = newCache.get(currentSongId)!;
      entry.unsyncedLyrics = cached.plainLyrics;
      newCache.set(currentSongId, entry);
      set({
        unsyncedLyrics: cached.plainLyrics,
        showUnsyncedMode: true,
        cache: newCache,
      });
      return;
    }
  
    set({ isFetchingUnsynced: true });
  
    try {
      // ✅ CHANGED: Use static import instead of dynamic
      const song = usePlayerStore.getState().currentSong;
      
      if (!song || get().currentSongId !== currentSongId) {
        set({ isFetchingUnsynced: false });
        return;
      }
  
      const result = await fetchLyrics(song.title, song.artist);
      let plain = result.plainLyrics;
  
      if (!plain) {
        plain = await fetchLyricsFallback(song.title, song.artist);
      }
  
      if (get().currentSongId !== currentSongId) {
        set({ isFetchingUnsynced: false });
        return;
      }
  
      if (plain) {
        const newCache = new Map(get().cache);
        const entry = newCache.get(currentSongId);
        if (entry) {
          entry.unsyncedLyrics = plain;
          newCache.set(currentSongId, entry);
        }
        set({
          unsyncedLyrics: plain,
          showUnsyncedMode: true,
          isFetchingUnsynced: false,
          cache: newCache,
        });
      } else {
        set({ isFetchingUnsynced: false });
      }
    } catch {
      set({ isFetchingUnsynced: false });
    }
  },

  setCurrentLineIndex: (index) => set({ currentLineIndex: index }),

  toggleLyricsVisible: () =>
    set((s) => ({ isLyricsVisible: !s.isLyricsVisible })),

  setLyricsVisible: (visible) => set({ isLyricsVisible: visible }),

  setShowUnsyncedMode: (v) => {
    if (v) {
      get().fetchUnsyncedForCurrent();
    } else {
      set({ showUnsyncedMode: false });
    }
  },

  reset: () =>
    set({
      syncedLyrics: null,
      plainLyrics: null,
      unsyncedLyrics: null,
      isLoading: false,
      hasLyrics: false,
      error: null,
      isLyricsVisible: false,
      currentLineIndex: -1,
      currentSongId: null,
      showUnsyncedMode: false,
      isFetchingUnsynced: false,
    }),
}));