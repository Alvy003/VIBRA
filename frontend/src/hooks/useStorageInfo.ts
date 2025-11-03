import { useState, useEffect } from "react";

interface StorageInfo {
  used: number;
  total: number;
  available: number;
  percentage: number;
}

export function useStorageInfo() {
  const [storage, setStorage] = useState<StorageInfo | null>(null);

  useEffect(() => {
    const updateStorage = async () => {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          const used = estimate.usage || 0;
          const total = estimate.quota || 0;
          const available = total - used;
          const percentage = total > 0 ? (used / total) * 100 : 0;

          setStorage({
            used,
            total,
            available,
            percentage,
          });
        } catch (error) {
          console.error("Failed to estimate storage:", error);
        }
      }
    };

    updateStorage();
    
    // Update every 2 seconds while on downloads page
    const interval = setInterval(updateStorage, 2000);
    return () => clearInterval(interval);
  }, []);

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