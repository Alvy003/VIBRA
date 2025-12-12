// src/pages/layout/components/PlaybackControlsSongOptions.tsx
import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  ListPlus,
  Download,
  Check,
  ListStart,
  ListEnd,
  Pencil,
  FolderOpen,
  Trash2,
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
  onClose: () => void;
  variant: "desktop" | "mobile-sheet";
};

// Delete Confirmation Dialog
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

const PlaybackControlsSongOptions: React.FC<Props> = ({ song, onClose, variant }) => {
  const { isSignedIn } = useAuth();
  const { likedSongs, likeSong, unlikeSong, deleteSong } = useMusicStore();
  const { isAdmin } = useAuthStore();

  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
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

  // Add to Queue
  const addToQueue = useCallback(() => {
    const state = usePlayerStore.getState() as any;
    const { displayQueue, currentIndex, reorderQueue } = state;

    if (Array.isArray(displayQueue) && typeof reorderQueue === "function") {
      const upcoming = displayQueue.slice(Math.max(0, currentIndex + 1));
      const nextSongs = upcoming.slice(0, 1);
      const remaining = upcoming.slice(1);

      const upcomingNew = [...nextSongs, song, ...remaining].filter(
        (s: any, idx: number, arr: any[]) => arr.findIndex((x: any) => x._id === s._id) === idx
      );

      reorderQueue(upcomingNew);

      toast.custom(
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/10"
        >
          <ListStart className="h-4 w-4 text-violet-400" />
          <span className="text-sm">Added to queue</span>
        </motion.div>,
        { duration: 1500 }
      );
    }
    onClose();
  }, [song, onClose]);

  // Toggle Like
  const toggleLike = async () => {
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
    onClose();
  };

  const handleDownload = async () => {
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
    }
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSong(song._id);
      setDeleteDialogOpen(false);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const openDialog = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(true);
  };

  // Styles based on variant
  const buttonClass =
    variant === "mobile-sheet"
      ? "w-full text-left px-4 py-3.5 rounded-xl hover:bg-white/5 active:bg-white/10 flex items-center gap-3 text-[15px] text-zinc-200 transition-colors"
      : "w-full text-left px-4 py-2.5 rounded-lg hover:bg-white/5 flex items-center gap-2 text-[13px] text-zinc-200 transition-colors";

  const iconClass = variant === "mobile-sheet" ? "h-5 w-5" : "h-4 w-4";

  return (
    <>
      <div className="flex flex-col">

        <button className={buttonClass} onClick={addToQueue}>
          <ListEnd className={`${iconClass} text-violet-400`} />
          <span>Add to queue</span>
        </button>

        <button className={buttonClass} onClick={toggleLike}>
          <Heart
            className={`${iconClass} ${
              isLiked ? "fill-violet-500 text-violet-500" : "text-violet-400"
            }`}
          />
          <span>{isLiked ? "Unlike" : "Like"}</span>
        </button>

        {isSignedIn && (
          <button className={buttonClass} onClick={() => openDialog(setAddToPlaylistOpen)}>
            <ListPlus className={`${iconClass} text-violet-400`} />
            <span>Add to Playlist</span>
          </button>
        )}

        <button className={buttonClass} onClick={handleDownload}>
          {downloadState === "downloading" ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Download className={`${iconClass} text-violet-400`} />
            </motion.div>
          ) : downloadState === "completed" ? (
            <Check className={`${iconClass} text-violet-300`} />
          ) : (
            <Download className={`${iconClass} text-violet-400`} />
          )}
          <span>
            {downloadState === "completed"
              ? "Remove Download"
              : downloadState === "downloading"
              ? "Downloading..."
              : "Download"}
          </span>
        </button>

        {/* Admin Options */}
        {isAdmin && (
          <>
            <div className="border-t border-white/10 my-2" />

            <button className={buttonClass} onClick={() => openDialog(setEditDialogOpen)}>
              <Pencil className={`${iconClass} text-violet-400`} />
              <span>Edit Song</span>
            </button>

            <button className={buttonClass} onClick={() => openDialog(setMoveDialogOpen)}>
              <FolderOpen className={`${iconClass} text-violet-400`} />
              <span>Move to Album</span>
            </button>

            <button
              className={`${buttonClass} text-red-400 hover:bg-red-900/10`}
              onClick={() => openDialog(setDeleteDialogOpen)}
            >
              <Trash2 className={`${iconClass} text-red-400`} />
              <span className="text-red-400">Delete Song</span>
            </button>
          </>
        )}
      </div>

      {/* Dialogs */}
      {isSignedIn && (
        <AddToPlaylistDialog
          isOpen={addToPlaylistOpen}
          onClose={() => {
            setAddToPlaylistOpen(false);
          }}
          song={song}
        />
      )}

      {isAdmin && (
        <>
          <MoveToAlbumDialog
            isOpen={moveDialogOpen}
            onClose={() => setMoveDialogOpen(false)}
            song={song}
          />
          <EditSongDialog
            isOpen={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            song={song}
          />
          <DeleteConfirmDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            onConfirm={handleDelete}
            songTitle={song.title}
            isLoading={isDeleting}
          />
        </>
      )}
    </>
  );
};

export default React.memo(PlaybackControlsSongOptions);