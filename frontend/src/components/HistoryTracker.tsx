// src/components/HistoryTracker.tsx
import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { axiosInstance } from "@/lib/axios";

export const HistoryTracker = () => {
  const { currentSong, hasTrackedCurrentSong, setHasTrackedCurrentSong } =
    usePlayerStore();
  const lastTrackedId = useRef<string | null>(null);

  useEffect(() => {
    if (!currentSong || hasTrackedCurrentSong) return;
    if (lastTrackedId.current === currentSong._id) return;

    const trackPlay = async () => {
      try {
        lastTrackedId.current = currentSong._id;
        setHasTrackedCurrentSong(true);

        const isExternal =
          currentSong.source === "jiosaavn" ||
          currentSong.source === "youtube" ||
          currentSong._id?.startsWith("jiosaavn_") ||
          currentSong._id?.startsWith("yt_");

        if (isExternal) {
          await axiosInstance.post("/history/track", {
            songId: currentSong._id,
            isExternal: true,
            externalData: {
              title: currentSong.title,
              artist: currentSong.artist,
              imageUrl: currentSong.imageUrl,
              duration: currentSong.duration,
              source: currentSong.source || "jiosaavn",
              externalId: currentSong.externalId || currentSong._id,
              album: currentSong.album || "",
              streamUrl: currentSong.streamUrl || currentSong.audioUrl || "",
            },
          });
        } else {
          await axiosInstance.post("/history/track", {
            songId: currentSong._id,
            isExternal: false,
          });
        }
      } catch (error) {
        console.error("Failed to track play history:", error);
      }
    };

    trackPlay();
  }, [currentSong, hasTrackedCurrentSong, setHasTrackedCurrentSong]);

  return null;
};