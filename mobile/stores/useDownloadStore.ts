// stores/useDownloadStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

// Workaround for typing issues in some environments
const FS = FileSystem as any;
const documentDirectory = FS.documentDirectory || FS.DocumentDirectoryPath;

interface DownloadedSong {
    id: string;
    title: string;
    artist: string;
    artwork: string;
    localUri: string;
    duration: number;
    downloadedAt: number;
}

interface DownloadStore {
    downloadedSongs: Record<string, DownloadedSong>;
    isDownloading: Record<string, boolean>;

    downloadTrack: (song: any) => Promise<void>;
    removeDownload: (songId: string) => Promise<void>;
    isDownloaded: (songId: string) => boolean;
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
            isDownloading: {},

            downloadTrack: async (song) => {
                const songId = song.id || song.externalId || song._id;
                if (!songId || get().downloadedSongs[songId] || get().isDownloading[songId]) return;

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

            isDownloaded: (songId) => {
                return !!get().downloadedSongs[songId];
            },
        }),
        {
            name: 'vibra-downloads',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
