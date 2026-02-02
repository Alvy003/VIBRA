import { useState, useCallback, useEffect } from "react";
import { get, set, del, keys } from "idb-keyval";

export type DownloadState = "idle" | "downloading" | "completed" | "error";

// ✅ Cache for blob URLs to prevent recreation
const blobUrlCache = new Map<string, string>();

export const useDownloads = (song?: any) => {
  const [state, setState] = useState<DownloadState>("idle");

    useEffect(() => {
    const checkDownloadStatus = async () => {
      if (!song) {
        setState("idle");
        return;
      }
      
      const downloaded = await get(`song-${song._id}`);
      if (downloaded) {
        setState("completed");
      } else {
        setState("idle");
      }
    };
    
    checkDownloadStatus();
  }, [song?._id]);

  // 🔽 Start download for a given song
  const start = async () => {
    if (!song) return;
    setState("downloading");

    try {
      const response = await fetch(song.audioUrl);
      const blob = await response.blob();

      // ✅ Store the actual Blob
      await set(`song-${song._id}`, {
        _id: song._id,
        title: song.title,
        artist: song.artist,
        imageUrl: song.imageUrl,
        audioBlob: blob,
      });

      setState("completed");
    } catch (err) {
      console.error("Download failed", err);
      setState("error");
    }
  };

  // 🔽 Remove a specific download
  const remove = async () => {
    if (!song) return;
    
    // ✅ Revoke blob URL if cached
    const cachedUrl = blobUrlCache.get(song._id);
    if (cachedUrl) {
      URL.revokeObjectURL(cachedUrl);
      blobUrlCache.delete(song._id);
    }
    
    await del(`song-${song._id}`);
  };

  // 🔽 List all downloaded songs with stable blob URLs
  const listDownloads = useCallback(async () => {
    const allKeys = await keys();
    const songKeys = allKeys.filter((k) => (k as string).startsWith("song-"));
    const allSongs = await Promise.all(songKeys.map((k) => get(k)));
    
    // ✅ Convert blobs to stable URLs
    return allSongs.filter(Boolean).map((song: any) => {
      if (!song) return null;
      
      // Check if we already have a cached blob URL
      let audioUrl = blobUrlCache.get(song._id);
      
      // If not, create one and cache it
      if (!audioUrl && song.audioBlob) {
        audioUrl = URL.createObjectURL(song.audioBlob);
        blobUrlCache.set(song._id, audioUrl);
      }
      
      // Return song with audioUrl instead of audioBlob
      return {
        _id: song._id,
        title: song.title,
        artist: song.artist,
        imageUrl: song.imageUrl,
        audioUrl: audioUrl || "", // ✅ Now has audioUrl for player
        isOffline: true, // ✅ Flag to identify offline songs
      };
    }).filter(Boolean);
  }, []);

  // 🔽 Remove by ID (for DownloadsPage)
  const removeDownload = async (id: string) => {
    // ✅ Revoke blob URL if cached
    const cachedUrl = blobUrlCache.get(id);
    if (cachedUrl) {
      URL.revokeObjectURL(cachedUrl);
      blobUrlCache.delete(id);
    }
    
    await del(`song-${id}`);
  };

  // ✅ Cleanup function to revoke all blob URLs
  const cleanupBlobUrls = useCallback(() => {
    blobUrlCache.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    blobUrlCache.clear();
  }, []);

  return { 
    state, 
    start, 
    remove, 
    listDownloads, 
    removeDownload,
    cleanupBlobUrls 
  };
};