import React, { useCallback, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { MoreHorizontal, ListPlus, Heart, PlusSquare, Download, Check } from "lucide-react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useMusicStore } from "@/stores/useMusicStore";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-hot-toast";
import { useDownloads } from "@/hooks/useDownloads";


type Props = {
  song: any;
  forceOpen?: boolean;     // Optional: open programmatically
  onClose?: () => void;    // Optional: called when closed
  inlineTrigger?: boolean; // Optional: show 3-dots button (default true)
};

const SongOptions: React.FC<Props> = ({
  song,
  forceOpen = false,
  onClose,
  inlineTrigger = true,
}) => {
  const [open, setOpen] = useState(forceOpen);
  const { isSignedIn } = useAuth();
  const { likedSongs, likeSong, unlikeSong } = useMusicStore();

  const isLiked = likedSongs.some((s) => s._id === song._id);

  const { state: downloadState, start, remove } = useDownloads({
    _id: song._id,
    title: song.title,
    artist: song.artist,
    imageUrl: song.imageUrl,
    audioUrl: song.audioUrl,
  });
  

  const close = useCallback(() => {
    setOpen(false);
    if (onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  // Add to Play Next
  const addPlayNext = useCallback(() => {
    const state = usePlayerStore.getState();
    const { displayQueue, currentIndex, reorderQueue } = state as any;

    if (Array.isArray(displayQueue) && typeof reorderQueue === "function") {
      const upcoming = displayQueue.slice(currentIndex + 1).filter((s: any) => s._id !== song._id);
      reorderQueue([song, ...upcoming]);

      toast.custom(
        () => (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/10"
          >
            <ListPlus className="h-4 w-4 text-violet-400" />
            <span className="text-sm">Added as next</span>
          </motion.div>
        ),
        { duration: 1500 }
      );
    } else {
      toast.error("Unable to add as next");
    }

    close();
  }, [song, close]);

  // Add to Queue
  const addToQueue = useCallback(() => {
    const state = usePlayerStore.getState() as any;
    const { displayQueue, currentIndex, reorderQueue } = state;
  
    if (Array.isArray(displayQueue) && typeof reorderQueue === "function") {
      // Only use upcoming items
      const upcoming = displayQueue.slice(Math.max(0, currentIndex + 1));
  
      // Put the new song after the very next song (if any)
      const nextSongs = upcoming.slice(0, 1);
      const remaining = upcoming.slice(1);
  
      // Build the new upcoming list only (do not include history/current)
      const upcomingNew = [...nextSongs, song, ...remaining]
        // de-dupe by _id, keep first occurrence
        .filter((s, idx, arr) => arr.findIndex((x: any) => x._id === s._id) === idx);
  
      reorderQueue(upcomingNew);
  
      toast.custom(
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/10"
        >
          <PlusSquare className="h-4 w-4 text-violet-400" />
          <span className="text-sm">Added to queue</span>
        </motion.div>,
        { duration: 1500 }
      );
    } else {
      toast.error("Unable to add to queue");
    }
  
    close();
  }, [song, close]);

  // Toggle Like
  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSignedIn) {
      toast.custom(
        <div className="bg-red-800/95 text-white px-4 py-2 rounded-full shadow-lg border border-red-400/30">
          <span className="text-sm">Please sign in to Like Songs</span>
        </div>,
        { duration: 1500 }
      );
      return;
    }

    try {
      if (isLiked) {
        await unlikeSong(song._id);
        toast.custom(
          <div className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg border border-white/10">
            <span className="text-sm">Removed from Liked Songs</span>
          </div>,
          { duration: 1300 }
        );
      } else {
        await likeSong(song._id);
        toast.custom(
          <div className="bg-violet-600/90 text-white px-4 py-2 rounded-full shadow-lg border border-violet-500/20">
            <span className="text-sm">Added to Liked Songs</span>
          </div>,
          { duration: 1300 }
        );
      }
    } catch (err) {
      console.error("Like toggle failed:", err);
    }

    close();
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
  
    if (!isSignedIn) {
      toast.custom(
        <div className="bg-red-800/95 text-white px-4 py-2 rounded-full shadow-lg border border-red-400/30">
          <span className="text-sm">Please sign in to download</span>
        </div>,
        { duration: 1500 }
      );
      return;
    }
  
    try {
      if (downloadState === "completed") {
        await remove();
        toast.custom(
          <div className="bg-zinc-900/90 text-white px-4 py-2 rounded-full shadow-lg border border-white/10">
            <span className="text-sm">Removed from Downloads</span>
          </div>,
          { duration: 1500 }
        );
      } else if (downloadState === "idle") {
        await start();
        toast.custom(
          <div className="bg-violet-600/90 text-white px-4 py-2 rounded-full shadow-lg border border-violet-500/30">
            <span className="text-sm">Download completed</span>
          </div>,
          { duration: 1500 }
        );
      }
    } catch (err) {
      toast.custom(
        <div className="bg-red-500/90 text-white px-4 py-2 rounded-full shadow-lg border border-red-400/30">
          <span className="text-sm">Download failed</span>
        </div>,
        { duration: 1500 }
      );
      console.error("Download error:", err);
    }
  
    close();
  };
  
  

  const stopAndOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val && onClose) onClose();
      }}
    >
      <PopoverTrigger asChild>
        {inlineTrigger ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={stopAndOpen}
            className="rounded-full hover:bg-white/5"
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5 text-zinc-400" />
          </Button>
        ) : (
          <span /> // Dummy span for programmatic usage (no visible trigger)
        )}
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        className="w-48 bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl p-1 z-[9999] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex flex-col"
        >
          <button
            className="w-full text-left px-4 py-2.5 rounded-lg lg:hover:bg-white/5 flex items-center gap-2 text-[13px] text-zinc-200 active:scale-[0.97] transition"
            onClick={addPlayNext}
          >
            <ListPlus className="h-4 w-4 text-violet-400" />
            <span>Add to play next</span>
          </button>

          <button
            className="w-full text-left px-4 py-2.5 rounded-lg lg:hover:bg-white/5 flex items-center gap-2 text-[13px] text-zinc-200 active:scale-[0.97] transition"
            onClick={addToQueue}
          >
            <PlusSquare className="h-4 w-4 text-violet-400" />
            <span>Add to queue</span>
          </button>

          <button
            className="w-full text-left px-4 py-2.5 rounded-lg lg:hover:bg-white/5 flex items-center gap-2 text-[13px] text-zinc-200 active:scale-[0.97] transition"
            onClick={toggleLike}
          >
            <Heart
              className={`h-4 w-4 ${
                isLiked ? "fill-violet-500 text-violet-500" : "text-violet-200"
              }`}
            />
            <span>{isLiked ? "Unlike" : "Like"}</span>
          </button>

          {/* Download */}
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg lg:hover:bg-white/5 text-[13px] text-zinc-200"
            onClick={handleDownload}
          >
            {downloadState === "downloading" ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Download className="h-4 w-4 text-violet-400" />
              </motion.div>
            ) : downloadState === "completed"
            ? (
              <Check className="h-4 w-4 text-violet-300" />
            ) : (
              <Download className="h-4 w-4 text-violet-400" />
            )}
            <span>
              {downloadState === "completed"
                ? "Remove Download"
                : downloadState === "downloading"
                ? "Downloading..."
                : "Download"}
            </span>
          </button>

        </motion.div>
      </PopoverContent>
    </Popover>
  );
};

export default React.memo(SongOptions);
