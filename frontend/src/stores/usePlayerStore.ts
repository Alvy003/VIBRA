// src/stores/usePlayerStore.ts
import { create } from "zustand";
import { Song } from "@/types";
import { useChatStore } from "./useChatStore";
import { usePreferencesStore } from "./usePreferencesStore";
import { axiosInstance } from "@/lib/axios";

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

  // Internal queues
  mainQueue: Song[];
  nextUpQueue: Song[];
  laterQueue: Song[];

  // Auto-refill tracking
  _isRefilling: boolean;
  _lastRefillTime: number;

  // Resume state
  _hasRestoredFromCache: boolean;
  _pendingResumePosition: number | null;

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

  // New: Resume functionality
  restoreFromCache: () => boolean;
  saveToCache: () => void;
  getPendingResumePosition: () => number | null;
  clearPendingResume: () => void;
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
const SAVE_POSITION_DEBOUNCE_MS = 5000; // Save position every 5 seconds

let savePositionTimeout: NodeJS.Timeout | null = null;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentSong: null,
  isPlaying: false,

  queue: [],
  displayQueue: [],
  currentIndex: -1,

  duration: 0,
  currentTime: 0,
  volume: usePreferencesStore.getState().volume, // Initialize from preferences
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

  _rebuildDisplay: () => {
    const state = get();
    const { mainQueue, nextUpQueue, laterQueue, currentSong } = state;
    const mainCurrentIndex =
      typeof state.currentIndex === "number" ? state.currentIndex : -1;
  
    // 🔥 STEP 2: always remove currentSong from future queues
    const filteredMain = mainQueue.filter(s => s._id !== currentSong?._id);
    const filteredNext = nextUpQueue.filter(s => s._id !== currentSong?._id);
    const filteredLater = laterQueue.filter(s => s._id !== currentSong?._id);
  
    const historyBeforeCurrent = filteredMain.slice(
      0,
      Math.max(0, mainCurrentIndex)
    );
  
    const remainingMainAfter = filteredMain.slice(
      Math.max(0, mainCurrentIndex + 1)
    );
  
    let display: Song[] = [];
  
    if (currentSong) {
      display = [
        ...historyBeforeCurrent,
        currentSong,
        ...filteredNext,
        ...remainingMainAfter,
        ...filteredLater,
      ];
  
      set({
        displayQueue: display,
        queue: [...display],
        currentIndex: historyBeforeCurrent.length,
      });
    } else {
      display = [...filteredNext, ...filteredMain, ...filteredLater];
      set({
        displayQueue: display,
        queue: [...display],
        currentIndex: -1,
      });
    }
  },

  setHasTrackedCurrentSong: (value: boolean) => set({ hasTrackedCurrentSong: value }),

  // Restore last played song from cache
  restoreFromCache: () => {
    const prefs = usePreferencesStore.getState();
    const lastPlayed = prefs.lastPlayed;

    if (!lastPlayed?.song) return false;

    // Check if not too old (24 hours)
    const age = Date.now() - lastPlayed.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      prefs.clearLastPlayed();
      return false;
    }

    set({
      currentSong: lastPlayed.song,
      mainQueue: [lastPlayed.song],
      currentIndex: 0,
      _hasRestoredFromCache: true,
      _pendingResumePosition: lastPlayed.position,
      isPlaying: false, // Don't auto-play on restore
    });

    get()._rebuildDisplay();
    return true;
  },

  // Save current state to cache
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
    const socket = useChatStore.getState().socket;

    let startIndex = 0;
    if (typeof startIndexOrSong === "number") {
      startIndex = clamp(startIndexOrSong, 0, songs.length - 1);
    } else if (startIndexOrSong && typeof startIndexOrSong === "object") {
      const idx = songs.findIndex((s) => s._id === startIndexOrSong._id);
      startIndex = idx === -1 ? 0 : idx;
    }

    set({
      mainQueue: [...songs],
      nextUpQueue: [],
      laterQueue: [],
      currentSong: songs[startIndex],
      currentIndex: startIndex,
      hasTrackedCurrentSong: false,
      _pendingResumePosition: null, // Clear any pending resume
    });

    if (socket?.auth) {
      const cs = songs[startIndex];
      socket.emit("update_activity", {
        userId: socket.auth.userId,
        activity: `Playing ${cs.title} by ${cs.artist}`,
      });
    }

    get()._rebuildDisplay();
    set({ isPlaying: autoplay });

    // Save to cache
    if (autoplay) {
      get().saveToCache();
    }
  },

  playAlbum: (songs: Song[], startIndex = 0) => {
    if (!Array.isArray(songs) || songs.length === 0) return;
    const idx = clamp(startIndex, 0, songs.length - 1);
    const song = songs[idx];
    const socket = useChatStore.getState().socket;

    set({
      mainQueue: [...songs],
      nextUpQueue: [],
      laterQueue: [],
      currentSong: song,
      currentIndex: idx,
      hasTrackedCurrentSong: false,
      _pendingResumePosition: null,
    });

    get()._rebuildDisplay();

    if (socket?.auth) {
      socket.emit("update_activity", {
        userId: socket.auth.userId,
        activity: `Playing ${song.title} by ${song.artist}`,
      });
    }

    set({ isPlaying: true });
    get().saveToCache();
  },

  setCurrentSong: (song: Song | null) => {
    if (!song) {
      set({ currentSong: null, isPlaying: false, currentIndex: -1 });
      return;
    }
    const socket = useChatStore.getState().socket;
    if (socket?.auth) {
      socket.emit("update_activity", {
        userId: socket.auth.userId,
        activity: `Playing ${song.title} by ${song.artist}`,
      });
    }

    const state = get();
    const mainIdx = state.mainQueue.findIndex((s) => s._id === song._id);

    set({
      currentSong: song,
      currentIndex: mainIdx !== -1 ? mainIdx : state.currentIndex,
      hasTrackedCurrentSong: false,
      _pendingResumePosition: null,
    });

    get()._rebuildDisplay();
    set({ isPlaying: true });
    get().saveToCache();
  },

  reset: () => {
    const socket = useChatStore.getState().socket;
    if (socket?.auth) {
      socket.emit("update_activity", {
        userId: socket.auth.userId,
        activity: "Idle",
      });
    }

    // Save current state before reset
    get().saveToCache();

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
    const socket = useChatStore.getState().socket;
    if (socket?.auth) {
      socket.emit("update_activity", {
        userId: socket.auth.userId,
        activity: willStart && current ? `Playing ${current.title} by ${current.artist}` : "Idle",
      });
    }
    set({ isPlaying: willStart });

    // Save when pausing
    if (!willStart) {
      get().saveToCache();
    }
  },

  playNext: async () => {
    const state = get();

    // Shuffle mode
    if (state.isShuffle && state.displayQueue.length > 0) {
      const currentIdx = state.currentIndex;

      if (state.isRepeat && state.displayQueue[currentIdx]) {
        set({
          currentSong: state.displayQueue[currentIdx],
          isPlaying: true,
          hasTrackedCurrentSong: false,
          currentTime: 0,
        });
        return;
      }

      if (currentIdx + 1 < state.displayQueue.length) {
        const nextSong = state.displayQueue[currentIdx + 1];
        set({
          currentSong: nextSong,
          currentIndex: currentIdx + 1,
          isPlaying: true,
          hasTrackedCurrentSong: false,
          currentTime: 0,
        });

        const socket = useChatStore.getState().socket;
        if (socket?.auth) {
          socket.emit("update_activity", {
            userId: socket.auth.userId,
            activity: `Playing ${nextSong.title} by ${nextSong.artist}`,
          });
        }
        get().saveToCache();
        return;
      } else {
        const upcomingCount = Math.max(0, state.displayQueue.length - (currentIdx + 1));
        if (upcomingCount < 5) {
          await get().autoRefillQueue();
          const newState = get();
          if (newState.displayQueue && currentIdx + 1 < newState.displayQueue.length) {
            const nextSong = newState.displayQueue[currentIdx + 1];
            set({
              currentSong: nextSong,
              currentIndex: currentIdx + 1,
              isPlaying: true,
              hasTrackedCurrentSong: false,
              currentTime: 0,
            });
            get().saveToCache();
            return;
          }
        }
        return;
      }
    }

    // Non-shuffle mode
    if (
      state.mainQueue.length === 0 &&
      state.nextUpQueue.length === 0 &&
      state.laterQueue.length === 0
    ) {
      return;
    }

    if (state.isRepeat && state.displayQueue[state.currentIndex]) {
      const song = state.displayQueue[state.currentIndex];
      set({ currentSong: song, isPlaying: true, hasTrackedCurrentSong: false, currentTime: 0 });
      return;
    }

    const upcomingCount = Math.max(0, state.displayQueue.length - (state.currentIndex + 1));
    if (upcomingCount < 5) {
      await get().autoRefillQueue();
    }

    let nextSong: Song | null = null;

    if (state.nextUpQueue.length > 0) {
      const shifted = [...state.nextUpQueue];
      nextSong = shifted.shift()!;
      set({ nextUpQueue: shifted });
    } else {
      // const mainIdx = state.currentIndex;
      if (state.nextUpQueue.length > 0) {
        nextSong = state.nextUpQueue.shift()!;
        set({ nextUpQueue: [...state.nextUpQueue] });
      } else if (state.mainQueue.length > 0) {
        nextSong = state.mainQueue[0];
        set({ mainQueue: state.mainQueue.slice(1) });
      }
      else if (state.laterQueue.length > 0) {
        const later = [...state.laterQueue];
        nextSong = later.shift()!;
        set({ laterQueue: later });
      }
    }

    if (!nextSong) {
      await get().autoRefillQueue();
      const st2 = get();
      if (st2.nextUpQueue.length > 0) {
        const shifted = [...st2.nextUpQueue];
        nextSong = shifted.shift()!;
        set({ nextUpQueue: shifted });
      } else if (st2.laterQueue.length > 0) {
        const later = [...st2.laterQueue];
        nextSong = later.shift()!;
        set({ laterQueue: later });
      } else if (st2.currentIndex + 1 < st2.mainQueue.length) {
        nextSong = st2.mainQueue[st2.currentIndex + 1];
        set({ currentIndex: st2.currentIndex + 1 });
      }
    }

    if (!nextSong) return;

    set({
      currentSong: nextSong,
      isPlaying: true,
      hasTrackedCurrentSong: false,
      currentTime: 0,
    });

    get()._rebuildDisplay();

    const socket = useChatStore.getState().socket;
    if (socket?.auth) {
      socket.emit("update_activity", {
        userId: socket.auth.userId,
        activity: `Playing ${nextSong.title} by ${nextSong.artist}`,
      });
    }

    get().saveToCache();
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

    const newMainQueue = state.mainQueue.filter((s) => s._id !== id);
    const newNextUpQueue = state.nextUpQueue.filter((s) => s._id !== id);
    const newLaterQueue = state.laterQueue.filter((s) => s._id !== id);

    let newCurrentSong = state.currentSong;
    let newCurrentIndex = state.currentIndex;
    let newIsPlaying = state.isPlaying;

    if (state.currentSong && state.currentSong._id === id) {
      if (newNextUpQueue.length > 0) {
        newCurrentSong = newNextUpQueue.shift()!;
      } else if (newCurrentIndex + 1 < newMainQueue.length) {
        newCurrentIndex = Math.min(newCurrentIndex, newMainQueue.length - 1);
        newCurrentSong = newMainQueue[newCurrentIndex];
      } else if (newLaterQueue.length > 0) {
        newCurrentSong = newLaterQueue.shift()!;
      } else {
        newCurrentSong = null;
        newCurrentIndex = -1;
        newIsPlaying = false;
      }
    }

    set({
      mainQueue: newMainQueue,
      nextUpQueue: newNextUpQueue,
      laterQueue: newLaterQueue,
      currentSong: newCurrentSong,
      currentIndex: newCurrentIndex,
      isPlaying: newIsPlaying,
    });

    get()._rebuildDisplay();
  },

  playSong: (song: Song) => {
    const state = get();
  
    // Remove song from ALL queues
    const newMain = state.mainQueue.filter(s => s._id !== song._id);
    const newNext = state.nextUpQueue.filter(s => s._id !== song._id);
    const newLater = state.laterQueue.filter(s => s._id !== song._id);
  
    set({
      mainQueue: newMain,
      nextUpQueue: newNext,
      laterQueue: newLater,
      currentSong: song,
      currentIndex: -1, // 🔥 important: not pointing into mainQueue
      hasTrackedCurrentSong: false,
      currentTime: 0,
      _pendingResumePosition: null,
      isPlaying: true,
    });
  
    get()._rebuildDisplay();
    get().saveToCache();
  },

  addSongToQueue: (song: Song) => {
    const state = get();
    const exists =
      state.mainQueue.some((s) => s._id === song._id) ||
      state.nextUpQueue.some((s) => s._id === song._id) ||
      state.laterQueue.some((s) => s._id === song._id) ||
      (state.currentSong && state.currentSong._id === song._id);

    if (exists) return;

    set({ laterQueue: [...state.laterQueue, song] });
    get()._rebuildDisplay();
  },

  reorderQueue: (newUpcomingSongs: Song[]) => {
    const state = get();
    const currentSong = state.currentSong;

    const seen = new Set<string>();
    const cleaned = newUpcomingSongs
      .filter(Boolean)
      .filter((s) => !currentSong || s._id !== currentSong._id)
      .filter((s) => {
        if (seen.has(s._id)) return false;
        seen.add(s._id);
        return true;
      });

    set({ nextUpQueue: cleaned });
    get()._rebuildDisplay();
  },

  addSongNext: (song: Song) => {
    const state = get();
    const exists =
      state.mainQueue.some((s) => s._id === song._id) ||
      state.nextUpQueue.some((s) => s._id === song._id) ||
      state.laterQueue.some((s) => s._id === song._id) ||
      (state.currentSong && state.currentSong._id === song._id);

    if (exists) return;

    set({ nextUpQueue: [...state.nextUpQueue, song] });
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
      const res = await axiosInstance.get("/songs/random?limit=10");
      const newSongs: Song[] = res.data;

      if (!Array.isArray(newSongs) || newSongs.length === 0) return;

      const existingIds = new Set<string>();
      if (state.currentSong) existingIds.add(state.currentSong._id);
      state.mainQueue.forEach((s) => existingIds.add(s._id));
      state.nextUpQueue.forEach((s) => existingIds.add(s._id));
      state.laterQueue.forEach((s) => existingIds.add(s._id));

      const unique = newSongs.filter((s) => !existingIds.has(s._id));

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

    // Debounced save to cache
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

// Initialize from preferences on first load
const initFromPreferences = () => {
  const prefs = usePreferencesStore.getState();
  usePlayerStore.setState({
    volume: prefs.volume,
    isShuffle: prefs.isShuffle,
    isRepeat: prefs.isRepeat,
  });
};

// Run initialization
if (typeof window !== "undefined") {
  // Wait for preferences to hydrate
  setTimeout(initFromPreferences, 100);
}