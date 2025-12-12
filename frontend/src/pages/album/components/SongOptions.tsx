import React, { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { 
  MoreHorizontal, 
  ListPlus, 
  Heart, 
  PlusSquare, 
  Download, 
  Check,
  Pencil,
  FolderOpen,
  Trash2,
  ListStart,
  ListEnd,
} from "lucide-react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useMusicStore } from "@/stores/useMusicStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-hot-toast";
import { useDownloads } from "@/hooks/useDownloads";
import MoveToAlbumDialog from "@/components/MoveToAlbumDialog";
import EditSongDialog from "@/components/EditSongDialog";
import AddToPlaylistDialog from "@/components/AddToPlaylistDialog";

type Props = {
  song: any;
  forceOpen?: boolean;
  onClose?: () => void;
  inlineTrigger?: boolean;
};

// ✅ Delete Confirmation Dialog
const DeleteConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  songTitle,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  songTitle: string;
  isLoading: boolean;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999]"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-sm overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Delete Song</h3>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Are you sure you want to delete{" "}
                  <span className="text-white font-medium">"{songTitle}"</span>?
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3 p-4 pt-0">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

const SongOptions: React.FC<Props> = ({
  song,
  forceOpen = false,
  onClose,
  inlineTrigger = true,
}) => {
  const [open, setOpen] = useState(forceOpen);
  const { isSignedIn } = useAuth();
  const { likedSongs, likeSong, unlikeSong, deleteSong } = useMusicStore();
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const { isAdmin } = useAuthStore();

  // ✅ Admin dialog states
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLiked = likedSongs.some((s: any) => s._id === song._id);

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
      const upcoming = displayQueue.slice(Math.max(0, currentIndex + 1));
      const nextSongs = upcoming.slice(0, 1);
      const remaining = upcoming.slice(1);

      const upcomingNew = [...nextSongs, song, ...remaining]
        .filter((s: any, idx: number, arr: any[]) => arr.findIndex((x: any) => x._id === s._id) === idx);

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

  // ✅ Admin: Handle Delete
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSong(song._id);
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const stopAndOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
  };

  const openDialogWithDelay = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      // if (onClose) onClose(); // Add this line
      setTimeout(() => {
        setter(true);
      }, 150); // Slightly longer delay
    };
  };
  

  return (
    <>
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
            <span />
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
              <ListStart className="h-4 w-4 text-violet-400" />
              <span>Add to play next</span>
            </button>

            <button
              className="w-full text-left px-4 py-2.5 rounded-lg lg:hover:bg-white/5 flex items-center gap-2 text-[13px] text-zinc-200 active:scale-[0.97] transition"
              onClick={addToQueue}
            >
              <ListEnd className="h-4 w-4 text-violet-400" />
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

            {isSignedIn && (
              <button
                className="w-full text-left px-4 py-2.5 rounded-lg lg:hover:bg-white/5 flex items-center gap-2 text-[13px] text-zinc-200 active:scale-[0.97] transition"
                onClick={openDialogWithDelay(setAddToPlaylistOpen)}
              >
                <ListPlus className="h-4 w-4 text-violet-400" />
                <span>Add to Playlist</span>
              </button>
            )}

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
              ) : downloadState === "completed" ? (
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

            {/* ✅ Admin Only Options */}
            {isAdmin && (
              <>
                <div className="border-t border-white/10 my-1" />

                <button
                  className="w-full text-left px-4 py-2.5 rounded-lg lg:hover:bg-white/5 flex items-center gap-2 text-[13px] text-zinc-200 active:scale-[0.97] transition"
                  onClick={openDialogWithDelay(setEditDialogOpen)}
                >
                  <Pencil className="h-4 w-4 text-violet-400" />
                  <span>Edit Song</span>
                </button>

                <button
                  className="w-full text-left px-4 py-2.5 rounded-lg lg:hover:bg-white/5 flex items-center gap-2 text-[13px] text-zinc-200 active:scale-[0.97] transition"
                  onClick={openDialogWithDelay(setMoveDialogOpen)}
                >
                  <FolderOpen className="h-4 w-4 text-violet-400" />
                  <span>Move to Album</span>
                </button>

                <button
                  className="w-full text-left px-4 py-2.5 rounded-lg lg:hover:bg-red-500/10 flex items-center gap-2 text-[13px] text-red-400 active:scale-[0.97] transition"
                  onClick={openDialogWithDelay(setDeleteDialogOpen)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Song</span>
                </button>
              </>
            )}
          </motion.div>
        </PopoverContent>
      </Popover>

      {isSignedIn && (
  <AddToPlaylistDialog
    isOpen={addToPlaylistOpen}
    onClose={() => {
      setAddToPlaylistOpen(false);
      if (onClose) onClose(); // Call parent onClose when dialog closes
    }}
    song={song}
  />
)}

{isAdmin && (
  <>
    <MoveToAlbumDialog
      isOpen={moveDialogOpen}
      onClose={() => {
        setMoveDialogOpen(false);
        if (onClose) onClose();
      }}
      song={song}
    />
    <EditSongDialog
      isOpen={editDialogOpen}
      onClose={() => {
        setEditDialogOpen(false);
        if (onClose) onClose();
      }}
      song={song}
    />
    <DeleteConfirmDialog
      isOpen={deleteDialogOpen}
      onClose={() => {
        setDeleteDialogOpen(false);
        if (onClose) onClose();
      }}
      onConfirm={handleDelete}
      songTitle={song.title}
      isLoading={isDeleting}
    />
  </>
)}
    </>
  );
};

export default React.memo(SongOptions);