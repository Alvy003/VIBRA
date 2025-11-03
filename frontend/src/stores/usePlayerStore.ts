// src/stores/usePlayerStore.ts
import { create } from "zustand";
import { Song } from "@/types";
import { useChatStore } from "./useChatStore";
import { axiosInstance } from "@/lib/axios";

interface PlayerStore {
  currentSong: Song | null;
  isPlaying: boolean;

  // public-facing fields (kept for compatibility)
  queue: Song[]; // full derived queue (same as displayQueue)
  displayQueue: Song[]; // derived full queue used in UI
  currentIndex: number; // index of currentSong inside displayQueue (keeps UI code working)

  duration: number;
  currentTime: number;
  volume: number;
  isShuffle: boolean;
  isRepeat: boolean;

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

  // internal helpers (kept on store so cross-component calls can use them)
  autoRefillQueue: () => Promise<void>;
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

export const usePlayerStore = create<PlayerStore>((set, get) => {
  // Internal state variables will live inside the store as closures/fields:
  // mainQueue, nextUpQueue, laterQueue. We'll keep them on the store object
  // but they are considered internal implementation detail.
  return {
    currentSong: null,
    isPlaying: false,

    // derived/public
    queue: [],
    displayQueue: [],
    currentIndex: -1,

    // audio meta
    duration: 0,
    currentTime: 0,
    volume: 100,
    isShuffle: false,
    isRepeat: false,

    mainQueue: [] as Song[],
    // @ts-ignore
    nextUpQueue: [] as Song[],
    // @ts-ignore
    laterQueue: [] as Song[],

    _rebuildDisplay: () => {
      // This function will be replaced at runtime below; placeholder for TS
      (function attachRebuild() {
        const store = usePlayerStore;
        store.setState({
          // @ts-ignore
          _rebuildDisplay: function () {
            const s: any = store.getState();
            const currentSong: Song | null = s.currentSong || null;
            const mainQueue: Song[] = s.mainQueue || [];
            const nextUpQueue: Song[] = s.nextUpQueue || [];
            const laterQueue: Song[] = s.laterQueue || [];
      
            const filterOutCurrent = (songs: Song[]) =>
              currentSong ? songs.filter((s) => s._id !== currentSong._id) : songs;
      
            const cleanedMainQueue = filterOutCurrent(mainQueue);
            const cleanedNextUp = filterOutCurrent(nextUpQueue);
            const cleanedLater = filterOutCurrent(laterQueue);
      
            let display: Song[] = [];
      
            if (currentSong) {
              display = [currentSong, ...cleanedNextUp, ...cleanedMainQueue, ...cleanedLater];
              store.setState({
                displayQueue: display,
                queue: display.slice(),
                currentIndex: 0,
              } as any);
            } else {
              display = [...cleanedNextUp, ...cleanedMainQueue, ...cleanedLater];
              store.setState({
                displayQueue: display,
                queue: display.slice(),
                currentIndex: -1,
              } as any);
            }
          },
        } as any);
      })();      
      
    },

    initializeQueue: (songs: Song[], startIndexOrSong: number | Song = 0, autoplay = false) => {
      if (!Array.isArray(songs) || songs.length === 0) return;
      const socket = useChatStore.getState().socket;

      let startIndex = 0;
      if (typeof startIndexOrSong === "number") {
        startIndex = clamp(startIndexOrSong, 0, songs.length - 1);
      } else if (startIndexOrSong && typeof startIndexOrSong === "object") {
        const idx = songs.findIndex((s) => s._id === (startIndexOrSong as Song)._id);
        startIndex = idx === -1 ? 0 : idx;
      }

      // Setup main queue and clear nextUp/later
      set((state: any) => {
        state.mainQueue = [...songs];
        state.nextUpQueue = [];
        state.laterQueue = [];
        state.currentSong = songs[startIndex];
        // currentIndex refers to index inside mainQueue (not displayQueue). We'll keep it as main index.
        state.currentIndex = startIndex;

        // build display via helper below (we'll implement helper after store creation)
        return {};
      });

      // send update activity if needed
      if (socket?.auth) {
        const cs = songs[startIndex];
        socket.emit("update_activity", {
          userId: socket.auth.userId,
          activity: `Playing ${cs.title} by ${cs.artist}`,
        });
      }

      // rebuild display after state sets
      get()._rebuildDisplay();

      if (autoplay) {
        set({ isPlaying: true });
      } else {
        set({ isPlaying: false });
      }
    },

    playAlbum: (songs: Song[], startIndex = 0) => {
      if (!Array.isArray(songs) || songs.length === 0) return;
      const idx = clamp(startIndex, 0, songs.length - 1);
      const song = songs[idx];
      const socket = useChatStore.getState().socket;

      set((state: any) => {
        state.mainQueue = [...songs];
        state.nextUpQueue = [];
        state.laterQueue = [];
        state.currentSong = song;
        state.currentIndex = idx;
        return {};
      });

      get()._rebuildDisplay();

      if (socket?.auth) {
        socket.emit("update_activity", {
          userId: socket.auth.userId,
          activity: `Playing ${song.title} by ${song.artist}`,
        });
      }

      set({ isPlaying: true });
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

      // If song exists in mainQueue, update currentIndex accordingly
      set((state: any) => {
        const mainIdx = (state.mainQueue || []).findIndex((s: Song) => s._id === song._id);
        if (mainIdx !== -1) {
          state.currentIndex = mainIdx;
        } else {
          // keep currentIndex as-is (song might be from nextUp/later)
        }
        state.currentSong = song;
        return {};
      });

      get()._rebuildDisplay();
      set({ isPlaying: true });
    },

    reset: () => {
      const socket = useChatStore.getState().socket;
      if (socket?.auth) {
        socket.emit("update_activity", {
          userId: socket.auth.userId,
          activity: "Idle",
        });
      }
      
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
      } as any);
    },

    togglePlay: () => {
      const willStart = !get().isPlaying;
      const current = get().currentSong;
      const socket = useChatStore.getState().socket;
      if (socket?.auth) {
        socket.emit("update_activity", {
          userId: socket.auth.userId,
          activity: willStart && current
            ? `Playing ${current.title} by ${current.artist}`
            : "Idle",
        });
      }
      set({ isPlaying: willStart });
    },

    // playNext consumes from: nextUpQueue -> remaining mainQueue -> laterQueue
    playNext: async () => {
      const state: any = get();

      // ✅ If shuffle is enabled, use displayQueue instead of internal queues
      if (state.isShuffle && state.displayQueue && state.displayQueue.length > 0) {
        const currentIdx = state.currentIndex;
        
        // Repeat handling
        if (state.isRepeat && state.displayQueue[currentIdx]) {
          set({ currentSong: state.displayQueue[currentIdx], isPlaying: true });
          return;
        }

        // Check if there's a next song in displayQueue
        if (currentIdx + 1 < state.displayQueue.length) {
          const nextSong = state.displayQueue[currentIdx + 1];
          set({ 
            currentSong: nextSong, 
            currentIndex: currentIdx + 1,
            isPlaying: true 
          });

          const socket = useChatStore.getState().socket;
          if (socket?.auth) {
            socket.emit("update_activity", {
              userId: socket.auth.userId,
              activity: `Playing ${nextSong.title} by ${nextSong.artist}`,
            });
          }
          return;
        } else {
          // End of shuffled queue - auto refill if needed
          const upcomingCount = Math.max(0, state.displayQueue.length - (currentIdx + 1));
          if (upcomingCount < 5) {
            await get().autoRefillQueue();
            // After refill, try to play next again
            const newState: any = get();
            if (newState.displayQueue && currentIdx + 1 < newState.displayQueue.length) {
              const nextSong = newState.displayQueue[currentIdx + 1];
              set({ 
                currentSong: nextSong, 
                currentIndex: currentIdx + 1,
                isPlaying: true 
              });
              return;
            }
          }
          return; // No more songs
        }
      }

      // ✅ Original non-shuffle logic (rest of the function stays the same)
      if (
        (!state.mainQueue || state.mainQueue.length === 0)
        && (!state.nextUpQueue || state.nextUpQueue.length === 0)
        && (!state.laterQueue || state.laterQueue.length === 0)
      ) {
        return;
      }

      if (state.isRepeat && state.displayQueue && state.displayQueue[state.currentIndex]) {
        const song = state.displayQueue[state.currentIndex];
        set({ currentSong: song, isPlaying: true });
        return;
      }

      const upcomingCount = Math.max(0, state.displayQueue.length - (state.currentIndex + 1));
      if (upcomingCount < 5) {
        await get().autoRefillQueue();
      }

      let nextSong: Song | null = null;

      if (state.nextUpQueue && state.nextUpQueue.length > 0) {
        const shifted = [...state.nextUpQueue];
        nextSong = shifted.shift();
        set((s: any) => {
          s.nextUpQueue = shifted;
          return {};
        });
      } else {
        const main = state.mainQueue || [];
        const mainIdx = state.currentIndex;
        if (main && mainIdx >= 0 && mainIdx + 1 < main.length) {
          const nextIdx = mainIdx + 1;
          nextSong = main[nextIdx];
          set((s: any) => {
            s.currentIndex = nextIdx;
            return {};
          });
        } else {
          if (state.laterQueue && state.laterQueue.length > 0) {
            const later = [...state.laterQueue];
            nextSong = later.shift();
            set((s: any) => {
              s.laterQueue = later;
              return {};
            });
          }
        }
      }

      if (!nextSong) {
        await get().autoRefillQueue();
        const st2: any = get();
        if (st2.nextUpQueue && st2.nextUpQueue.length > 0) {
          nextSong = st2.nextUpQueue.shift();
          set((s: any) => {
            s.nextUpQueue = st2.nextUpQueue;
            return {};
          });
        } else if (st2.laterQueue && st2.laterQueue.length > 0) {
          nextSong = st2.laterQueue.shift();
          set((s: any) => {
            s.laterQueue = st2.laterQueue;
            return {};
          });
        } else if (st2.mainQueue && st2.currentIndex + 1 < st2.mainQueue.length) {
          nextSong = st2.mainQueue[st2.currentIndex + 1];
          set((s: any) => {
            s.currentIndex = st2.currentIndex + 1;
            return {};
          });
        }
      }

      if (!nextSong) {
        return;
      }

      set({
        currentSong: nextSong,
        isPlaying: true,
      });

      get()._rebuildDisplay();

      const socket = useChatStore.getState().socket;
      if (socket?.auth) {
        socket.emit("update_activity", {
          userId: socket.auth.userId,
          activity: `Playing ${nextSong.title} by ${nextSong.artist}`,
        });
      }
    },
    playPrevious: () => {
      const state: any = get();
      // If we have a history in mainQueue, go back there.
      if (state.mainQueue && state.currentIndex > 0) {
        const prevIdx = state.currentIndex - 1;
        const prev = state.mainQueue[prevIdx];
        set((s: any) => {
          s.currentIndex = prevIdx;
          s.currentSong = prev;
          return {};
        });
        get()._rebuildDisplay();
        set({ isPlaying: true });
        return;
      }

      // Otherwise, you can choose to ignore or pop from a history list (not implemented).
      // For now, do nothing.
    },

    removeFromQueue: (id: string) => {
      // remove from all lists and rebuild
      set((state: any) => {
        state.mainQueue = (state.mainQueue || []).filter((s: Song) => s._id !== id);
        state.nextUpQueue = (state.nextUpQueue || []).filter((s: Song) => s._id !== id);
        state.laterQueue = (state.laterQueue || []).filter((s: Song) => s._id !== id);

        // If removed song is the currentSong, try to set next song as current
        if (state.currentSong && state.currentSong._id === id) {
          // pick next from nextUp/main/later (simple approach)
          if (state.nextUpQueue && state.nextUpQueue.length > 0) {
            state.currentSong = state.nextUpQueue.shift();
          } else if (state.mainQueue && state.currentIndex + 1 < state.mainQueue.length) {
            state.currentIndex = Math.min(state.currentIndex, state.mainQueue.length - 1);
            state.currentSong = state.mainQueue[state.currentIndex];
          } else if (state.laterQueue && state.laterQueue.length > 0) {
            state.currentSong = state.laterQueue.shift();
          } else {
            state.currentSong = null;
            state.currentIndex = -1;
            state.isPlaying = false;
          }
        }

        return {};
      });

      get()._rebuildDisplay();
    },

    playSong: (song: Song) => {
      // If the song is in mainQueue, set currentIndex accordingly, else treat it as one-off play
      set((state: any) => {
        const idx = (state.mainQueue || []).findIndex((s: Song) => s._id === song._id);
        if (idx !== -1) {
          state.currentIndex = idx;
          state.currentSong = state.mainQueue[idx];
        } else {
          // If not in main queue, push it to laterQueue and set as current
          if (!state.laterQueue.some((s: Song) => s._id === song._id)) {
            state.laterQueue.push(song);
          }
          state.currentSong = song;
        }
        return {};
      });

      get()._rebuildDisplay();
      set({ isPlaying: true });

      const socket = useChatStore.getState().socket;
      if (socket?.auth) {
        socket.emit("update_activity", {
          userId: socket.auth.userId,
          activity: `Playing ${song.title} by ${song.artist}`,
        });
      }
    },

    addSongToQueue: (song: Song) => {
      // Append to laterQueue but avoid duplicates anywhere
      set((state: any) => {
        const exists =
          (state.mainQueue || []).some((s: Song) => s._id === song._id) ||
          (state.nextUpQueue || []).some((s: Song) => s._id === song._id) ||
          (state.laterQueue || []).some((s: Song) => s._id === song._id) ||
          (state.currentSong && state.currentSong._id === song._id);

        if (exists) return {}; // nothing to do

        state.laterQueue = [...(state.laterQueue || []), song];
        return {};
      });

      get()._rebuildDisplay();
    },

    reorderQueue: (newUpcomingSongs: Song[]) => {
      set((state: any) => {
        const currentSong: Song | null = state.currentSong || null;
    
        // Remove currentSong if present and de-dupe by _id
        const seen = new Set<string>();
        const cleaned = (newUpcomingSongs || [])
          .filter(Boolean)
          .filter((s: Song) => !currentSong || s._id !== currentSong._id)
          .filter((s: Song) => {
            if (seen.has(s._id)) return false;
            seen.add(s._id);
            return true;
          });
    
        state.nextUpQueue = cleaned;
        // Keep laterQueue as-is; do NOT clear it
        return {};
      });
    
      get()._rebuildDisplay();
    },

    addSongNext: (song: Song) => {
      // Insert into nextUpQueue (FIFO), avoid duplicates globally
      set((state: any) => {
        const exists =
          (state.mainQueue || []).some((s: Song) => s._id === song._id) ||
          (state.nextUpQueue || []).some((s: Song) => s._id === song._id) ||
          (state.laterQueue || []).some((s: Song) => s._id === song._id) ||
          (state.currentSong && state.currentSong._id === song._id);

        if (exists) return {};

        state.nextUpQueue = [...(state.nextUpQueue || []), song];
        return {};
      });

      get()._rebuildDisplay();
    },

    // autoRefillQueue: fetch random songs and append to laterQueue if duplicates are filtered out
    autoRefillQueue: async () => {
      const state: any = get();
      const totalUpcoming =
        (state.nextUpQueue?.length || 0) +
        Math.max(0, (state.mainQueue?.length || 0) - (state.currentIndex + 1)) +
        (state.laterQueue?.length || 0);

      if (totalUpcoming >= 5) return;

      try {
        const res = await axiosInstance.get("/songs/random?limit=10");
        const newSongs: Song[] = res.data;

        if (!Array.isArray(newSongs) || newSongs.length === 0) return;

        const existingIds = new Set<string>();
        if (state.currentSong) existingIds.add(state.currentSong._id);
        (state.mainQueue || []).forEach((s: Song) => existingIds.add(s._id));
        (state.nextUpQueue || []).forEach((s: Song) => existingIds.add(s._id));
        (state.laterQueue || []).forEach((s: Song) => existingIds.add(s._id));

        const unique = newSongs.filter((s: Song) => !existingIds.has(s._id));

        if (unique.length > 0) {
          set((st: any) => {
            st.laterQueue = [...(st.laterQueue || []), ...unique];
            return {};
          });
          get()._rebuildDisplay();
          // console.log("Auto-refilled queue with random songs");
        }
      } catch (err) {
        console.error("Auto-refill failed:", err);
      }
    },

    toggleShuffle: () => {
      const { isShuffle, queue, currentSong, currentIndex } = get();
      if (!queue.length) {
        set({ isShuffle: !isShuffle });
        return;
      }
  
      let newDisplay: Song[];
      if (!isShuffle) {
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
        isShuffle: !isShuffle,
        displayQueue: newDisplay,
      });
    },

    toggleRepeat: () => set((state: any) => ({ isRepeat: !state.isRepeat })),

    setDuration: (d: number) => set({ duration: d }),
    setCurrentTime: (t: number) => set({ currentTime: t }),
    setIsPlaying: (b: boolean) => set({ isPlaying: b }),
    setVolume: (v: number) => set({ volume: Math.min(100, Math.max(0, v)) }),
  } as any;
});

// After creating store, attach the _rebuildDisplay implementation to ensure types line up
// (we update the store object directly)
(function attachRebuild() {
  const store = usePlayerStore;
  store.setState({
    // @ts-ignore
    _rebuildDisplay: function () {
      // read internal lists (we used dynamic keys on the store object)
      const s: any = store.getState();
      const mainQueue: Song[] = s.mainQueue || [];
      const nextUpQueue: Song[] = s.nextUpQueue || [];
      const laterQueue: Song[] = s.laterQueue || [];
      const currentSong: Song | null = s.currentSong || null;
      const mainCurrentIndex: number = typeof s.currentIndex === "number" ? s.currentIndex : -1;

      // Build history (mainQueue before current)
      const historyBeforeCurrent = mainQueue.slice(0, Math.max(0, mainCurrentIndex));
      // Build remaining main after current
      const remainingMainAfter = mainQueue.slice(Math.max(0, mainCurrentIndex + 1));

      let display: Song[] = [];

      // If currentSong exists and is part of mainQueue, keep it at mainCurrentIndex position
      if (currentSong) {
        // build display preserving history length such that currentSong index == historyBeforeCurrent.length
        display = [
          ...historyBeforeCurrent,
          currentSong,
          ...nextUpQueue,
          ...remainingMainAfter,
          ...laterQueue,
        ];

        // Determine display index of currentSong
        const displayIndex = historyBeforeCurrent.length;
        store.setState({
          displayQueue: display,
          queue: display.slice(), // keep queue as alias for display
          currentIndex: displayIndex,
        } as any);
      } else {
        // No currentSong: display is nextUp + main + later
        display = [...nextUpQueue, ...mainQueue, ...laterQueue];
        store.setState({
          displayQueue: display,
          queue: display.slice(),
          currentIndex: -1,
        } as any);
      }
    },
  } as any);
})();

