import { create } from "zustand";
import axios from "axios";
import { Playlist } from "@/types";

type CreatePlaylistPayload = {
  name: string;
  description?: string;
  imageUrl?: string;
  isFeatured?: boolean;
};

type UpdatePlaylistPayload = Partial<CreatePlaylistPayload>;

interface PlaylistStore {
  playlists: Playlist[];
  loading: boolean;

  fetchPlaylists: () => Promise<void>;
  fetchPlaylistById: (id: string) => Promise<Playlist | null>;
  createPlaylist: (payload: CreatePlaylistPayload) => Promise<void>;
  updatePlaylist: (id: string, payload: UpdatePlaylistPayload) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  patchPlaylistSongs: (
    id: string,
    payload: {
      op: "add" | "remove" | "replace" | "reorder";
      songId?: string;
      songs?: string[];
    }
  ) => Promise<void>;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [],
  loading: false,

  fetchPlaylists: async () => {
    set({ loading: true });
    try {
      const { data } = await axios.get("/api/playlists");
      const playlists = Array.isArray(data) ? data : [];
      set({ playlists, loading: false });
    } catch (err) {
      console.error("Failed to fetch playlists:", err);
      set({ playlists: [], loading: false });
    }
  },

  fetchPlaylistById: async (id) => {
    try {
      const { data } = await axios.get(`/api/playlists/${id}`);
      return data; // backend returns the playlist object directly
    } catch (err) {
      console.error("Failed to fetch playlist:", err);
      return null;
    }
  },

  createPlaylist: async (payload) => {
    try {
      const { data } = await axios.post("/api/playlists", payload);
      set({ playlists: [data, ...get().playlists] });
    } catch (err) {
      console.error("Failed to create playlist:", err);
    }
  },

  updatePlaylist: async (id, payload) => {
    try {
      const { data } = await axios.put(`/api/playlists/${id}`, payload);
      set({
        playlists: get().playlists.map((p) => (p._id === id ? data : p)),
      });
    } catch (err) {
      console.error("Failed to update playlist:", err);
    }
  },

  deletePlaylist: async (id) => {
    try {
      await axios.delete(`/api/playlists/${id}`);
      set({ playlists: get().playlists.filter((p) => p._id !== id) });
    } catch (err) {
      console.error("Failed to delete playlist:", err);
    }
  },

  patchPlaylistSongs: async (id, payload) => {
    try {
      const { data } = await axios.patch(`/api/playlists/${id}/songs`, payload);
      set({
        playlists: get().playlists.map((p) => (p._id === id ? data : p)),
      });
    } catch (err) {
      console.error("Failed to patch playlist songs:", err);
    }
  },
}));
