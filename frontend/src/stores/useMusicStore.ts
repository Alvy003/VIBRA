// src/stores/useMusicStore.ts
import { axiosInstance } from "@/lib/axios";
import { Album, Song, Stats } from "@/types";
import toast from "react-hot-toast";
import { create } from "zustand";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePreferencesStore } from "./usePreferencesStore";

// ===== CACHE CONFIGURATION =====
const CACHE_CONFIG = {
  featuredSongs: 30 * 60 * 1000,      // 30 minutes
  madeForYouSongs: 30 * 60 * 1000,   // 30 minutes
  trendingSongs: 30 * 60 * 1000,      // 30 minutes
  albums: 30 * 60 * 1000,            // 30 minutes
  songs: 30 * 60 * 1000,             // 30 minutes (admin songs list)
  stats: 30 * 60 * 1000,             // 30 minutes
  likedSongs: 30 * 60 * 1000,         // 30 minutes
};

interface CacheTimestamps {
  featuredSongs: number;
  madeForYouSongs: number;
  trendingSongs: number;
  albums: number;
  songs: number;
  stats: number;
  likedSongs: number;
}

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
  
  // Cache management
  _cacheTimestamps: CacheTimestamps;
  _pendingRefresh: Set<string>;
  
  // Helper methods
  _isFresh: (key: keyof CacheTimestamps) => boolean;
  _markFetched: (key: keyof CacheTimestamps) => void;
  _invalidateCache: (keys: (keyof CacheTimestamps)[]) => void;

  fetchAlbums: (forceRefresh?: boolean) => Promise<void>;
  fetchAlbumById: (id: string) => Promise<void>;
  fetchFeaturedSongs: (forceRefresh?: boolean) => Promise<void>;
  fetchMadeForYouSongs: (forceRefresh?: boolean) => Promise<void>;
  fetchTrendingSongs: (forceRefresh?: boolean) => Promise<void>;
  fetchStats: (forceRefresh?: boolean) => Promise<void>;
  fetchSongs: (forceRefresh?: boolean) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  fetchLikedSongs: (forceRefresh?: boolean) => Promise<void>;
  likeSong: (id: string, songData?: any) => Promise<void>;
  unlikeSong: (id: string) => Promise<void>;
  searchSongs: (q: string) => Promise<void>;
  clearLikedSongs: () => void;
  patchAlbumSongs: (albumId: string, payload: PatchAlbumSongsPayload) => Promise<void>;
  updateSong: (id: string, data: { title?: string; artist?: string; duration?: number;   genre?: string | null; mood?: string | null; language?: string | null; }) => Promise<void>;
  changeSongAlbum: (songId: string, albumId: string | null) => Promise<void>;
  updateSongImage: (id: string, imageFile: File) => Promise<void>;
  updateSongAudio: (id: string, audioFile: File, duration?: number) => Promise<void>;
  updateAlbum: (albumId: string, payload: Partial<Album>) => Promise<void>;
  toggleAlbumActive: (albumId: string) => Promise<any>;
  refreshHomeData: () => Promise<void>;
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
  stats: {
    totalSongs: 0,
    totalAlbums: 0,
    totalUsers: 0,
    totalArtists: 0,
  },
  
  // Cache timestamps - when data was last fetched
  _cacheTimestamps: {
    featuredSongs: 0,
    madeForYouSongs: 0,
    trendingSongs: 0,
    albums: 0,
    songs: 0,
    stats: 0,
    likedSongs: 0,
  },
  
  // Track which refreshes are in progress to avoid duplicates
  _pendingRefresh: new Set(),

  // Check if cached data is still fresh
  _isFresh: (key: keyof CacheTimestamps) => {
    const timestamp = get()._cacheTimestamps[key];
    const maxAge = CACHE_CONFIG[key];
    return Date.now() - timestamp < maxAge;
  },

  // Mark data as freshly fetched
  _markFetched: (key: keyof CacheTimestamps) => {
    set((state) => ({
      _cacheTimestamps: {
        ...state._cacheTimestamps,
        [key]: Date.now(),
      },
    }));
  },

  // Invalidate specific cache entries (force next fetch to be fresh)
  _invalidateCache: (keys: (keyof CacheTimestamps)[]) => {
    set((state) => {
      const newTimestamps = { ...state._cacheTimestamps };
      keys.forEach((key) => {
        newTimestamps[key] = 0;
      });
      return { _cacheTimestamps: newTimestamps };
    });
  },

  clearLikedSongs: () => set({ likedSongs: [] }),

  // ===== FEATURED SONGS =====
  fetchFeaturedSongs: async (forceRefresh = false) => {
    const state = get();
    const hasData = state.featuredSongs.length > 0;
    const isFresh = state._isFresh("featuredSongs");
    
    // If data exists and is fresh, skip fetch entirely
    if (hasData && isFresh && !forceRefresh) {
      return;
    }
    
    // If data exists but stale, show existing and refresh in background
    if (hasData && !isFresh && !forceRefresh) {
      // Prevent duplicate background refreshes
      if (state._pendingRefresh.has("featuredSongs")) return;
      
      set((s) => ({ _pendingRefresh: new Set(s._pendingRefresh).add("featuredSongs") }));
      
      // Background refresh (no loading state)
      try {
        const response = await axiosInstance.get("/songs/featured");
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("featuredSongs");
          return { featuredSongs: response.data, _pendingRefresh: pending };
        });
        get()._markFetched("featuredSongs");
      } catch (error) {
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("featuredSongs");
          return { _pendingRefresh: pending };
        });
      }
      return;
    }
    
    // No data or force refresh - show loading
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs/featured");
      set({ featuredSongs: response.data });
      get()._markFetched("featuredSongs");
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ===== MADE FOR YOU =====
  fetchMadeForYouSongs: async (forceRefresh = false) => {
    const state = get();
    const hasData = state.madeForYouSongs.length > 0;
    const isFresh = state._isFresh("madeForYouSongs");
    
    if (hasData && isFresh && !forceRefresh) return;
    
    if (hasData && !isFresh && !forceRefresh) {
      if (state._pendingRefresh.has("madeForYouSongs")) return;
      
      set((s) => ({ _pendingRefresh: new Set(s._pendingRefresh).add("madeForYouSongs") }));
      
      try {
        const response = await axiosInstance.get("/songs/made-for-you");
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("madeForYouSongs");
          return { madeForYouSongs: response.data, _pendingRefresh: pending };
        });
        get()._markFetched("madeForYouSongs");
      } catch (error) {
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("madeForYouSongs");
          return { _pendingRefresh: pending };
        });
      }
      return;
    }
    
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs/made-for-you");
      set({ madeForYouSongs: response.data });
      get()._markFetched("madeForYouSongs");
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ===== TRENDING =====
  fetchTrendingSongs: async (forceRefresh = false) => {
    const state = get();
    const hasData = state.trendingSongs.length > 0;
    const isFresh = state._isFresh("trendingSongs");
    
    if (hasData && isFresh && !forceRefresh) return;
    
    if (hasData && !isFresh && !forceRefresh) {
      if (state._pendingRefresh.has("trendingSongs")) return;
      
      set((s) => ({ _pendingRefresh: new Set(s._pendingRefresh).add("trendingSongs") }));
      
      try {
        const response = await axiosInstance.get("/songs/trending");
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("trendingSongs");
          return { trendingSongs: response.data, _pendingRefresh: pending };
        });
        get()._markFetched("trendingSongs");
      } catch (error) {
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("trendingSongs");
          return { _pendingRefresh: pending };
        });
      }
      return;
    }
    
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs/trending");
      set({ trendingSongs: response.data });
      get()._markFetched("trendingSongs");
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ===== ALBUMS =====
  fetchAlbums: async (forceRefresh = false) => {
    const state = get();
    const hasData = state.albums.length > 0;
    const isFresh = state._isFresh("albums");
    
    if (hasData && isFresh && !forceRefresh) return;
    
    if (hasData && !isFresh && !forceRefresh) {
      if (state._pendingRefresh.has("albums")) return;
      
      set((s) => ({ _pendingRefresh: new Set(s._pendingRefresh).add("albums") }));
      
      try {
        const isAdmin = useAuthStore.getState().isAdmin;
        const response = await axiosInstance.get(
          isAdmin ? "/albums?includeInactive=true" : "/albums"
        );
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("albums");
          return { albums: response.data, _pendingRefresh: pending };
        });
        get()._markFetched("albums");
      } catch (error) {
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("albums");
          return { _pendingRefresh: pending };
        });
      }
      return;
    }
    
    set({ isLoading: true, error: null });
    try {
      const isAdmin = useAuthStore.getState().isAdmin;
      const response = await axiosInstance.get(
        isAdmin ? "/albums?includeInactive=true" : "/albums"
      );
      set({ albums: response.data });
      get()._markFetched("albums");
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  toggleAlbumActive: async (albumId: string) => {
    const res = await axiosInstance.patch(`/admin/albums/${albumId}/toggle`);
    // Update local state
    set((state) => ({
      albums: state.albums.map(a => 
        a._id === albumId ? { ...a, isActive: res.data.isActive } : a
      ),
      currentAlbum: state.currentAlbum?._id === albumId 
        ? { ...state.currentAlbum, isActive: res.data.isActive } 
        : state.currentAlbum,
    }));
    return res.data;
  },

  // ===== SONGS (Admin) =====
  fetchSongs: async (forceRefresh = false) => {
    const state = get();
    const hasData = state.songs.length > 0;
    const isFresh = state._isFresh("songs");
    
    if (hasData && isFresh && !forceRefresh) return;
    
    if (hasData && !isFresh && !forceRefresh) {
      if (state._pendingRefresh.has("songs")) return;
      
      set((s) => ({ _pendingRefresh: new Set(s._pendingRefresh).add("songs") }));
      
      try {
        const response = await axiosInstance.get("/songs");
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("songs");
          return { songs: response.data, _pendingRefresh: pending };
        });
        get()._markFetched("songs");
      } catch (error) {
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("songs");
          return { _pendingRefresh: pending };
        });
      }
      return;
    }
    
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/songs");
      set({ songs: response.data });
      get()._markFetched("songs");
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ===== STATS (Admin) =====
  fetchStats: async (forceRefresh = false) => {
    const state = get();
    const hasData = state.stats.totalSongs > 0 || state.stats.totalAlbums > 0;
    const isFresh = state._isFresh("stats");
    
    if (hasData && isFresh && !forceRefresh) return;
    
    // Stats always show loading for fresh feel in admin
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/stats");
      set({ stats: response.data });
      get()._markFetched("stats");
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ===== REFRESH ALL HOME DATA =====
  refreshHomeData: async () => {
    // Force refresh all home page data in parallel
    await Promise.all([
      get().fetchFeaturedSongs(true),
      get().fetchMadeForYouSongs(true),
      get().fetchTrendingSongs(true),
      get().fetchAlbums(true),
    ]);
  },

  // ===== ALBUM BY ID (always fresh for detail pages) =====
  fetchAlbumById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(`/albums/${id}`);
      set({ currentAlbum: response.data });
    } catch (error: any) {
      set({ error: error.response?.data?.message || error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // ===== MUTATIONS (invalidate cache after changes) =====
  
  updateSongImage: async (id, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('imageFile', imageFile);
  
      const response = await axiosInstance.patch(`/admin/songs/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
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
  
      // Invalidate caches that might contain this song
      get()._invalidateCache(['featuredSongs', 'madeForYouSongs', 'trendingSongs', 'songs']);
      
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
  
      get()._invalidateCache(['featuredSongs', 'madeForYouSongs', 'trendingSongs', 'songs']);
      
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
      
      set((state) => ({
        songs: state.songs.map((song) =>
          song._id === id ? { ...song, ...response.data } : song
        ),
        currentAlbum: state.currentAlbum
          ? {
              ...state.currentAlbum,
              songs: state.currentAlbum.songs.map((song) =>
                song._id === id ? { ...song, ...response.data } : song
              ),
            }
          : null,
      }));
      
      get()._invalidateCache(['featuredSongs', 'madeForYouSongs', 'trendingSongs', 'songs']);
      
      toast.success("Song updated successfully");
    } catch (error: any) {
      console.error("Error updating song:", error);
      toast.error(error.response?.data?.message || "Failed to update song");
      throw error;
    }
  },

  changeSongAlbum: async (songId, albumId) => {
    try {
      await axiosInstance.patch(`/admin/songs/${songId}/album`, { albumId });
      
      // Invalidate and refetch
      get()._invalidateCache(['songs', 'albums']);
      await get().fetchSongs(true);
      await get().fetchAlbums(true);
      
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

  updateAlbum: async (albumId: string, payload: Partial<Album>) => {
    const { data } = await axiosInstance.patch(
      `/admin/albums/${albumId}`,
      payload
    );
  
    set((state) => ({
      albums: state.albums.map((a) =>
        a._id === albumId ? { ...a, ...data } : a
      ),
      currentAlbum:
        state.currentAlbum?._id === albumId
          ? { ...state.currentAlbum, ...data }
          : state.currentAlbum,
    }));
  },  

  patchAlbumSongs: async (albumId, payload) => {
    try {
      await axiosInstance.patch(`/admin/albums/${albumId}/songs`, payload);
      
      get()._invalidateCache(['songs', 'albums']);
      await get().fetchSongs(true);
      await get().fetchAlbums(true);
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
      
      get()._invalidateCache(['featuredSongs', 'madeForYouSongs', 'trendingSongs', 'songs', 'albums']);
      
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
      
      get()._invalidateCache(['albums', 'songs']);
      
      toast.success("Album deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete album: " + error.message);
    } finally {
      set({ isLoading: false });
    }
  },

  // ===== LIKED SONGS =====
  fetchLikedSongs: async (forceRefresh = false) => {
    const state = get();
    const hasData = state.likedSongs.length > 0;
    const isFresh = state._isFresh("likedSongs");
    
    if (hasData && isFresh && !forceRefresh) return;
    
    if (hasData && !isFresh && !forceRefresh) {
      if (state._pendingRefresh.has("likedSongs")) return;
      
      set((s) => ({ _pendingRefresh: new Set(s._pendingRefresh).add("likedSongs") }));
      
      try {
        const res = await axiosInstance.get("/users/me/liked-songs");
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("likedSongs");
          return { likedSongs: res.data, _pendingRefresh: pending };
        });
        get()._markFetched("likedSongs");
        try {
  const ids = res.data.map((s: any) => s._id || s.externalId).filter(Boolean);
  usePreferencesStore.getState().setLikedSongIds(ids);
} catch {}
      } catch (error) {
        set((s) => {
          const pending = new Set(s._pendingRefresh);
          pending.delete("likedSongs");
          return { _pendingRefresh: pending };
        });
      }
      return;
    }
    
    try {
      const res = await axiosInstance.get("/users/me/liked-songs");
      set({ likedSongs: res.data });
      try {
      const ids = res.data.map((s: any) => s._id || s.externalId).filter(Boolean);
      usePreferencesStore.getState().setLikedSongIds(ids);
    } catch {}
      get()._markFetched("likedSongs");
    } catch (err: any) {
      console.error("Error fetching liked songs", err);
    }
  },

  likeSong: async (id: string, songData?: any) => {
    try {
      const isExternal = id.startsWith("jiosaavn_") || id.startsWith("yt_");

      if (isExternal && songData) {
        const res = await axiosInstance.post("/users/me/like-external", {
          externalId: songData.externalId || songData._id || id,
          source: songData.source || (id.startsWith("jiosaavn_") ? "jiosaavn" : "youtube"),
          title: songData.title || "",
          artist: songData.artist || "",
          album: songData.album || "",
          imageUrl: songData.imageUrl || "",
          duration: songData.duration || 0,
          language: songData.language || "",
          year: songData.year || "",
        });
        set({ likedSongs: res.data });
              try {
        const ids = res.data.map((s: any) => s._id || s.externalId).filter(Boolean);
        usePreferencesStore.getState().setLikedSongIds(ids);
      } catch {}
      } else {
        const res = await axiosInstance.post(`/users/me/like/${id}`);
        set({ likedSongs: res.data });
        try {
        const ids = res.data.map((s: any) => s._id || s.externalId).filter(Boolean);
        usePreferencesStore.getState().setLikedSongIds(ids);
      } catch {}
      }

      get()._markFetched("likedSongs");
    } catch (err: any) {
      console.error("Error liking song", err);
    }
  },

  unlikeSong: async (id: string) => {
    try {
      const isExternal = id.startsWith("jiosaavn_") || id.startsWith("yt_");

      if (isExternal) {
        const res = await axiosInstance.delete(
          `/users/me/unlike-external/${encodeURIComponent(id)}`
        );
        set({ likedSongs: res.data });
        try {
        const ids = res.data.map((s: any) => s._id || s.externalId).filter(Boolean);
        usePreferencesStore.getState().setLikedSongIds(ids);
      } catch {}
      } else {
        const res = await axiosInstance.delete(`/users/me/unlike/${id}`);
        set({ likedSongs: res.data });
        try {
        const ids = res.data.map((s: any) => s._id || s.externalId).filter(Boolean);
        usePreferencesStore.getState().setLikedSongIds(ids);
      } catch {}
      }

      get()._markFetched("likedSongs");
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