import React, { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { MoreHorizontal, ListPlus, Heart, PlusSquare } from "lucide-react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useMusicStore } from "@/stores/useMusicStore";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-hot-toast";

type Props = {
  song: any;
};

const SongOptions: React.FC<Props> = ({ song }) => {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const { likedSongs, likeSong, unlikeSong } = useMusicStore();

  const isLiked = likedSongs.some((s) => s._id === song._id);

  const close = useCallback(() => setOpen(false), []);

  //  Add as "Play Next" (works perfectly)
  const addPlayNext = useCallback(() => {
    const state = usePlayerStore.getState();
    const { displayQueue, currentIndex, reorderQueue } = state as any;

    if (Array.isArray(displayQueue) && typeof reorderQueue === "function") {
      const upcoming = displayQueue.slice(currentIndex + 1).filter((s: any) => s._id !== song._id);
      reorderQueue([song, ...upcoming]);

      toast.custom(
        (t) => (
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

  //  Add to Queue (after "play next" songs)
  const addToQueue = useCallback(() => {
    const state = usePlayerStore.getState();
    const { displayQueue, currentIndex, reorderQueue } = state as any;

    if (Array.isArray(displayQueue) && typeof reorderQueue === "function") {
      const upcoming = displayQueue.slice(currentIndex + 1);
      const nextSongs = upcoming.slice(0, 1); // play next (if any)
      const remaining = upcoming.slice(1);

      const newQueue = [...displayQueue.slice(0, currentIndex + 1), ...nextSongs, song, ...remaining];
      reorderQueue(newQueue);

      toast.custom(
        (t) => (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/10"
          >
            <PlusSquare className="h-4 w-4 text-violet-400" />
            <span className="text-sm">Added to queue</span>
          </motion.div>
        ),
        { duration: 1500 }
      );
    } else {
      toast.error("Unable to add to queue");
    }

    close();
  }, [song, close]);

  //  Like / Unlike toggle
  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSignedIn) {
      toast("Please sign in to like songs");
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

  const stopAndOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          onClick={stopAndOpen}
          className="rounded-full hover:bg-white/5"
          aria-label="More options"
        >
          <MoreHorizontal className="h-5 w-5 text-zinc-400" />
        </Button>
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
            className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-white/5 flex items-center gap-2 text-[13px] text-zinc-200 active:scale-[0.97] transition"
            onClick={addPlayNext}
          >
            <ListPlus className="h-4 w-4 text-violet-400" />
            <span>Add to play next</span>
          </button>

          <button
            disabled
            className="w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-2 text-[13px] transition
                      text-zinc-400 bg-transparent cursor-not-allowed 
                      disabled:hover:bg-zinc-800 disabled:text-zinc-500"
            onClick={addToQueue}
          >
            <PlusSquare className="h-4 w-4 text-zinc-500" />
            <span>Add to queue</span>
          </button>

          <button
            className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-white/5 flex items-center gap-2 text-[13px] text-zinc-200 active:scale-[0.97] transition"
            onClick={toggleLike}
          >
            <Heart
              className={`h-4 w-4 ${
                isLiked ? "fill-violet-500 text-violet-500" : "text-zinc-400"
              }`}
            />
            <span>{isLiked ? "Unlike" : "Like"}</span>
          </button>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
};

export default React.memo(SongOptions);
