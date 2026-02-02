// src/components/SongOptions.tsx
import React, { useCallback, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  MoreVertical,
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
import { createPortal } from "react-dom";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";

type Props = {
  song: any;
  forceOpen?: boolean;
  onClose?: () => void;
  inlineTrigger?: boolean;
  triggerPosition?: { x: number; y: number };
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
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-[99999]"
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

// Mobile Bottom Sheet
const MobileBottomSheet = ({
  isOpen,
  onClose,
  song,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  song: any;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handleBackdropTouch = (e: React.TouchEvent) => {
    // Don't call preventDefault - just stop propagation
    e.stopPropagation();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 z-[9998]"
            onClick={handleBackdropClick}
            onTouchStart={handleBackdropTouch}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ 
              type: "spring", 
              damping: 30, 
              stiffness: 400,
              mass: 0.8
            }}
            className="fixed bottom-0 left-0 right-0 z-[9999] bg-zinc-900 rounded-t-3xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>
            <div className="flex items-center gap-3 px-4 pb-4 border-b border-zinc-800">
              <img
                src={song.imageUrl}
                alt={song.title}
                className="w-12 h-12 rounded-lg object-cover ring-1 ring-white/10"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{song.title}</p>
                <p className="text-sm text-zinc-400 truncate">{song.artist}</p>
              </div>
            </div>
            <div className="p-4 pb-8 overflow-y-auto max-h-[60vh]">
              {children}
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

// Desktop Context Menu
const DesktopContextMenu = ({
  isOpen,
  onClose,
  position,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  children: React.ReactNode;
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        if (menuRef.current) {
          const rect = menuRef.current.getBoundingClientRect();
          const menuWidth = rect.width || 192;
          const menuHeight = rect.height || 300;
          const padding = 10;

          let x = position.x;
          let y = position.y;

          if (x + menuWidth > window.innerWidth - padding) {
            x = window.innerWidth - menuWidth - padding;
          }
          if (x < padding) x = padding;
          if (y + menuHeight > window.innerHeight - padding) {
            y = position.y - menuHeight;
            if (y < padding) y = padding;
          }

          setAdjustedPosition({ x, y });
        }
      });
    }
  }, [isOpen, position]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => onClose();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onClose();
            }}
          />
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[9999] w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-1 overflow-hidden"
            style={{
              left: adjustedPosition.x,
              top: adjustedPosition.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

// Options Content
const OptionsContent = ({
  variant,
  isLiked,
  downloadState,
  isAdmin,
  isSignedIn,
  onToggleLike,
  onDownload,
  onAddPlayNext,
  onAddToQueue,
  onOpenPlaylistDialog,
  onOpenEditDialog,
  onOpenMoveDialog,
  onOpenDeleteDialog,
}: {
  variant: "desktop" | "mobile";
  isLiked: boolean;
  downloadState: string;
  isAdmin: boolean;
  isSignedIn: boolean;
  onToggleLike: () => void;
  onDownload: () => void;
  onAddPlayNext: () => void;
  onAddToQueue: () => void;
  onOpenPlaylistDialog: () => void;
  onOpenEditDialog: () => void;
  onOpenMoveDialog: () => void;
  onOpenDeleteDialog: () => void;
}) => {
  const isMobile = variant === "mobile";

  const buttonClass = isMobile
    ? "w-full text-left px-2 py-3.5 rounded-xl active:bg-white/10 flex items-center gap-3 text-[15px] text-zinc-200 transition-colors"
    : "w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-sm text-zinc-200 transition-colors";

  const iconClass = isMobile ? "h-5 w-5" : "h-4 w-4";

  return (
    <div className="flex flex-col">
      <button className={buttonClass} onClick={onAddPlayNext}>
        <ListStart className={`${iconClass} text-zinc-400`} />
        <span>Play next</span>
      </button>

      <button className={buttonClass} onClick={onAddToQueue}>
        <ListEnd className={`${iconClass} text-zinc-400`} />
        <span>Add to queue</span>
      </button>

      <button className={buttonClass} onClick={onToggleLike}>
        <Heart
          className={`${iconClass} ${
            isLiked ? "fill-violet-500 text-violet-500" : "text-zinc-400"
          }`}
        />
        <span>{isLiked ? "Unlike" : "Like"}</span>
      </button>

      {isSignedIn && (
        <button className={buttonClass} onClick={onOpenPlaylistDialog}>
          <ListPlus className={`${iconClass} text-zinc-400`} />
          <span>Add to Playlist</span>
        </button>
      )}

      <button className={buttonClass} onClick={onDownload}>
        {downloadState === "downloading" ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Download className={`${iconClass} text-zinc-400`} />
          </motion.div>
        ) : downloadState === "completed" ? (
          <Check className={`${iconClass} text-violet-400`} />
        ) : (
          <Download className={`${iconClass} text-zinc-400`} />
        )}
        <span>
          {downloadState === "completed"
            ? "Remove Download"
            : downloadState === "downloading"
            ? "Downloading..."
            : "Download"}
        </span>
      </button>

      {isAdmin && (
        <>
          <div className="border-t border-white/10 my-1" />
          <button className={buttonClass} onClick={onOpenEditDialog}>
            <Pencil className={`${iconClass} text-zinc-400`} />
            <span>Edit Song</span>
          </button>
          <button className={buttonClass} onClick={onOpenMoveDialog}>
            <FolderOpen className={`${iconClass} text-zinc-400`} />
            <span>Add to Album</span>
          </button>
          <button
            className={`${buttonClass} !text-red-400`}
            onClick={onOpenDeleteDialog}
          >
            <Trash2 className={`${iconClass} text-red-400`} />
            <span>Delete Song</span>
          </button>
        </>
      )}
    </div>
  );
};

const SongOptions: React.FC<Props> = ({
  song,
  forceOpen = false,
  onClose,
  inlineTrigger = true,
  triggerPosition,
}) => {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const [useBottomSheet, setUseBottomSheet] = useState(false);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 1024;
    setUseBottomSheet(isTouch || isSmallScreen);
  }, []);



  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      if (triggerPosition) {
        setMenuPosition(triggerPosition);
      }
    }
  }, [forceOpen, triggerPosition]);

  // Sync open state with forceOpen
  useEffect(() => {
    if (!forceOpen && open && !inlineTrigger) {
      setOpen(false);
    }
  }, [forceOpen, open, inlineTrigger]);

  const close = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        x: rect.right - 192,
        y: rect.bottom + 8,
      });
    }
    
    setOpen(true);
  };

  // Actions
  const addPlayNext = useCallback(() => {
    const state = usePlayerStore.getState() as any;
    const { displayQueue, currentIndex, reorderQueue } = state;
    if (Array.isArray(displayQueue) && typeof reorderQueue === "function") {
      const upcoming = displayQueue.slice(currentIndex + 1).filter((s: any) => s._id !== song._id);
      reorderQueue([song, ...upcoming]);
      toast.custom(
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/10"
        >
          <ListStart className="h-4 w-4 text-violet-400" />
          <span className="text-sm">Playing next</span>
        </motion.div>,
        { duration: 1500 }
      );
    }
    close();
  }, [song, close]);

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
          <PlusSquare className="h-4 w-4 text-violet-400" />
          <span className="text-sm">Added to queue</span>
        </motion.div>,
        { duration: 1500 }
      );
    }
    close();
  }, [song, close]);

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
    close();
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
    close();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSong(song._id);
      setDeleteDialogOpen(false);
      close();
    } finally {
      setIsDeleting(false);
    }
  };

  // Open dialog and properly close menu + notify parent
  const openDialog = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setOpen(false);
    // Don't call onClose here - we'll call it when dialog closes
    setTimeout(() => setter(true), 100);
  };

  // Handle dialog close - this is where we notify parent
  const handleDialogClose = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(false);
    // Now notify parent that everything is closed
    onClose?.();
  };

  const isTouch = useIsTouchDevice();
  const sharedProps = {
    isLiked,
    downloadState,
    isAdmin,
    isSignedIn: !!isSignedIn,
    onToggleLike: toggleLike,
    onDownload: handleDownload,
    onAddPlayNext: addPlayNext,
    onAddToQueue: addToQueue,
    onOpenPlaylistDialog: () => openDialog(setAddToPlaylistOpen),
    onOpenEditDialog: () => openDialog(setEditDialogOpen),
    onOpenMoveDialog: () => openDialog(setMoveDialogOpen),
    onOpenDeleteDialog: () => openDialog(setDeleteDialogOpen),
  };

  return (
    <>
      {/* Trigger Button */}
      {inlineTrigger && (
        <Button
          ref={triggerRef}
          size="icon"
          variant="ghost"
          onClick={handleTriggerClick}
          className="rounded-full hover:bg-white/10 h-8 w-8"
          aria-label="More options"
        >
        {!isTouch ? (
          <MoreHorizontal className="h-5 w-5 text-zinc-400" />
        ) : (
          <MoreVertical className="h-5 w-5 text-zinc-400" />
        )}

        </Button>
      )}

      {/* MOBILE/BIG TOUCH SCREENS: Bottom Sheet */}
      {useBottomSheet && (
        <MobileBottomSheet isOpen={open} onClose={close} song={song}>
          <OptionsContent {...sharedProps} variant="mobile" />
        </MobileBottomSheet>
      )}

      {/* DESKTOP NON-TOUCH: Context Menu */}
      {!useBottomSheet && (
        <DesktopContextMenu
          isOpen={open}
          onClose={close}
          position={triggerPosition || menuPosition}
        >
          <OptionsContent {...sharedProps} variant="desktop" />
        </DesktopContextMenu>
      )}

      {/* Dialogs */}
      {isSignedIn && (
        <AddToPlaylistDialog
          isOpen={addToPlaylistOpen}
          onClose={() => handleDialogClose(setAddToPlaylistOpen)}
          song={song}
        />
      )}

      {isAdmin && (
        <>
          <MoveToAlbumDialog
            isOpen={moveDialogOpen}
            onClose={() => handleDialogClose(setMoveDialogOpen)}
            song={song}
          />
          <EditSongDialog
            isOpen={editDialogOpen}
            onClose={() => handleDialogClose(setEditDialogOpen)}
            song={song}
          />
          <DeleteConfirmDialog
            isOpen={deleteDialogOpen}
            onClose={() => handleDialogClose(setDeleteDialogOpen)}
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