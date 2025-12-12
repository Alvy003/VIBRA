import { useEffect, useRef } from 'react';
import { usePlayerStore } from "@/stores/usePlayerStore";
import { axiosInstance } from "@/lib/axios";
import { useUser } from "@clerk/clerk-react";

export const HistoryTracker = () => {
  const { currentSong, isPlaying } = usePlayerStore();
  const { isSignedIn, isLoaded } = useUser(); // Use isLoaded
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Only track if user is loaded AND signed in
    if (currentSong && isPlaying && isLoaded && isSignedIn) {
      const timeToCount = Math.min(10000, (currentSong.duration || 30) * 1000 / 2);
      
      timerRef.current = setTimeout(async () => {
        try {
          await axiosInstance.post("/history/track", {
            songId: currentSong._id,
            playDuration: timeToCount / 1000,
            completionPercentage: 0 
          });
        } catch (error) {
          console.error("Failed to track play history", error);
        }
      }, timeToCount);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSong?._id, isPlaying, isLoaded, isSignedIn]);

  return null;
};