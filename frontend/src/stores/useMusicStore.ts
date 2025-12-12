import { axiosInstance } from "@/lib/axios";
import { Album, Song, Stats } from "@/types";
import toast from "react-hot-toast";
import { create } from "zustand";

interface PatchAlbumSongsPayload {
  op: "add" | "remove" | "replace" | "reorder";
  songId?: string;
  songs?: string[];
}

interface MusicStore {
  songs: Song[];
  albums: Album[];
  isLoading: boolean;
  error: string | null;
  currentAlbum: Album | null;
  featuredSongs: Song[];
  madeForYouSongs: Song[];
  trendingSongs: Song[];
  stats: Stats;
  likedSongs: Song[];
  searchResults: Song[];

  fetchAlbums: () => Promise<void>;
  fetchAlbumById: (id: string) => Promise<void>;
  fetchFeaturedSongs: () => Promise<void>;
  fetchMadeForYouSongs: () => Promise<void>;
  fetchTrendingSongs: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchSongs: () => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  fetchLikedSongs: () => Promise<void>;
  likeSong: (id: string) => Promise<void>;
  unlikeSong: (id: string) => Promise<void>;
  searchSongs: (q: string) => Promise<void>;
  clearLikedSongs: () => void;
  patchAlbumSongs: (albumId: string, payload: PatchAlbumSongsPayload) => Promise<void>;
  updateSong: (id: string, data: { title?: string; artist?: string; duration?: number }) => Promise<void>;
  changeSongAlbum: (songId: string, albumId: string | null) => Promise<void>;
  updateSongImage: (id: string, imageFile: File) => Promise<void>;
  updateSongAudio: (id: string, audioFile: File, duration?: number) => Promise<void>;
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  albums: [],
  songs: [],
  isLoading: false,
  error: null,
  currentAlbum: null,
  madeForYouSongs: [],
  featuredSongs: [],
  trendingSongs: [],
  likedSongs: [],
  searchResults: [],
  clearLikedSongs: () => set({ likedSongs: [] }),
  stats: {
    totalSongs: 0,
    totalAlbums: 0,
    totalUsers: 0,
    totalArtists: 0,
  },

  updateSongImage: async (id, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('imageFile', imageFile);
  
      const response = await axiosInstance.patch(`/admin/songs/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
      // Update song in local state
      set((state) => ({
        songs: state.songs.map((song) =>
          song._id === id ? { ...song, imageUrl: response.data.imageUrl } : song
        ),
        currentAlbum: state.currentAlbum
          ? {
              ...state.currentAlbum,
              songs: state.currentAlbum.songs.map((song: any) =>
                song._id === id ? { ...song, imageUrl: response.data.imageUrl } : song
              ),
            }
          : null,
      }));
  
      toast.success("Song image updated successfully");
    } catch (error: any) {
      console.error("Error updating song image:", error);
      toast.error(error.response?.data?.message || "Failed to update image");
      throw error;
    }
  },
  
  updateSongAudio: async (id, audioFile, duration) => {
    try {
      const formData = new FormData();
      formData.append('audioFile', audioFile);
      if (duration) {
        formData.append('duration', duration.toString());
      }
  
      const response = await axiosInstance.patch(`/admin/songs/${id}/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
      // Update song in local state
      set((state) => ({
        songs: state.songs.map((song) =>
          song._id === id ? { ...song, audioUrl: response.data.audioUrl, duration: response.data.duration } : song
        ),
        currentAlbum: state.currentAlbum
          ? {
              ...state.currentAlbum,
              songs: state.currentAlbum.songs.map((song: any) =>
                song._id === id ? { ...song, audioUrl: response.data.audioUrl, duration: response.data.duration } : song
              ),
            }
          : null,
      }));
  
      toast.success("Song audio updated successfully");
    } catch (error: any) {
      console.error("Error updating song audio:", error);
      toast.error(error.response?.data?.message || "Failed to update audio");
      throw error;
    }
  },

  updateSong: async (id, data) => {
    try {
      const response = await axiosInstance.patch(`/admin/songs/${id}`, data);
      
      // Update song in local state
      set((state) => ({
        songs: state.songs.map((song) =>
          song._id === id ? { ...song, ...response.data } : song
        ),
        // Also update in currentAlbum if viewing
        currentAlbum: state.currentAlbum
          ? {
              ...state.currentAlbum,
              songs: state.currentAlbum.songs.map((song) =>
                song._id === id ? { ...song, ...response.data } : song
              ),
            }
          : null,
      }));
      
      toast.success("Song updated successfully");
    } catch (error: any) {
      console.error("Error updating song:", error);
      toast.error(error.response?.data?.message || "Failed to update song");
      throw error;
    }
  },

  // Change song's album
  changeSongAlbum: async (songId, albumId) => {
    try {
      await axiosInstance.patch(`/admin/songs/${songId}/album`, { albumId });
      
      // Refresh data
      await get().fetchSongs();
      await get().fetchAlbums();
      
      // Refresh current album if viewing one
      const currentAlbum = get().currentAlbum;
      if (currentAlbum) {
        await get().fetchAlbumById(currentAlbum._id);
      }
      
      toast.success(albumId ? "Song moved to album" : "Song removed from album");
    } catch (error: any) {
      console.error("Error changing song album:", error);
      toast.error(error.response?.data?.message || "Failed to move song");
      throw error;
    }
  },

  patchAlbumSongs: async (albumId, payload) => {
    try {
      await axiosInstance.patch(`/admin/albums/${albumId}/songs`, payload);

      // refresh songs + albums so UI is consistent
      await get().fetchSongs();
      await get().fetchAlbums();
    } catch (err) {
      console.error("Error updating album songs", err);
    }
  },

  deleteSong: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`/admin/songs/${id}`);
      set((state) => ({
        songs: state.songs.filter((song) => song._id !== id),
      }));
      toast.success("Song deleted successfully");
    } catch (error: any) {
      console.log("Error in deleteSong", error);
      toast.error("Error deleting song");
    } finally {
      set({ isLoading: false });
    }
  },

  deleteAlbum: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await axiosInstance.delete(`/admin/albums/${id}`);
      set((state) => ({
        albums: state.albums.filter((album) => album._id !== id),
        songs: state.songs.map((song) =>
          song.albumId === id ? { ...song, albumId: null } : song
        ),
      }));
      toast.success("Album deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete album: " + error.message);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSongs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs");
      set({ songs: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/stats");
      set({ stats: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAlbums: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/albums");
      set({ albums: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAlbumById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(`/albums/${id}`);
      set({ currentAlbum: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFeaturedSongs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs/featured");
      set({ featuredSongs: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMadeForYouSongs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs/made-for-you");
      set({ madeForYouSongs: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTrendingSongs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs/trending");
      set({ trendingSongs: response.data });
    } catch (error: any) {
      set({ error: error.response.data.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLikedSongs: async () => {
    try {
      const res = await axiosInstance.get("/users/me/liked-songs");
      set({ likedSongs: res.data });
    } catch (err: any) {
      console.error("Error fetching liked songs", err);
    }
  },

  likeSong: async (id) => {
    try {
      const res = await axiosInstance.post(`/users/me/like/${id}`);
      set({ likedSongs: res.data });
    } catch (err: any) {
      console.error("Error liking song", err);
    }
  },

  unlikeSong: async (id) => {
    try {
      const res = await axiosInstance.delete(`/users/me/unlike/${id}`);
      set({ likedSongs: res.data });
    } catch (err: any) {
      console.error("Error unliking song", err);
    }
  },

  searchSongs: async (q) => {
    try {
      if (!q) return set({ searchResults: [] });

      const res = await axiosInstance.get(`/songs/search?q=${encodeURIComponent(q)}`);
      let results = res.data;

      results = results.filter((s: Song) =>
        s.title.toLowerCase().includes(q.toLowerCase()) ||
        s.artist.toLowerCase().includes(q.toLowerCase())
      );

      results = results.sort((a: Song, b: Song) => {
        const aExact = a.title.toLowerCase().startsWith(q.toLowerCase()) ? -1 : 0;
        const bExact = b.title.toLowerCase().startsWith(q.toLowerCase()) ? -1 : 0;
        return bExact - aExact;
      });

      results = results.slice(0, 10);

      set({ searchResults: results });
    } catch (err: any) {
      console.error("Error searching songs", err);
    }
  },
}));
