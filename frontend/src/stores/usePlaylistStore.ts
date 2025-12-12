import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";
import { Playlist } from "@/types";

interface PlaylistStore {
  playlists: Playlist[];
  allPlaylists: Playlist[];
  currentPlaylist: Playlist | null;
  isLoading: boolean;
  error: string | null;

  fetchUserPlaylists: () => Promise<void>;
  fetchAllPlaylists: () => Promise<void>;
  fetchPlaylistById: (id: string) => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  updatePlaylist: (id: string, data: { name?: string; description?: string; imageUrl?: string }) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
}

export const usePlaylistStore = create<PlaylistStore>((set) => ({
  playlists: [],
  allPlaylists: [],
  currentPlaylist: null,
  isLoading: false,
  error: null,

  fetchUserPlaylists: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/playlists/my-playlists");
      set({ playlists: response.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || "Error fetching playlists" });
    }
  },

  fetchAllPlaylists: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/playlists/featured");
      set({ allPlaylists: response.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || "Error fetching all playlists" });
    }
  },

  fetchPlaylistById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(`/playlists/${id}`);
      set({ currentPlaylist: response.data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || "Error fetching playlist" });
    }
  },

  createPlaylist: async (name: string, description?: string) => {
    try {
      const response = await axiosInstance.post("/playlists", { name, description });
      set((state) => ({
        playlists: [response.data, ...state.playlists],
      }));
      return response.data; // Return the created playlist
    } catch (error: any) {
      console.error("Error creating playlist", error);
      throw new Error(error.response?.data?.message || "Failed to create playlist");
    }
  },

  updatePlaylist: async (id: string, data: { name?: string; description?: string; imageUrl?: string }) => {
    try {
      const response = await axiosInstance.put(`/playlists/${id}`, data);
      set((state) => ({
        playlists: state.playlists.map((p) => (p._id === id ? response.data : p)),
        currentPlaylist: state.currentPlaylist?._id === id ? response.data : state.currentPlaylist,
      }));
    } catch (error: any) {
      console.error("Error updating playlist", error);
      throw new Error(error.response?.data?.message || "Failed to update playlist");
    }
  },

  deletePlaylist: async (id: string) => {
    try {
      await axiosInstance.delete(`/playlists/${id}`);
      set((state) => ({
        playlists: state.playlists.filter((p) => p._id !== id),
        allPlaylists: state.allPlaylists.filter((p) => p._id !== id),
        currentPlaylist: state.currentPlaylist?._id === id ? null : state.currentPlaylist,
      }));
    } catch (error) {
      console.error("Error deleting playlist", error);
    }
  },

  addSongToPlaylist: async (playlistId: string, songId: string) => {
    const res = await axiosInstance.patch(`/playlists/${playlistId}/songs`, { op: "add", songId });
    set((state) => ({
      currentPlaylist: state.currentPlaylist?._id === playlistId ? res.data : state.currentPlaylist,
      playlists: state.playlists.map((p) => (p._id === playlistId ? res.data : p)),
    }));
  },

  removeSongFromPlaylist: async (playlistId: string, songId: string) => {
    const res = await axiosInstance.patch(`/playlists/${playlistId}/songs`, { op: "remove", songId });
    set((state) => ({
      currentPlaylist: state.currentPlaylist?._id === playlistId ? res.data : state.currentPlaylist,
      playlists: state.playlists.map((p) => (p._id === playlistId ? res.data : p)),
    }));
  },
}));