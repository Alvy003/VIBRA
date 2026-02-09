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

  mainQueue: Song[];
  nextUpQueue: Song[];
  laterQueue: Song[];

  _isRefilling: boolean;
  _lastRefillTime: number;

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

  _rebuildDisplay: () => {
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

  playNext: async () => {
    const state = get();

    // Handle repeat
    if (state.isRepeat && state.currentSong) {
      set({
        isPlaying: true,
        hasTrackedCurrentSong: false,
        currentTime: 0,
      });
      return;
    }

    let nextSong: Song | null = null;

    // 1. Check nextUpQueue (user-added "play next" songs)
    if (state.nextUpQueue.length > 0) {
      const newNextUp = [...state.nextUpQueue];
      nextSong = newNextUp.shift()!;
      set({ nextUpQueue: newNextUp });
    }
    // 2. Check mainQueue (album/playlist songs after current)
    else if (state.currentIndex + 1 < state.mainQueue.length) {
      const newIndex = state.currentIndex + 1;
      nextSong = state.mainQueue[newIndex];
      set({ currentIndex: newIndex });
    }
    // 3. Check laterQueue (user-added "add to queue" songs)
    else if (state.laterQueue.length > 0) {
      const newLater = [...state.laterQueue];
      nextSong = newLater.shift()!;
      set({ laterQueue: newLater });
    }

    // 4. If no next song found, try auto-refill
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

    // Safety: ensure we don't replay the same song
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

    set({
      currentSong: nextSong,
      isPlaying: true,
      hasTrackedCurrentSong: false,
      currentTime: 0,
    });

    get()._rebuildDisplay();
    emitActivity(`Playing ${nextSong.title} by ${nextSong.artist}`);
    get().saveToCache();

    // Pre-emptively refill if running low
    const postState = get();
    const upcomingCount =
      postState.nextUpQueue.length +
      Math.max(0, postState.mainQueue.length - (postState.currentIndex + 1)) +
      postState.laterQueue.length;

    if (upcomingCount < 5) {
      get().autoRefillQueue();
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

  playSong: (song: Song) => {
    const state = get();

    // Check if this song is in mainQueue
    const mainIdx = state.mainQueue.findIndex(s => s._id === song._id);

    if (mainIdx !== -1) {
      // Song is in the main queue — just move the cursor
      set({
        currentSong: song,
        currentIndex: mainIdx,
        hasTrackedCurrentSong: false,
        currentTime: 0,
        _pendingResumePosition: null,
        isPlaying: true,
      });
    } else {
      // Song is not in main queue — remove from other queues and set as current
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