// stores/useLyricsStore.ts
import { create } from 'zustand';
import { fetchLyrics, fetchLyricsFallback, LyricLine } from '@/lib/lyrics';

export type LyricsState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'synced'; lines: LyricLine[]; source: string }
  | { status: 'plain'; text: string; source: string }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

interface LyricsCache {
  [trackId: string]: {
    state: LyricsState;
    timestamp: number;
  };
}

interface LyricsStore {
  cache: LyricsCache;
  activeRequests: Map<string, AbortController>;
  
  getLyrics: (trackId: string) => LyricsState;
  fetchLyrics: (trackId: string, title: string, artist: string, duration?: number) => Promise<void>;
  clearCache: () => void;
  abortRequest: (trackId: string) => void;
}

const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 100;

export const useLyricsStore = create<LyricsStore>((set, get) => ({
  cache: {},
  activeRequests: new Map(),

  getLyrics: (trackId: string): LyricsState => {
    const cached = get().cache[trackId];
    if (!cached) return { status: 'idle' };
    
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      return { status: 'idle' };
    }
    
    return cached.state;
  },

  fetchLyrics: async (trackId: string, title: string, artist: string, duration?: number) => {
    const { cache, activeRequests } = get();
    
    // Return if already cached
    const cached = cache[trackId];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && cached.state.status !== 'idle') {
      return;
    }

    // Abort any existing request for this track
    const existingRequest = activeRequests.get(trackId);
    if (existingRequest) {
      existingRequest.abort();
      activeRequests.delete(trackId);
    }

    // Set loading state
    set((state) => ({
      cache: {
        ...state.cache,
        [trackId]: {
          state: { status: 'loading' },
          timestamp: Date.now(),
        },
      },
    }));

    // Create abort controller
    const controller = new AbortController();
    get().activeRequests.set(trackId, controller);

    try {
      const result = await fetchLyrics(title, artist, duration, controller.signal);

      // Check if request was aborted
      if (controller.signal.aborted) return;

      let finalState: LyricsState;

      if (result.syncedLyrics && result.syncedLyrics.length > 0) {
        finalState = {
          status: 'synced',
          lines: result.syncedLyrics,
          source: result.source,
        };
      } else if (result.plainLyrics) {
        finalState = {
          status: 'plain',
          text: result.plainLyrics,
          source: result.source,
        };
      } else {
        // Try lyrics.ovh fallback
        const fallbackLyrics = await fetchLyricsFallback(title, artist, controller.signal);
        if (controller.signal.aborted) return;
        
        if (fallbackLyrics) {
          finalState = {
            status: 'plain',
            text: fallbackLyrics,
            source: 'lyrics.ovh',
          };
        } else {
          finalState = { status: 'not_found' };
        }
      }

      set((state) => {
        // Implement LRU eviction
        const cacheEntries = Object.entries(state.cache);
        let newCache = { ...state.cache };
        
        if (cacheEntries.length >= MAX_CACHE_SIZE) {
          const sorted = cacheEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);
          const oldestKey = sorted[0][0];
          delete newCache[oldestKey];
        }

        return {
          cache: {
            ...newCache,
            [trackId]: {
              state: finalState,
              timestamp: Date.now(),
            },
          },
        };
      });

      get().activeRequests.delete(trackId);
    } catch (error) {
      if (controller.signal.aborted) return;

      set((state) => ({
        cache: {
          ...state.cache,
          [trackId]: {
            state: {
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
            timestamp: Date.now(),
          },
        },
      }));

      get().activeRequests.delete(trackId);
    }
  },

  abortRequest: (trackId: string) => {
    const controller = get().activeRequests.get(trackId);
    if (controller) {
      controller.abort();
      get().activeRequests.delete(trackId);
    }
  },

  clearCache: () => {
    get().activeRequests.forEach((controller) => controller.abort());
    set({ cache: {}, activeRequests: new Map() });
  },
}));