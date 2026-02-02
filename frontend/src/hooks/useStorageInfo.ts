import { useState, useEffect, useCallback } from "react";
import { get, keys } from "idb-keyval";

interface StorageInfo {
  used: number;           // Downloads storage used
  total: number;          // Total device quota
  available: number;      // Available space on device
  percentage: number;     // Percentage of device storage used by downloads
  songCount: number;      // Number of downloaded songs
}

export function useStorageInfo() {
  const [storage, setStorage] = useState<StorageInfo | null>(null);

  const calculateDownloadsSize = useCallback(async (): Promise<{ size: number; count: number }> => {
    try {
      const allKeys = await keys();
      const songKeys = allKeys.filter((k) => (k as string).startsWith("song-"));
      
      let totalSize = 0;
      let count = 0;
      
      for (const key of songKeys) {
        const song = await get(key);
        if (song?.audioBlob) {
          // Get the size of the audio blob
          totalSize += song.audioBlob.size || 0;
          count++;
        }
      }
      
      return { size: totalSize, count };
    } catch (error) {
      console.error("Failed to calculate downloads size:", error);
      return { size: 0, count: 0 };
    }
  }, []);

  useEffect(() => {
    const updateStorage = async () => {
      // Get downloads size from IndexedDB
      const { size: downloadsUsed, count: songCount } = await calculateDownloadsSize();
      
      // Get device total quota for reference
      let deviceTotal = 0;
      let deviceAvailable = 0;
      
      if ("storage" in navigator && "estimate" in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          deviceTotal = estimate.quota || 0;
          const deviceUsed = estimate.usage || 0;
          deviceAvailable = deviceTotal - deviceUsed;
        } catch (error) {
          console.error("Failed to estimate device storage:", error);
        }
      }

      // Calculate percentage based on downloads vs total device quota
      // Or you could show it as absolute values without percentage
      const percentage = deviceTotal > 0 ? (downloadsUsed / deviceTotal) * 100 : 0;

      setStorage({
        used: downloadsUsed,          // Only downloads size
        total: deviceTotal,            // Device total quota
        available: deviceAvailable,    // Device available space
        percentage,                    // Downloads as % of device storage
        songCount,                     // Number of songs
      });
    };

    updateStorage();
    
    // Update every 2 seconds while on downloads page
    const interval = setInterval(updateStorage, 1500);
    return () => clearInterval(interval);
  }, [calculateDownloadsSize]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return {
    storage,
    formatBytes,
  };
}