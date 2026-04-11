import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { axiosInstance } from "@/lib/axios";

interface Playlist {
    _id: string;
    userId?: string;
    name: string;
    description?: string;
    imageUrl?: string;
    songs: any[];
    createdAt?: string | number;
}

interface PlaylistStore {
    playlists: Playlist[];
    isLoading: boolean;
    error: string | null;

    fetchUserPlaylists: () => Promise<void>;
    fetchPlaylistById: (id: string) => Promise<void>;
    addTrackToPlaylist: (playlistId: string, track: any) => Promise<void>;
    removeTrackFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
    createPlaylist: (name: string, description?: string) => Promise<any>;
    updatePlaylist: (id: string, name: string, description?: string) => Promise<void>;
}

export const usePlaylistStore = create<PlaylistStore>()(
    persist(
        (set, get) => ({
            playlists: [],
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

            fetchPlaylistById: async (id) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await axiosInstance.get(`/playlists/${id}`);
                    const updatedPlaylist = response.data;
                    
                    const currentPlaylists = get().playlists;
                    const index = currentPlaylists.findIndex(p => p._id === id);
                    
                    if (index !== -1) {
                        const newPlaylists = [...currentPlaylists];
                        newPlaylists[index] = updatedPlaylist;
                        set({ playlists: newPlaylists, isLoading: false });
                    } else {
                        set({ playlists: [...currentPlaylists, updatedPlaylist], isLoading: false });
                    }
                } catch (error: any) {
                    set({ isLoading: false, error: error.response?.data?.message || "Error fetching playlist" });
                }
            },

            addTrackToPlaylist: async (playlistId: string, track: any) => {
                const songId = track.id || track.externalId;
                
                // Optimistic update
                set(state => ({
                    playlists: state.playlists.map(p => {
                        if (p._id === playlistId) {
                            if (!p.songs.some(s => (s._id || s.id || s.externalId) === songId)) {
                                return { ...p, songs: [...p.songs, track] };
                            }
                        }
                        return p;
                    })
                }));

                try {
                    const songData = {
                        title: track.title,
                        artist: track.artist,
                        imageUrl: track.artwork || track.imageUrl,
                        audioUrl: track.url || track.audioUrl,
                        duration: track.duration,
                        source: track.source || 'jiosaavn',
                        externalId: songId
                    };

                    const response = await axiosInstance.patch(`/playlists/${playlistId}/songs`, {
                        op: "add",
                        songId: songId,
                        songData
                    });

                    // Update with actual server data (has _id etc)
                    set(state => ({
                        playlists: state.playlists.map(p => p._id === playlistId ? response.data : p)
                    }));
                } catch (error: any) {
                    console.error("[PlaylistStore] addTrackToPlaylist failed:", error);
                    // Revert on error
                    get().fetchPlaylistById(playlistId);
                    throw error;
                }
            },

            removeTrackFromPlaylist: async (playlistId: string, songId: string) => {
                // Optimistic update
                set(state => ({
                    playlists: state.playlists.map(p => {
                        if (p._id === playlistId) {
                            return { ...p, songs: p.songs.filter(s => (s._id || s.id || s.externalId) !== songId) };
                        }
                        return p;
                    })
                }));

                try {
                    const response = await axiosInstance.patch(`/playlists/${playlistId}/songs`, {
                        op: "remove",
                        songId
                    });
                    set((state) => ({
                        playlists: state.playlists.map(p => p._id === playlistId ? response.data : p)
                    }));
                } catch (error: any) {
                    console.error("[PlaylistStore] Failed to remove track:", error.message);
                    // Revert
                    get().fetchPlaylistById(playlistId);
                }
            },

            createPlaylist: async (name: string, description: string = "") => {
                try {
                    const response = await axiosInstance.post("/playlists", {
                        name,
                        description
                    });
                    const newPlaylist = response.data;
                    set(state => ({ playlists: [newPlaylist, ...state.playlists] }));
                    return newPlaylist;
                } catch (error: any) {
                    console.error("[PlaylistStore] createPlaylist failed:", error);
                    throw error;
                }
            },

            updatePlaylist: async (id, name, description) => {
                try {
                    const response = await axiosInstance.patch(`/playlists/${id}`, {
                        name,
                        description
                    });
                    const updatedPlaylist = response.data;
                    set(state => ({
                        playlists: state.playlists.map(p => p._id === id ? updatedPlaylist : p)
                    }));
                } catch (error: any) {
                    console.error("[PlaylistStore] updatePlaylist failed:", error);
                    throw error;
                }
            },
        }),
        {
            name: 'vibra-playlist-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ playlists: state.playlists }),
        }
    )
);
