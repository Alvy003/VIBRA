// src/stores/usePlayerStore.ts
import { create } from "zustand";
import { Song } from "@/types";
import { useChatStore } from "./useChatStore";
import { usePreferencesStore } from "./usePreferencesStore";
import { axiosInstance } from "@/lib/axios";
import { useStreamStore } from "@/stores/useStreamStore";

// Add this import at the top, with the other imports
const AUDIO_PROXY_URL = import.meta.env.VITE_AUDIO_PROXY_URL || "";

function proxyAudioUrl(originalUrl: string): string {
  if (!AUDIO_PROXY_URL) return originalUrl;
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
  } catch {}
  return originalUrl;
}

interface PlayerStore {
  currentSong: Song | null;
  isPlaying: boolean;

  queue: Song[];
  displayQueue: Song[];
  currentIndex: number;

  duration: number;
  currentTime: number;
  volume: number;
  isShuffle: boolean;
  isRepeat: boolean;
  hasTrackedCurrentSong: boolean;

  mainQueue: Song[];
  nextUpQueue: Song[];
  laterQueue: Song[];

  _isRefilling: boolean;
  _lastRefillTime: number;

  _hasRestoredFromCache: boolean;
  _pendingResumePosition: number | null;

  _resolvingUrl: boolean;
  _urlCache: Map<string, { url: string; expiresAt: number }>;

  initializeQueue: (songs: Song[], startIndexOrSong?: number | Song, autoplay?: boolean) => void;
  playAlbum: (songs: Song[], startIndex?: number) => void;
  setCurrentSong: (song: Song | null) => void;
  togglePlay: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => void;
  removeFromQueue: (id: string) => void;
  playSong: (song: Song) => void;
  addSongToQueue: (song: Song) => void;
  reorderQueue: (newOrder: Song[]) => void;
  addSongNext: (song: Song) => void;
  _rebuildDisplay: () => void;

  setDuration: (d: number) => void;
  setCurrentTime: (t: number) => void;
  setIsPlaying: (b: boolean) => void;
  setVolume: (v: number) => void;

  toggleShuffle: () => void;
  toggleRepeat: () => void;
  reset: () => void;
  setHasTrackedCurrentSong: (value: boolean) => void;

  autoRefillQueue: () => Promise<void>;

  restoreFromCache: () => boolean;
  saveToCache: () => void;
  getPendingResumePosition: () => number | null;
  clearPendingResume: () => void;

  resolveAudioUrl: (song: Song) => Promise<string | null>;
  playExternalSong: (song: Song) => Promise<void>;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const shuffleArray = <T,>(array: T[]): T[] => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const REFILL_DEBOUNCE_MS = 5000;
const SAVE_POSITION_DEBOUNCE_MS = 5000;

let savePositionTimeout: NodeJS.Timeout | null = null;

const emitActivity = (activity: string) => {
  const socket = useChatStore.getState().socket;
  if (socket?.auth) {
    socket.emit("update_activity", {
      userId: socket.auth.userId,
      activity,
    });
  }
};

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentSong: null,
  isPlaying: false,

  queue: [],
  displayQueue: [],
  currentIndex: -1,

  duration: 0,
  currentTime: 0,
  volume: usePreferencesStore.getState().volume,
  isShuffle: usePreferencesStore.getState().isShuffle,
  isRepeat: usePreferencesStore.getState().isRepeat,
  hasTrackedCurrentSong: false,

  mainQueue: [],
  nextUpQueue: [],
  laterQueue: [],

  _isRefilling: false,
  _lastRefillTime: 0,
  _hasRestoredFromCache: false,
  _pendingResumePosition: null,

  _resolvingUrl: false,
  _urlCache: new Map(),

  resolveAudioUrl: async (song: Song): Promise<string | null> => {
    // Local songs - URL is already permanent
    if (!song.source || song.source === "local") {
      return song.audioUrl;
    }

    // JioSaavn - URLs are permanent, use streamUrl or audioUrl
    if (song.source === "jiosaavn") {
      const url = song.streamUrl || song.audioUrl;
      return url ? proxyAudioUrl(url) : null;
  }

    // YouTube - URLs expire, need to fetch fresh
    if (song.source === "youtube" && song.videoId) {
      const cache = get()._urlCache;
      const cached = cache.get(song.videoId);

      // Check if cached URL is still valid (5 min buffer)
      if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
        return cached.url;
      }

      try {
        set({ _resolvingUrl: true });
        const { getPlayableUrl } = useStreamStore.getState();
        const url = await getPlayableUrl({
          source: "youtube",
          videoId: song.videoId,
          externalId: song.externalId || "",
          streamUrl: null,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          imageUrl: song.imageUrl,
        });

        if (url) {
          const newCache = new Map(cache);
          newCache.set(song.videoId, {
            url,
            expiresAt: Date.now() + 3600 * 1000, // 1 hour
          });
          set({ _urlCache: newCache });
          return url;
        }
      } catch (error) {
        console.error("Failed to resolve YouTube URL:", error);
      } finally {
        set({ _resolvingUrl: false });
      }

      return null;
    }

    return song.audioUrl;
  },

  // ==================================================================
  // NEW: Play an external song (from search results)
  // ==================================================================
  playExternalSong: async (song: Song) => {
    const resolvedUrl = await get().resolveAudioUrl(song);

    if (!resolvedUrl) {
      console.error("Could not resolve audio URL for:", song.title);
      return;
    }

    // Create a song object with resolved URL
    const playableSong: Song = {
      ...song,
      audioUrl: resolvedUrl,
      _id: song._id || song.externalId || `ext_${Date.now()}`,
    };

    // Use existing playSong logic
    get().playSong(playableSong);
  },

  // ... keep ALL your existing _rebuildDisplay exactly the same ...

  _rebuildDisplay: () => {
    // EXACTLY THE SAME AS YOUR CURRENT CODE
    const state = get();
    const { mainQueue, nextUpQueue, laterQueue, currentSong } = state;
    const mainCurrentIndex = state.currentIndex;

    if (!currentSong) {
      const display = [...nextUpQueue, ...mainQueue, ...laterQueue];
      set({
        displayQueue: display,
        queue: [...display],
        currentIndex: -1,
      });
      return;
    }

    const currentId = currentSong._id;

    const history = mainQueue
      .slice(0, Math.max(0, mainCurrentIndex))
      .filter(s => s._id !== currentId);

    const upcomingMain = mainQueue
      .slice(Math.max(0, mainCurrentIndex + 1))
      .filter(s => s._id !== currentId);

    const filteredNext = nextUpQueue.filter(s => s._id !== currentId);
    const filteredLater = laterQueue.filter(s => s._id !== currentId);

    const display = [
      ...history,
      currentSong,
      ...filteredNext,
      ...upcomingMain,
      ...filteredLater,
    ];

    const seen = new Set<string>();
    const deduped = display.filter(s => {
      if (seen.has(s._id)) return false;
      seen.add(s._id);
      return true;
    });

    const newCurrentIndex = deduped.findIndex(s => s._id === currentId);

    set({
      displayQueue: deduped,
      queue: [...deduped],
      currentIndex: newCurrentIndex,
    });
  },

  // ... keep ALL your existing methods ...
  // ONLY modify playNext to handle URL resolution:

  playNext: async () => {
    const state = get();

    // Handle repeat - SAME AS YOUR CURRENT CODE
    if (state.isRepeat && state.currentSong) {
      set({
        isPlaying: true,
        hasTrackedCurrentSong: false,
        currentTime: 0,
      });
      return;
    }

    let nextSong: Song | null = null;

    // 1-4: EXACTLY THE SAME queue logic as your current code
    if (state.nextUpQueue.length > 0) {
      const newNextUp = [...state.nextUpQueue];
      nextSong = newNextUp.shift()!;
      set({ nextUpQueue: newNextUp });
    } else if (state.currentIndex + 1 < state.mainQueue.length) {
      const newIndex = state.currentIndex + 1;
      nextSong = state.mainQueue[newIndex];
      set({ currentIndex: newIndex });
    } else if (state.laterQueue.length > 0) {
      const newLater = [...state.laterQueue];
      nextSong = newLater.shift()!;
      set({ laterQueue: newLater });
    }

    if (!nextSong) {
      await get().autoRefillQueue();
      const refreshed = get();
      if (refreshed.laterQueue.length > 0) {
        const newLater = [...refreshed.laterQueue];
        nextSong = newLater.shift()!;
        set({ laterQueue: newLater });
      }
    }

    if (!nextSong) return;

    // Safety check - SAME AS YOUR CURRENT CODE
    if (nextSong._id === state.currentSong?._id) {
      const afterState = get();
      if (afterState.nextUpQueue.length > 0) {
        const skip = [...afterState.nextUpQueue];
        nextSong = skip.shift()!;
        set({ nextUpQueue: skip });
      } else if (afterState.currentIndex + 1 < afterState.mainQueue.length) {
        const newIdx = afterState.currentIndex + 1;
        nextSong = afterState.mainQueue[newIdx];
        set({ currentIndex: newIdx });
      } else if (afterState.laterQueue.length > 0) {
        const skip = [...afterState.laterQueue];
        nextSong = skip.shift()!;
        set({ laterQueue: skip });
      } else {
        return;
      }
    }

    // *** NEW: Resolve URL for external songs before playing ***
    if (nextSong.source === "youtube" && nextSong.videoId) {
      const resolvedUrl = await get().resolveAudioUrl(nextSong);
      if (resolvedUrl) {
        nextSong = { ...nextSong, audioUrl: resolvedUrl };
      } else {
        // Skip this song if URL resolution fails, try next
        console.error("Failed to resolve URL, skipping:", nextSong.title);
        // Remove from wherever it was and try again
        set({
          currentSong: state.currentSong, // Keep current
        });
        get()._rebuildDisplay();
        // Recursively try next
        await get().playNext();
        return;
      }
    }

    set({
      currentSong: nextSong,
      isPlaying: true,
      hasTrackedCurrentSong: false,
      currentTime: 0,
    });

    get()._rebuildDisplay();
    emitActivity(`Playing ${nextSong.title} by ${nextSong.artist}`);
    get().saveToCache();

    // Pre-emptive refill - SAME AS YOUR CURRENT CODE
    const postState = get();
    const upcomingCount =
      postState.nextUpQueue.length +
      Math.max(0, postState.mainQueue.length - (postState.currentIndex + 1)) +
      postState.laterQueue.length;

    if (upcomingCount < 5) {
      get().autoRefillQueue();
    }
  },

  // MODIFY playSong to handle external songs:
  playSong: (song: Song) => {
    const state = get();

    // *** NEW: For external songs, resolve URL first ***
    if (song.source === "youtube" && song.videoId && !song.audioUrl) {
      // Use async version
      get().playExternalSong(song);
      return;
    }

    // Check if this song is in mainQueue
    const mainIdx = state.mainQueue.findIndex(s => s._id === song._id);

    if (mainIdx !== -1) {
      set({
        currentSong: song,
        currentIndex: mainIdx,
        hasTrackedCurrentSong: false,
        currentTime: 0,
        _pendingResumePosition: null,
        isPlaying: true,
      });
    } else {
      const newNext = state.nextUpQueue.filter(s => s._id !== song._id);
      const newLater = state.laterQueue.filter(s => s._id !== song._id);

      set({
        nextUpQueue: newNext,
        laterQueue: newLater,
        currentSong: song,
        hasTrackedCurrentSong: false,
        currentTime: 0,
        _pendingResumePosition: null,
        isPlaying: true,
      });
    }

    get()._rebuildDisplay();
    emitActivity(`Playing ${song.title} by ${song.artist}`);
    get().saveToCache();
  },

  // _rebuildDisplay: () => {
  //   const state = get();
  //   const { mainQueue, nextUpQueue, laterQueue, currentSong } = state;
  //   const mainCurrentIndex = state.currentIndex;

  //   if (!currentSong) {
  //     const display = [...nextUpQueue, ...mainQueue, ...laterQueue];
  //     set({
  //       displayQueue: display,
  //       queue: [...display],
  //       currentIndex: -1,
  //     });
  //     return;
  //   }

  //   const currentId = currentSong._id;

  //   const history = mainQueue
  //     .slice(0, Math.max(0, mainCurrentIndex))
  //     .filter(s => s._id !== currentId);

  //   const upcomingMain = mainQueue
  //     .slice(Math.max(0, mainCurrentIndex + 1))
  //     .filter(s => s._id !== currentId);

  //   const filteredNext = nextUpQueue.filter(s => s._id !== currentId);
  //   const filteredLater = laterQueue.filter(s => s._id !== currentId);

  //   const display = [
  //     ...history,
  //     currentSong,
  //     ...filteredNext,
  //     ...upcomingMain,
  //     ...filteredLater,
  //   ];

  //   const seen = new Set<string>();
  //   const deduped = display.filter(s => {
  //     if (seen.has(s._id)) return false;
  //     seen.add(s._id);
  //     return true;
  //   });

  //   const newCurrentIndex = deduped.findIndex(s => s._id === currentId);

  //   set({
  //     displayQueue: deduped,
  //     queue: [...deduped],
  //     currentIndex: newCurrentIndex,
  //   });
  // },

  setHasTrackedCurrentSong: (value: boolean) => set({ hasTrackedCurrentSong: value }),

  restoreFromCache: () => {
    const prefs = usePreferencesStore.getState();
    const lastPlayed = prefs.lastPlayed;

    if (!lastPlayed?.song) return false;

    const age = Date.now() - lastPlayed.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      prefs.clearLastPlayed();
      return false;
    }

    set({
      currentSong: lastPlayed.song,
      mainQueue: [lastPlayed.song],
      nextUpQueue: [],
      laterQueue: [],
      currentIndex: 0,
      _hasRestoredFromCache: true,
      _pendingResumePosition: lastPlayed.position,
      isPlaying: false,
    });

    get()._rebuildDisplay();
    return true;
  },

  saveToCache: () => {
    const state = get();
    if (state.currentSong && state.currentTime > 10) {
      usePreferencesStore.getState().setLastPlayed(state.currentSong, state.currentTime);
    }
  },

  getPendingResumePosition: () => get()._pendingResumePosition,
  clearPendingResume: () => set({ _pendingResumePosition: null }),

  initializeQueue: (songs: Song[], startIndexOrSong: number | Song = 0, autoplay = false) => {
    if (!Array.isArray(songs) || songs.length === 0) return;

    let startIndex = 0;
    if (typeof startIndexOrSong === "number") {
      startIndex = clamp(startIndexOrSong, 0, songs.length - 1);
    } else if (startIndexOrSong && typeof startIndexOrSong === "object") {
      const idx = songs.findIndex((s) => s._id === startIndexOrSong._id);
      startIndex = idx === -1 ? 0 : idx;
    }

    const song = songs[startIndex];

    set({
      mainQueue: [...songs],
      nextUpQueue: [],
      laterQueue: [],
      currentSong: song,
      currentIndex: startIndex,
      hasTrackedCurrentSong: false,
      _pendingResumePosition: null,
      currentTime: 0,
    });

    emitActivity(`Playing ${song.title} by ${song.artist}`);
    get()._rebuildDisplay();
    set({ isPlaying: autoplay });

    if (autoplay) {
      get().saveToCache();
    }
  },

  playAlbum: (songs: Song[], startIndex = 0) => {
    if (!Array.isArray(songs) || songs.length === 0) return;
    const idx = clamp(startIndex, 0, songs.length - 1);
    const song = songs[idx];

    set({
      mainQueue: [...songs],
      nextUpQueue: [],
      laterQueue: [],
      currentSong: song,
      currentIndex: idx,
      hasTrackedCurrentSong: false,
      _pendingResumePosition: null,
      currentTime: 0,
    });

    get()._rebuildDisplay();
    emitActivity(`Playing ${song.title} by ${song.artist}`);
    set({ isPlaying: true });
    get().saveToCache();
  },

  setCurrentSong: (song: Song | null) => {
    if (!song) {
      set({ currentSong: null, isPlaying: false, currentIndex: -1 });
      return;
    }

    emitActivity(`Playing ${song.title} by ${song.artist}`);

    const state = get();
    const mainIdx = state.mainQueue.findIndex((s) => s._id === song._id);

    set({
      currentSong: song,
      currentIndex: mainIdx !== -1 ? mainIdx : state.currentIndex,
      hasTrackedCurrentSong: false,
      _pendingResumePosition: null,
      currentTime: 0,
    });

    get()._rebuildDisplay();
    set({ isPlaying: true });
    get().saveToCache();
  },

  reset: () => {
    get().saveToCache();
    emitActivity("Idle");

    set({
      currentSong: null,
      isPlaying: false,
      queue: [],
      displayQueue: [],
      currentIndex: -1,
      currentTime: 0,
      mainQueue: [],
      nextUpQueue: [],
      laterQueue: [],
      hasTrackedCurrentSong: false,
      _pendingResumePosition: null,
    });
  },

  togglePlay: () => {
    const willStart = !get().isPlaying;
    const current = get().currentSong;

    emitActivity(
      willStart && current
        ? `Playing ${current.title} by ${current.artist}`
        : "Idle"
    );

    set({ isPlaying: willStart });

    if (!willStart) {
      get().saveToCache();
    }
  },

  playPrevious: () => {
    const state = get();
    if (state.mainQueue.length > 0 && state.currentIndex > 0) {
      const prevIdx = state.currentIndex - 1;
      const prev = state.mainQueue[prevIdx];
      set({
        currentIndex: prevIdx,
        currentSong: prev,
        hasTrackedCurrentSong: false,
        currentTime: 0,
      });
      get()._rebuildDisplay();
      set({ isPlaying: true });
      get().saveToCache();
    }
  },

  removeFromQueue: (id: string) => {
    const state = get();

    // Don't remove the currently playing song via queue remove
    if (state.currentSong?._id === id) return;

    const newMainQueue = state.mainQueue.filter((s) => s._id !== id);
    const newNextUpQueue = state.nextUpQueue.filter((s) => s._id !== id);
    const newLaterQueue = state.laterQueue.filter((s) => s._id !== id);

    // Recalculate currentIndex in mainQueue
    let newCurrentIndex = state.currentIndex;
    if (state.currentSong) {
      const idx = newMainQueue.findIndex(s => s._id === state.currentSong!._id);
      if (idx !== -1) {
        newCurrentIndex = idx;
      }
    }

    set({
      mainQueue: newMainQueue,
      nextUpQueue: newNextUpQueue,
      laterQueue: newLaterQueue,
      currentIndex: newCurrentIndex,
    });

    get()._rebuildDisplay();
  },

  // playSong: (song: Song) => {
  //   const state = get();

  //   // Check if this song is in mainQueue
  //   const mainIdx = state.mainQueue.findIndex(s => s._id === song._id);

  //   if (mainIdx !== -1) {
  //     // Song is in the main queue — just move the cursor
  //     set({
  //       currentSong: song,
  //       currentIndex: mainIdx,
  //       hasTrackedCurrentSong: false,
  //       currentTime: 0,
  //       _pendingResumePosition: null,
  //       isPlaying: true,
  //     });
  //   } else {
  //     // Song is not in main queue — remove from other queues and set as current
  //     const newNext = state.nextUpQueue.filter(s => s._id !== song._id);
  //     const newLater = state.laterQueue.filter(s => s._id !== song._id);

  //     set({
  //       nextUpQueue: newNext,
  //       laterQueue: newLater,
  //       currentSong: song,
  //       hasTrackedCurrentSong: false,
  //       currentTime: 0,
  //       _pendingResumePosition: null,
  //       isPlaying: true,
  //     });
  //   }

  //   get()._rebuildDisplay();
  //   emitActivity(`Playing ${song.title} by ${song.artist}`);
  //   get().saveToCache();
  // },

  addSongToQueue: (song: Song) => {
    const state = get();

    const exists =
      (state.currentSong && state.currentSong._id === song._id) ||
      state.mainQueue.some((s) => s._id === song._id) ||
      state.nextUpQueue.some((s) => s._id === song._id) ||
      state.laterQueue.some((s) => s._id === song._id);

    if (exists) return;

    set({ laterQueue: [...state.laterQueue, song] });
    get()._rebuildDisplay();
  },

  reorderQueue: (newUpcomingSongs: Song[]) => {
    const state = get();
    const currentId = state.currentSong?._id;

    const seen = new Set<string>();
    const cleaned = newUpcomingSongs
      .filter(Boolean)
      .filter((s) => s._id !== currentId)
      .filter((s) => {
        if (seen.has(s._id)) return false;
        seen.add(s._id);
        return true;
      });

    set({
      nextUpQueue: cleaned,
      mainQueue: state.mainQueue.slice(0, state.currentIndex + 1),
      laterQueue: [],
    });

    get()._rebuildDisplay();
  },

  addSongNext: (song: Song) => {
    const state = get();

    const exists =
      (state.currentSong && state.currentSong._id === song._id) ||
      state.mainQueue.some((s) => s._id === song._id) ||
      state.nextUpQueue.some((s) => s._id === song._id) ||
      state.laterQueue.some((s) => s._id === song._id);

    if (exists) return;

    // Add to FRONT of nextUpQueue
    set({ nextUpQueue: [song, ...state.nextUpQueue] });
    get()._rebuildDisplay();
  },

autoRefillQueue: async () => {
    const state = get();

    if (state._isRefilling) return;
    if (Date.now() - state._lastRefillTime < REFILL_DEBOUNCE_MS) return;

    const totalUpcoming =
      state.nextUpQueue.length +
      Math.max(0, state.mainQueue.length - (state.currentIndex + 1)) +
      state.laterQueue.length;

    if (totalUpcoming >= 5) return;

    set({ _isRefilling: true });

    try {
      const currentSong = state.currentSong;
      let newSongs: Song[] = [];

      // ─── Strategy 1: JioSaavn recommendations (if current song is external) ───
      if (
        currentSong?.source === "jiosaavn" &&
        currentSong.externalId
      ) {
        try {
          const { fetchRecommendations } = useStreamStore.getState();
          const recoResults = await fetchRecommendations(
            currentSong.externalId,
            "jiosaavn"
          );

          newSongs = recoResults
            .filter((s: any) => s.streamUrl)
            .map((s: any) => ({
              _id: s.externalId,
              title: s.title,
              artist: s.artist,
              duration: s.duration,
              imageUrl: s.imageUrl,
              audioUrl: s.streamUrl || "",
              albumId: null,
              source: "jiosaavn" as const,
              externalId: s.externalId,
              streamUrl: s.streamUrl,
              album: s.album,
            }));
        } catch (err) {
          // Fall through to next strategy
        }
      }

      // ─── Strategy 2: Search-based reco for local/uploaded songs ───
      if (
        newSongs.length < 3 &&
        currentSong &&
        (!currentSong.source || currentSong.source === "local")
      ) {
        try {
          // Build a search query from the current song's artist or title
          const searchQuery =
            currentSong.artist && currentSong.artist !== "Unknown Artist"
              ? currentSong.artist.split(",")[0].trim()
              : currentSong.title;

          if (searchQuery) {
            // const { searchExternal } = useStreamStore.getState();

            // Temporarily search without updating UI state
            const searchRes = await axiosInstance.get("/stream/search", {
              params: { q: searchQuery, limit: 15, source: "jiosaavn" },
            });

            const results = searchRes.data?.results || [];

            const searchSongs: Song[] = results
              .filter(
                (s: any) =>
                  s.streamUrl &&
                  s.externalId !== currentSong._id &&
                  s.externalId !== currentSong.externalId
              )
              .slice(0, 10 - newSongs.length)
              .map((s: any) => ({
                _id: s.externalId,
                title: s.title,
                artist: s.artist,
                duration: s.duration,
                imageUrl: s.imageUrl,
                audioUrl: s.streamUrl || "",
                albumId: null,
                source: "jiosaavn" as const,
                externalId: s.externalId,
                streamUrl: s.streamUrl,
                album: s.album,
              }));

            newSongs = [...newSongs, ...searchSongs];
          }
        } catch {
          // Fall through to local fallback
        }
      }

      // ─── Strategy 3: Local random songs (final fallback) ───
      if (newSongs.length < 5) {
        try {
          const res = await axiosInstance.get(
            `/songs/random?limit=${10 - newSongs.length}`
          );
          const localSongs: Song[] = res.data || [];
          newSongs = [...newSongs, ...localSongs];
        } catch {
          // Nothing more we can do
        }
      }

      if (newSongs.length === 0) return;

      // Deduplicate against existing queue
      const existingIds = new Set<string>();
      if (state.currentSong) {
        existingIds.add(state.currentSong._id);
        if (state.currentSong.externalId) existingIds.add(state.currentSong.externalId);
      }
      state.mainQueue.forEach((s) => {
        existingIds.add(s._id);
        if ((s as any).externalId) existingIds.add((s as any).externalId);
      });
      state.nextUpQueue.forEach((s) => {
        existingIds.add(s._id);
        if ((s as any).externalId) existingIds.add((s as any).externalId);
      });
      state.laterQueue.forEach((s) => {
        existingIds.add(s._id);
        if ((s as any).externalId) existingIds.add((s as any).externalId);
      });

      const unique = newSongs.filter(
        (s) => !existingIds.has(s._id) && !existingIds.has((s as any).externalId || "")
      );

      if (unique.length > 0) {
        set((st) => ({
          laterQueue: [...st.laterQueue, ...unique],
          _lastRefillTime: Date.now(),
        }));
        get()._rebuildDisplay();
      }
    } catch (err) {
      console.error("Auto-refill failed:", err);
    } finally {
      set({ _isRefilling: false });
    }
  },

  toggleShuffle: () => {
    const { isShuffle, queue, currentSong, currentIndex } = get();

    const newShuffle = !isShuffle;
    usePreferencesStore.getState().setIsShuffle(newShuffle);

    if (!queue.length) {
      set({ isShuffle: newShuffle });
      return;
    }

    let newDisplay: Song[];
    if (newShuffle) {
      newDisplay = shuffleArray(queue);
      if (currentSong) {
        const idx = newDisplay.findIndex((s) => s._id === currentSong._id);
        if (idx !== -1) {
          const [cur] = newDisplay.splice(idx, 1);
          newDisplay.splice(currentIndex, 0, cur);
        }
      }
    } else {
      newDisplay = [...queue];
    }

    set({
      isShuffle: newShuffle,
      displayQueue: newDisplay,
    });
  },

  toggleRepeat: () => {
    const newRepeat = !get().isRepeat;
    usePreferencesStore.getState().setIsRepeat(newRepeat);
    set({ isRepeat: newRepeat });
  },

  setDuration: (d: number) => set({ duration: d }),

  setCurrentTime: (t: number) => {
    set({ currentTime: t });

    if (savePositionTimeout) {
      clearTimeout(savePositionTimeout);
    }
    savePositionTimeout = setTimeout(() => {
      get().saveToCache();
    }, SAVE_POSITION_DEBOUNCE_MS);
  },

  setIsPlaying: (b: boolean) => set({ isPlaying: b }),

  setVolume: (v: number) => {
    const clamped = clamp(v, 0, 100);
    usePreferencesStore.getState().setVolume(clamped);
    set({ volume: clamped });
  },
}));

const initFromPreferences = () => {
  const prefs = usePreferencesStore.getState();
  usePlayerStore.setState({
    volume: prefs.volume,
    isShuffle: prefs.isShuffle,
    isRepeat: prefs.isRepeat,
  });
};

if (typeof window !== "undefined") {
  setTimeout(initFromPreferences, 100);
}