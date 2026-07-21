// stores/useDownloadStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { axiosInstance } from '@/lib/axios';
import { useToastStore } from './useToastStore';
import { captureEvent } from '@/lib/analytics';
import * as Sentry from '@sentry/react-native';

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
    removeDownload: (songId: string, isBatch?: boolean) => Promise<void>;
    removePlaylistDownload: (playlistId: string) => Promise<void>;
    removeAlbumDownload: (albumId: string) => Promise<void>;
    isDownloaded: (songId: string) => boolean;
    getStorageSize: () => Promise<number>;
    reset: () => Promise<void>;
}

const DOWNLOAD_DIR = `${documentDirectory}downloads/`;

// Ensure directory exists
const ensureDir = async () => {
    try {
        const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
        if (!dirInfo.exists) {
            if (__DEV__) {
                console.log(`[DownloadStore] Creating downloads directory: ${DOWNLOAD_DIR}`);
            }
            await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { recursive: true } as any);
        } else {
            // console.log(`[DownloadStore] Downloads directory exists: ${DOWNLOAD_DIR}`);
        }
    } catch (e) {
        Sentry.captureException(e);
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

                captureEvent('download_started', { type: 'track', source: song.source || 'unknown' });

                set((state) => ({
                    isDownloading: { ...state.isDownloading, [songId]: true }
                }));

                if (!context) {
                    useToastStore.getState().showToast({
                        message: "Downloading track...",
                        duration: 2000
                    });
                }

                try {
                    await ensureDir();

                    let url = song.url || song.audioUrl || song.streamUrl;
                    const isJioSaavn = song.source === 'jiosaavn' || song.source === 'saavn' || songId.startsWith('jiosaavn_');

                    if (!url) {
                        const source = song.source || 'jiosaavn';
                        const cleanId = songId.replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_)/, '');
                        const cleanIdForUrl = cleanId.startsWith('jiosaavn_') ? cleanId.slice(9) : cleanId;
                        url = `/api/stream/play/${source}/${cleanIdForUrl}`;
                        if (isJioSaavn) {
                            url += '?bitrate=320';
                        }
                    } else if (isJioSaavn && url.includes('/stream/play/jiosaavn/')) {
                        if (url.includes('bitrate=')) {
                            url = url.replace(/bitrate=\d+/, 'bitrate=320');
                        } else {
                            url = url.includes('?') ? `${url}&bitrate=320` : `${url}?bitrate=320`;
                        }
                    }

                    if (url.startsWith('/')) {
                        const baseURL = axiosInstance.defaults.baseURL || '';
                        const host = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL;
                        url = `${host}${url}`;
                    }

                    const fileExt = url.includes('.mp3') ? '.mp3' : '.m4a';
                    const fileName = `${songId}${fileExt}`;
                    const localUri = `${DOWNLOAD_DIR}${fileName}`;

                    if (__DEV__) {
                        console.log(`[DownloadStore] Starting download for: ${song.title}`, { url, localUri });
                    }
                    const downloadRes = await FileSystem.downloadAsync(url, localUri, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Referer': 'https://www.jiosaavn.com/'
                        }
                    });

                    if (downloadRes.status !== 200) {
                        if (__DEV__) {
                            console.error(`[DownloadStore] Download failed with status: ${downloadRes.status}`, downloadRes);
                        }
                        throw new Error(`Download failed with status ${downloadRes.status}`);
                    }

                    if (__DEV__) {
                        console.log(`[DownloadStore] Audio download complete: ${downloadRes.uri}`);
                    }

                    // Also download artwork if it exists to keep it offline
                    let localArtwork = song.artwork || song.imageUrl;
                    if (localArtwork && localArtwork.startsWith('http')) {
                        try {
                            const artworkName = `art_${songId}.jpg`;
                            const artworkUri = `${DOWNLOAD_DIR}${artworkName}`;
                            if (__DEV__) {
                                console.log(`[DownloadStore] Downloading artwork: ${localArtwork} -> ${artworkUri}`);
                            }
                            const artRes = await FileSystem.downloadAsync(localArtwork, artworkUri);
                            if (artRes.status === 200) {
                                localArtwork = artworkUri;
                                if (__DEV__) {
                                    console.log(`[DownloadStore] Artwork download complete: ${artworkUri}`);
                                }
                            } else {
                                console.warn(`[DownloadStore] Artwork download failed with status: ${artRes.status}`);
                            }
                        } catch (e) {
                            if (__DEV__) {
                                console.log("[DownloadStore] Artwork download error", e);
                            }
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

                    if (!context) {
                        useToastStore.getState().showToast({
                            message: "Downloaded",
                            duration: 3000
                        });
                        captureEvent('download_completed', { type: 'track' });
                    }
                } catch (error) {
                    Sentry.captureException(error);
                    set((state) => ({
                        isDownloading: { ...state.isDownloading, [songId]: false }
                    }));
                }
            },

            downloadPlaylist: async (playlist, songs) => {
                const playlistId = playlist.id || playlist.externalId || playlist._id;
                if (!playlistId) return;

                useToastStore.getState().showToast({
                    message: "Downloading playlist...",
                    duration: 2000
                });
                
                captureEvent('download_started', { type: 'playlist' });

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

                useToastStore.getState().showToast({
                    message: "Playlist downloaded",
                    duration: 3000
                });
                captureEvent('download_completed', { type: 'playlist' });
            },

            downloadAlbum: async (album, songs) => {
                const albumId = album.id || album.externalId || album._id;
                if (!albumId) return;

                useToastStore.getState().showToast({
                    message: "Downloading album...",
                    duration: 2000
                });
                
                captureEvent('download_started', { type: 'album' });

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

                useToastStore.getState().showToast({
                    message: "Album downloaded",
                    duration: 3000
                });
                captureEvent('download_completed', { type: 'album' });
            },

            removeDownload: async (songId, isBatch = false) => {
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

                    if (!isBatch) {
                        useToastStore.getState().showToast({
                            message: "Removed from Downloads",
                            duration: 2500
                        });
                    }
                } catch (error) {
                    Sentry.captureException(error);
                }
            },

            removePlaylistDownload: async (playlistId) => {
                const playlist = get().downloadedPlaylists[playlistId];
                if (!playlist) return;

                // Remove songs that only belong to this playlist
                for (const songId of playlist.songIds) {
                    const song = get().downloadedSongs[songId];
                    if (song && song.playlistId === playlistId && !song.albumId) {
                        await get().removeDownload(songId, true);
                    }
                }

                const newPlaylists = { ...get().downloadedPlaylists };
                delete newPlaylists[playlistId];
                set({ downloadedPlaylists: newPlaylists });

                useToastStore.getState().showToast({
                    message: "Removed from Downloads",
                    duration: 2500
                });
            },

            removeAlbumDownload: async (albumId) => {
                const album = get().downloadedAlbums[albumId];
                if (!album) return;

                for (const songId of album.songIds) {
                    const song = get().downloadedSongs[songId];
                    if (song && song.albumId === albumId && !song.playlistId) {
                        await get().removeDownload(songId, true);
                    }
                }

                const newAlbums = { ...get().downloadedAlbums };
                delete newAlbums[albumId];
                set({ downloadedAlbums: newAlbums });

                useToastStore.getState().showToast({
                    message: "Removed from Downloads",
                    duration: 2500
                });
            },

            isDownloaded: (songId) => {
                return !!get().downloadedSongs[songId];
            },

            getStorageSize: async () => {
                try {
                    await ensureDir();
                    const info = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
                    if (!info.exists) return 0;
                    
                    // On native, we can't easily get recursive size of folder with getInfoAsync
                    // We need to sum up individual files
                    const files = await FileSystem.readDirectoryAsync(DOWNLOAD_DIR);
                    let total = 0;
                    for (const file of files) {
                        const fileInfo = await FileSystem.getInfoAsync(`${DOWNLOAD_DIR}${file}`);
                        if (fileInfo.exists && !fileInfo.isDirectory) {
                            total += fileInfo.size;
                        }
                    }
                    return total;
                } catch (e) {
                    Sentry.captureException(e);
                    return 0;
                }
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
            partialize: (state) => ({
                downloadedSongs: state.downloadedSongs,
                downloadedAlbums: state.downloadedAlbums,
                downloadedPlaylists: state.downloadedPlaylists,
            }),
        }
    )
);
