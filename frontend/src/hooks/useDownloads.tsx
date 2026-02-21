import { useState, useCallback, useEffect } from "react";
import { get, set, del, keys } from "idb-keyval";
import { axiosInstance } from "@/lib/axios";
import toast from "react-hot-toast";

export type DownloadState = "idle" | "downloading" | "completed" | "error";

// ✅ Cache for blob URLs to prevent recreation
const blobUrlCache = new Map<string, string>();

// Helper to ensure JioSaavn URLs are proxied
const getProxiedUrl = (url: string) => {
  const AUDIO_PROXY_URL = import.meta.env.VITE_AUDIO_PROXY_URL || "";
  if (!AUDIO_PROXY_URL || !url) return url;
  if (url.includes("saavncdn.com") || url.includes("jiosaavn.com")) {
    return `${AUDIO_PROXY_URL}?url=${encodeURIComponent(url)}`;
  }
  return url;
};

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
      let downloadUrl = song.audioUrl || song.streamUrl;

      // 1. Resolve External URL if missing (JioSaavn case)
      if (!downloadUrl && (song.externalId || song._id?.startsWith("jiosaavn_"))) {
        const cleanId = (song.externalId || song._id).replace("jiosaavn_", "");
        const res = await axiosInstance.get(`/stream/stream-url/jiosaavn/${cleanId}`);
        downloadUrl = res.data?.url;
      }

      if (!downloadUrl) throw new Error("No playable URL found");

      // 2. Apply Proxy to avoid CORS issues during fetch
      const proxiedUrl = getProxiedUrl(downloadUrl);

      const response = await fetch(proxiedUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();

      // 3. Store Metadata + Blob
      // We store all necessary fields so the player recognizes it as a valid Song object
      await set(`song-${song._id}`, {
        _id: song._id,
        externalId: song.externalId || song._id,
        source: song.source || "jiosaavn",
        title: song.title,
        artist: song.artist,
        imageUrl: song.imageUrl,
        duration: song.duration,
        audioBlob: blob, // Actual file
      });

      setState("completed");
    } catch (err) {
      console.error("Download failed", err);
      setState("error");
      toast.error("Download failed. Check your connection.");
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