// stores/useDownloadStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

// Workaround for typing issues in some environments
const FS = FileSystem as any;
const documentDirectory = FS.documentDirectory || FS.DocumentDirectoryPath;

export interface DownloadedSong {
    id: string;
    title: string;
    artist: string;
    artwork: string;
    localUri: string;
    duration: number;
    downloadedAt: number;
    playlistId?: string;
    albumId?: string;
}

export interface DownloadedCollection {
    id: string;
    title: string;
    artist: string;
    artwork: string;
    songIds: string[];
    downloadedAt: number;
}

interface DownloadStore {
    downloadedSongs: Record<string, DownloadedSong>;
    downloadedPlaylists: Record<string, DownloadedCollection>;
    downloadedAlbums: Record<string, DownloadedCollection>;
    isDownloading: Record<string, boolean>;

    downloadTrack: (song: any, context?: { playlistId?: string, albumId?: string }) => Promise<void>;
    downloadPlaylist: (playlist: any, songs: any[]) => Promise<void>;
    downloadAlbum: (album: any, songs: any[]) => Promise<void>;
    removeDownload: (songId: string) => Promise<void>;
    removePlaylistDownload: (playlistId: string) => Promise<void>;
    removeAlbumDownload: (albumId: string) => Promise<void>;
    isDownloaded: (songId: string) => boolean;
    reset: () => Promise<void>;
}

const DOWNLOAD_DIR = `${documentDirectory}downloads/`;

// Ensure directory exists
const ensureDir = async () => {
    try {
        const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
        if (!dirInfo.exists) {
            console.log(`[DownloadStore] Creating downloads directory: ${DOWNLOAD_DIR}`);
            await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { recursive: true } as any);
        } else {
            // console.log(`[DownloadStore] Downloads directory exists: ${DOWNLOAD_DIR}`);
        }
    } catch (e) {
        console.error("[DownloadStore] ensureDir failed", e);
    }
};

export const useDownloadStore = create<DownloadStore>()(
    persist(
        (set, get) => ({
            downloadedSongs: {},
            downloadedPlaylists: {},
            downloadedAlbums: {},
            isDownloading: {},

            downloadTrack: async (song, context) => {
                const songId = song.id || song.externalId || song._id;
                if (!songId || (get().downloadedSongs[songId] && !context) || get().isDownloading[songId]) return;

                set((state) => ({ 
                    isDownloading: { ...state.isDownloading, [songId]: true } 
                }));

                try {
                    await ensureDir();
                    
                    const url = song.url || song.audioUrl || song.streamUrl;
                    if (!url) throw new Error("No URL to download");

                    const fileExt = url.includes('.mp3') ? '.mp3' : '.m4a';
                    const fileName = `${songId}${fileExt}`;
                    const localUri = `${DOWNLOAD_DIR}${fileName}`;

                    console.log(`[DownloadStore] Starting download for: ${song.title}`, { url, localUri });
                    const downloadRes = await FileSystem.downloadAsync(url, localUri, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Referer': 'https://www.jiosaavn.com/'
                        }
                    });

                    if (downloadRes.status !== 200) {
                        console.error(`[DownloadStore] Download failed with status: ${downloadRes.status}`, downloadRes);
                        throw new Error(`Download failed with status ${downloadRes.status}`);
                    }

                    console.log(`[DownloadStore] Audio download complete: ${downloadRes.uri}`);

                    // Also download artwork if it exists to keep it offline
                    let localArtwork = song.artwork || song.imageUrl;
                    if (localArtwork && localArtwork.startsWith('http')) {
                        try {
                            const artworkName = `art_${songId}.jpg`;
                            const artworkUri = `${DOWNLOAD_DIR}${artworkName}`;
                            console.log(`[DownloadStore] Downloading artwork: ${localArtwork} -> ${artworkUri}`);
                            const artRes = await FileSystem.downloadAsync(localArtwork, artworkUri);
                            if (artRes.status === 200) {
                                localArtwork = artworkUri;
                                console.log(`[DownloadStore] Artwork download complete: ${artworkUri}`);
                            } else {
                                console.warn(`[DownloadStore] Artwork download failed with status: ${artRes.status}`);
                            }
                        } catch (e) {
                            console.log("[DownloadStore] Artwork download error", e);
                        }
                    }

                    const downloadedSong: DownloadedSong = {
                        id: songId,
                        title: song.title,
                        artist: song.artist,
                        artwork: localArtwork,
                        localUri: downloadRes.uri,
                        duration: song.duration,
                        downloadedAt: Date.now(),
                        playlistId: context?.playlistId,
                        albumId: context?.albumId,
                    };

                    set((state) => ({
                        downloadedSongs: { ...state.downloadedSongs, [songId]: downloadedSong },
                        isDownloading: { ...state.isDownloading, [songId]: false }
                    }));
                } catch (error) {
                    console.error("[DownloadStore] Download error", error);
                    set((state) => ({ 
                        isDownloading: { ...state.isDownloading, [songId]: false } 
                    }));
                }
            },

            downloadPlaylist: async (playlist, songs) => {
                const playlistId = playlist.id || playlist.externalId || playlist._id;
                if (!playlistId) return;

                // Download all songs in the playlist
                for (const song of songs) {
                    await get().downloadTrack(song, { playlistId });
                }

                const downloadedPlaylist: DownloadedCollection = {
                    id: playlistId,
                    title: playlist.name || playlist.title,
                    artist: playlist.artist || 'Vibra',
                    artwork: playlist.imageUrl || (songs[0]?.imageUrl),
                    songIds: songs.map(s => s.id || s.externalId || s._id),
                    downloadedAt: Date.now(),
                };

                set((state) => ({
                    downloadedPlaylists: { ...state.downloadedPlaylists, [playlistId]: downloadedPlaylist }
                }));
            },

            downloadAlbum: async (album, songs) => {
                const albumId = album.id || album.externalId || album._id;
                if (!albumId) return;

                for (const song of songs) {
                    await get().downloadTrack(song, { albumId });
                }

                const downloadedAlbum: DownloadedCollection = {
                    id: albumId,
                    title: album.title || album.name,
                    artist: album.artist,
                    artwork: album.imageUrl || (songs[0]?.imageUrl),
                    songIds: songs.map(s => s.id || s.externalId || s._id),
                    downloadedAt: Date.now(),
                };

                set((state) => ({
                    downloadedAlbums: { ...state.downloadedAlbums, [albumId]: downloadedAlbum }
                }));
            },

            removeDownload: async (songId) => {
                const song = get().downloadedSongs[songId];
                if (!song) return;

                try {
                    await FileSystem.deleteAsync(song.localUri, { idempotent: true });
                    if (song.artwork && song.artwork.startsWith(DOWNLOAD_DIR)) {
                        await FileSystem.deleteAsync(song.artwork, { idempotent: true });
                    }

                    const newDownloadedSongs = { ...get().downloadedSongs };
                    delete newDownloadedSongs[songId];
                    set({ downloadedSongs: newDownloadedSongs });
                } catch (error) {
                    console.error("[DownloadStore] Remove error", error);
                }
            },

            removePlaylistDownload: async (playlistId) => {
                const playlist = get().downloadedPlaylists[playlistId];
                if (!playlist) return;

                // Remove songs that only belong to this playlist
                for (const songId of playlist.songIds) {
                    const song = get().downloadedSongs[songId];
                    if (song && song.playlistId === playlistId && !song.albumId) {
                        await get().removeDownload(songId);
                    }
                }

                const newPlaylists = { ...get().downloadedPlaylists };
                delete newPlaylists[playlistId];
                set({ downloadedPlaylists: newPlaylists });
            },

            removeAlbumDownload: async (albumId) => {
                const album = get().downloadedAlbums[albumId];
                if (!album) return;

                for (const songId of album.songIds) {
                    const song = get().downloadedSongs[songId];
                    if (song && song.albumId === albumId && !song.playlistId) {
                        await get().removeDownload(songId);
                    }
                }

                const newAlbums = { ...get().downloadedAlbums };
                delete newAlbums[albumId];
                set({ downloadedAlbums: newAlbums });
            },

            isDownloaded: (songId) => {
                return !!get().downloadedSongs[songId];
            },

            reset: async () => {
                set({
                    downloadedSongs: {},
                    downloadedPlaylists: {},
                    downloadedAlbums: {},
                    isDownloading: {},
                });
            },
        }),
        {
            name: 'vibra-downloads',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
