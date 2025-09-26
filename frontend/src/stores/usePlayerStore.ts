// src/stores/usePlayerStore.ts
import { create } from "zustand";
import { Song } from "@/types";
import { useChatStore } from "./useChatStore";

interface PlayerStore {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  currentIndex: number;
  duration: number;
  currentTime: number;
  volume: number;
  isShuffle: boolean;
  isRepeat: boolean; // repeat one

  // polymorphic: second param can be (index:number) OR (Song)
  initializeQueue: (songs: Song[], startIndexOrSong?: number | Song, autoplay?: boolean) => void;
  playAlbum: (songs: Song[], startIndex?: number) => void;
  setCurrentSong: (song: Song | null) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;

  // sync helpers used by AudioPlayer
  setDuration: (d: number) => void;
  setCurrentTime: (t: number) => void;
  setIsPlaying: (b: boolean) => void;
  setVolume: (v: number) => void;

  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  queue: [],
  currentIndex: -1,
  duration: 0,
  currentTime: 0,
  volume: 100,
  isShuffle: false,
  isRepeat: false,

  initializeQueue: (songs: Song[], startIndexOrSong = 0, autoplay = false) => {
    if (!Array.isArray(songs) || songs.length === 0) return;

    const socket = useChatStore.getState().socket;

    // determine startIndex from either number or Song object
    let startIndex = 0;
    if (typeof startIndexOrSong === "number") {
      startIndex = clamp(startIndexOrSong, 0, songs.length - 1);
    } else if (typeof startIndexOrSong === "object" && startIndexOrSong !== null) {
      const idx = songs.findIndex((s) => s._id === (startIndexOrSong as Song)._id);
      startIndex = idx === -1 ? 0 : idx;
    } else {
      startIndex = 0;
    }

    const existingCurrent = get().currentSong;
    const existingIndexInNewQueue = existingCurrent
      ? songs.findIndex((s) => s._id === existingCurrent._id)
      : -1;

    if (autoplay) {
      const songToPlay = songs[startIndex];
      if (socket?.auth) {
        socket.emit("update_activity", {
          userId: socket.auth.userId,
          activity: `Playing ${songToPlay.title} by ${songToPlay.artist}`,
        });
      }
      set({
        queue: songs,
        currentSong: songToPlay,
        currentIndex: startIndex,
        isPlaying: true,
      });
      return;
    }

    // preserve current song if it exists in the new queue
    if (existingIndexInNewQueue !== -1) {
      set({
        queue: songs,
        currentIndex: existingIndexInNewQueue,
      });
      return;
    }

    // if there's no current song, set one but don't autoplay
    if (!existingCurrent) {
      set({
        queue: songs,
        currentSong: songs[startIndex],
        currentIndex: startIndex,
        isPlaying: false,
      });
      return;
    }

    // default: set queue and keep playback paused
    set({
      queue: songs,
      currentSong: songs[startIndex],
      currentIndex: startIndex,
      isPlaying: false,
    });
  },

  playAlbum: (songs: Song[], startIndex = 0) => {
    if (!Array.isArray(songs) || songs.length === 0) return;
    const idx = clamp(startIndex, 0, songs.length - 1);
    const song = songs[idx];
    const socket = useChatStore.getState().socket;
    if (socket?.auth) {
      socket.emit("update_activity", {
        userId: socket.auth.userId,
        activity: `Playing ${song.title} by ${song.artist}`,
      });
    }
    set({ queue: songs, currentSong: song, currentIndex: idx, isPlaying: true });
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
    const songIndex = get().queue.findIndex((s) => s._id === song._id);
    set({ currentSong: song, isPlaying: true, currentIndex: songIndex !== -1 ? songIndex : get().currentIndex });
  },

  togglePlay: () => {
    const willStartPlaying = !get().isPlaying;
    const currentSong = get().currentSong;
    const socket = useChatStore.getState().socket;
    if (socket?.auth) {
      socket.emit("update_activity", {
        userId: socket.auth.userId,
        activity: willStartPlaying && currentSong ? `Playing ${currentSong.title} by ${currentSong.artist}` : "Idle",
      });
    }
    set({ isPlaying: willStartPlaying });
  },

  playNext: () => {
    const { currentIndex, queue, isShuffle, isRepeat } = get();
    if (!queue || queue.length === 0) return;

    // repeat one: replay current song
    if (isRepeat && queue[currentIndex]) {
      const song = queue[currentIndex];
      set({ currentSong: song, currentIndex, isPlaying: true });
      return;
    }

    let nextIndex = currentIndex + 1;

    if (isShuffle) {
      // pick a random index that's not the current (if possible)
      if (queue.length === 1) nextIndex = 0;
      else {
        let attempts = 0;
        do {
          nextIndex = Math.floor(Math.random() * queue.length);
          attempts++;
        } while (nextIndex === currentIndex && attempts < 10);
      }
    } else {
      if (nextIndex >= queue.length) nextIndex = 0;
    }

    const nextSong = queue[nextIndex];
    const socket = useChatStore.getState().socket;
    if (socket?.auth) {
      socket.emit("update_activity", {
        userId: socket.auth.userId,
        activity: `Playing ${nextSong.title} by ${nextSong.artist}`,
      });
    }
    set({ currentSong: nextSong, currentIndex: nextIndex, isPlaying: true });
  },

  playPrevious: () => {
    const { currentIndex, queue, isShuffle, isRepeat } = get();
    if (!queue || queue.length === 0) return;

    // repeat one: replay current
    if (isRepeat && queue[currentIndex]) {
      const song = queue[currentIndex];
      set({ currentSong: song, currentIndex, isPlaying: true });
      return;
    }

    let prevIndex = currentIndex - 1;

    if (isShuffle) {
      if (queue.length === 1) prevIndex = 0;
      else {
        let attempts = 0;
        do {
          prevIndex = Math.floor(Math.random() * queue.length);
          attempts++;
        } while (prevIndex === currentIndex && attempts < 10);
      }
    } else {
      if (prevIndex < 0) prevIndex = queue.length - 1;
    }

    const prevSong = queue[prevIndex];
    const socket = useChatStore.getState().socket;
    if (socket?.auth) {
      socket.emit("update_activity", {
        userId: socket.auth.userId,
        activity: `Playing ${prevSong.title} by ${prevSong.artist}`,
      });
    }
    set({ currentSong: prevSong, currentIndex: prevIndex, isPlaying: true });
  },

  toggleShuffle: () => set({ isShuffle: !get().isShuffle }),
  toggleRepeat: () => set({ isRepeat: !get().isRepeat }),

  // sync helpers used by the <audio> element hook
  setDuration: (d: number) => set({ duration: d }),
  setCurrentTime: (t: number) => set({ currentTime: t }),
  setIsPlaying: (b: boolean) => set({ isPlaying: b }),
  setVolume: (v: number) => set({ volume: Math.min(100, Math.max(0, v)) }),
}));
