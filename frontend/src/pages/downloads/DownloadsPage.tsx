// src/pages/downloads/DownloadsPage.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useDownloads } from "@/hooks/useDownloads";
import { useStorageInfo } from "@/hooks/useStorageInfo";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { Button } from "@/components/ui/button";
import { 
  Download,   
  HardDrive, 
  RefreshCw, 
  Sparkles,
  CheckCircle2,
  Trash2,
  MoreVertical,
  MoreHorizontal,
  Heart,
  ListStart,
  ListEnd,
  Music,
} from "lucide-react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useMusicStore } from "@/stores/useMusicStore";
import { useAuth } from "@clerk/clerk-react";
import Topbar from "@/components/Topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import MobileSubHeader from "@/components/MobileSubHeader";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";

// ============================================================================
// RESPONSIVE CONTENT WIDTH HOOK
// ============================================================================
const useContentWidth = () => {
  const [cardLayout, setCardLayout] = useState<'stacked' | 'side-by-side'>('side-by-side');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        // If content area is less than 600px, stack the cards
        if (width < 600) {
          setCardLayout('stacked');
        } else {
          setCardLayout('side-by-side');
        }
      }
    };

    checkWidth();

    observerRef.current = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width < 600) {
            setCardLayout('stacked');
          } else {
            setCardLayout('side-by-side');
          }
        }
      });
    });

    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
    }

    window.addEventListener('resize', checkWidth);

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener('resize', checkWidth);
    };
  }, []);

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current && containerRef.current) {
      observerRef.current.unobserve(containerRef.current);
    }
    
    containerRef.current = node;
    
    if (observerRef.current && node) {
      observerRef.current.observe(node);
    }
  }, []);

  return { cardLayout, setContainerRef };
};

// ============================================================================
// CLEAR ALL CONFIRMATION DIALOG
// ============================================================================
// const ClearAllDialog = ({
//   isOpen,
//   onClose,
//   onConfirm,
//   songCount,
//   isLoading,
// }: {
//   isOpen: boolean;
//   onClose: () => void;
//   onConfirm: () => void;
//   songCount: number;
//   isLoading: boolean;
// }) => (
//   <AnimatePresence>
//     {isOpen && createPortal(
//       <>
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           exit={{ opacity: 0 }}
//           className="fixed inset-0 bg-black/60 z-[99999]"
//           onClick={onClose}
//         />
//         <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 pointer-events-none">
//           <motion.div
//             initial={{ opacity: 0, scale: 0.95, y: 20 }}
//             animate={{ opacity: 1, scale: 1, y: 0 }}
//             exit={{ opacity: 0, scale: 0.95, y: 20 }}
//             transition={{ type: "spring", duration: 0.3 }}
//             className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-sm overflow-hidden pointer-events-auto"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="p-6">
//               <div className="flex items-center gap-3 mb-3">
//                 <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
//                   <Trash2 className="w-5 h-5 text-red-500" />
//                 </div>
//                 <h3 className="text-lg font-semibold text-white">Clear All Downloads</h3>
//               </div>
//               <p className="text-zinc-400 text-sm leading-relaxed">
//                 Are you sure you want to remove all{" "}
//                 <span className="text-white font-medium">{songCount} downloaded songs</span>?
//                 This will free up storage space but songs won't be available offline.
//               </p>
//             </div>
//             <div className="flex gap-3 p-4 pt-0">
//               <button
//                 onClick={onClose}
//                 disabled={isLoading}
//                 className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors disabled:opacity-50"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={onConfirm}
//                 disabled={isLoading}
//                 className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
//               >
//                 {isLoading ? "Clearing..." : "Clear All"}
//               </button>
//             </div>
//           </motion.div>
//         </div>
//       </>,
//       document.body
//     )}
//   </AnimatePresence>
// );

// ============================================================================
// DOWNLOAD SONG OPTIONS BOTTOM SHEET (Mobile)
// ============================================================================
const DownloadOptionsSheet = ({
  isOpen,
  onClose,
  song,
  onPlayNext,
  onAddToQueue,
  onToggleLike,
  onRemoveDownload,
  isLiked,
}: {
  isOpen: boolean;
  onClose: () => void;
  song: any;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onToggleLike: () => void;
  onRemoveDownload: () => void;
  isLiked: boolean;
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
            onClick={onClose}
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
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>
            <div className="flex items-center gap-3 px-4 pb-4 border-b border-zinc-800">
              <img
                src={song?.imageUrl}
                alt={song?.title}
                className="w-12 h-12 rounded-lg object-cover ring-1 ring-white/10"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{song?.title}</p>
                <p className="text-sm text-zinc-400 truncate">{song?.artist}</p>
              </div>
              <div className="px-2 py-1 bg-violet-500/20 rounded-full">
                <span className="text-xs text-violet-300">Offline</span>
              </div>
            </div>
            <div className="p-4 pb-8 space-y-1">
              <button
                onClick={() => { onPlayNext(); onClose(); }}
                className="w-full text-left px-2 py-3.5 rounded-xl active:bg-white/10 flex items-center gap-3 text-[15px] text-zinc-200 transition-colors"
              >
                <ListStart className="h-5 w-5 text-zinc-400" />
                <span>Play next</span>
              </button>

              <button
                onClick={() => { onAddToQueue(); onClose(); }}
                className="w-full text-left px-2 py-3.5 rounded-xl active:bg-white/10 flex items-center gap-3 text-[15px] text-zinc-200 transition-colors"
              >
                <ListEnd className="h-5 w-5 text-zinc-400" />
                <span>Add to queue</span>
              </button>

              <button
                onClick={() => { onToggleLike(); onClose(); }}
                className="w-full text-left px-2 py-3.5 rounded-xl active:bg-white/10 flex items-center gap-3 text-[15px] text-zinc-200 transition-colors"
              >
                <Heart className={cn("h-5 w-5", isLiked ? "fill-violet-500 text-violet-500" : "text-zinc-400")} />
                <span>{isLiked ? "Unlike" : "Like"}</span>
              </button>

              <div className="border-t border-zinc-800 my-2" />

              <button
                onClick={() => { onRemoveDownload(); onClose(); }}
                className="w-full text-left px-2 py-3.5 rounded-xl active:bg-white/10 flex items-center gap-3 text-[15px] text-red-400 transition-colors"
              >
                <Trash2 className="h-5 w-5 text-red-400" />
                <span>Remove Download</span>
              </button>
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ============================================================================
// DOWNLOAD SONG OPTIONS CONTEXT MENU (Desktop)
// ============================================================================
const DownloadOptionsMenu = ({
  isOpen,
  onClose,
  position,
  onPlayNext,
  onAddToQueue,
  onToggleLike,
  onRemoveDownload,
  isLiked,
}: {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onToggleLike: () => void;
  onRemoveDownload: () => void;
  isLiked: boolean;
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        if (menuRef.current) {
          const rect = menuRef.current.getBoundingClientRect();
          const menuWidth = rect.width || 192;
          const menuHeight = rect.height || 200;
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
            onClick={onClose}
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
            <button
              onClick={() => { onPlayNext(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-sm text-zinc-200 transition-colors"
            >
              <ListStart className="h-4 w-4 text-zinc-400" />
              <span>Play next</span>
            </button>

            <button
              onClick={() => { onAddToQueue(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-sm text-zinc-200 transition-colors"
            >
              <ListEnd className="h-4 w-4 text-zinc-400" />
              <span>Add to queue</span>
            </button>

            <button
              onClick={() => { onToggleLike(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-sm text-zinc-200 transition-colors"
            >
              <Heart className={cn("h-4 w-4", isLiked ? "fill-violet-500 text-violet-500" : "text-zinc-400")} />
              <span>{isLiked ? "Unlike" : "Like"}</span>
            </button>

            <div className="border-t border-white/10 my-1" />

            <button
              onClick={() => { onRemoveDownload(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2.5 text-sm text-red-400 transition-colors"
            >
              <Trash2 className="h-4 w-4 text-red-400" />
              <span>Remove Download</span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ============================================================================
// UPDATE CARD COMPONENT
// ============================================================================
const UpdateCard = ({
  updateAvailable,
  isChecking,
  isUpdating,
  updateApplied,
  currentVersion,
  newVersion,
  checkForUpdate,
  applyUpdate,
  isStacked,
}: {
  updateAvailable: boolean;
  isChecking: boolean;
  isUpdating: boolean;
  updateApplied: boolean;
  currentVersion: string | null;
  newVersion: string | null;
  checkForUpdate: () => void;
  applyUpdate: () => void;
  isStacked: boolean;
}) => (
  <div className={cn(
    "rounded-xl border transition-all duration-300",
    isStacked ? "p-4" : "p-5",
    updateApplied
      ? "bg-gradient-to-br from-emerald-600/15 to-green-600/10 border-emerald-500/30"
      : updateAvailable 
        ? "bg-gradient-to-br from-violet-600/15 to-purple-600/10 border-violet-500/30" 
        : "bg-zinc-800/40 border-zinc-700/50 hover:border-zinc-600/50"
  )}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "rounded-xl flex items-center justify-center shrink-0",
          isStacked ? "w-10 h-10" : "w-11 h-11",
          updateApplied ? "bg-emerald-500/20"
            : updateAvailable ? "bg-violet-500/20" : "bg-zinc-700/50"
        )}>
          {updateApplied ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : updateAvailable ? (
            <Sparkles className="w-5 h-5 text-violet-400" />
          ) : (
            <RefreshCw className="w-5 h-5 text-white/80" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white/90">
            {updateApplied ? 'Update Installed' 
              : updateAvailable ? 'Update Available' : 'App Version'}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5 truncate">
            {updateApplied 
              ? `v${newVersion || currentVersion} installed`
              : currentVersion ? `Currently v${currentVersion}` : 'Vibra Music'}
          </p>
        </div>
      </div>
      {!updateAvailable && !updateApplied && !isChecking && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 rounded-full shrink-0">
          <CheckCircle2 className="w-3 h-3 text-violet-400" />
          <span className="text-xs text-violet-400">Up to date</span>
        </div>
      )}
    </div>

    {updateApplied ? (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm text-emerald-200">
            Close & reopen the app to use v{newVersion || currentVersion}
          </span>
        </div>
      </div>
    ) : updateAvailable ? (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
          <span className="text-sm text-violet-200">Version {newVersion} is ready</span>
        </div>
        <button
          onClick={applyUpdate}
          disabled={isUpdating}
          className="w-full h-10 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Installing...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Install Update
            </>
          )}
        </button>
      </div>
    ) : (
      <button
        onClick={checkForUpdate}
        disabled={isChecking}
        className={cn(
          "w-full h-10 flex items-center justify-center gap-2 border border-zinc-700 bg-zinc-700/40 hover:bg-zinc-700/60 text-zinc-300 hover:text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50",
          isStacked ? "mt-4" : "mt-7"
        )}
      >
        {isChecking ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Checking...
          </>
        ) : (
          "Check for Updates"
        )}
      </button>
    )}
  </div>
);

// ============================================================================
// STORAGE CARD COMPONENT
// ============================================================================
const StorageCard = ({
  storage,
  formatBytes,
  offlineSongsCount,
  isStacked,
}: {
  storage: any;
  formatBytes: (bytes: number) => string;
  offlineSongsCount: number;
  isStacked: boolean;
}) => (
  <div className={cn(
    "rounded-xl bg-zinc-800/40 border border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-300",
    isStacked ? "p-4" : "p-5"
  )}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "rounded-xl bg-zinc-700/50 flex items-center justify-center shrink-0",
          isStacked ? "w-10 h-10" : "w-11 h-11"
        )}>
          <HardDrive className="w-5 h-5 text-white/80" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white/90">Storage</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {offlineSongsCount} {offlineSongsCount === 1 ? 'song' : 'songs'} saved
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-semibold text-white/90">{Math.round(storage.percentage)}%</p>
        <p className="text-xs text-zinc-500">used</p>
      </div>
    </div>

    <div className="mb-4">
      <div className="w-full bg-zinc-700/40 rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            storage.percentage > 90 ? "bg-gradient-to-r from-red-500 to-red-400" :
            storage.percentage > 70 ? "bg-gradient-to-r from-amber-500 to-yellow-400" :
            "bg-gradient-to-r from-violet-600 to-violet-400"
          )}
          style={{ width: `${Math.min(storage.percentage, 100)}%` }}
        />
      </div>
    </div>

    <div className="flex justify-around text-center">
      <div>
        <p className="text-sm font-medium text-white/90">{formatBytes(storage.used)}</p>
        <p className="text-xs text-zinc-500">Used</p>
      </div>
      <div className="w-px bg-zinc-700" />
      <div>
        <p className="text-sm font-medium text-white/90">{formatBytes(storage.available)}</p>
        <p className="text-xs text-zinc-500">Free</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN DOWNLOADS PAGE
// ============================================================================
const DownloadsPage = () => {
  const [offlineSongs, setOfflineSongs] = useState<any[]>([]);
  const [activeCard, setActiveCard] = useState(0);
  // const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  // const [isClearing, setIsClearing] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { listDownloads, removeDownload } = useDownloads();
  const { storage, formatBytes } = useStorageInfo();
  const { initializeQueue, currentSong, isPlaying, togglePlay } = usePlayerStore();
  const { likedSongs, likeSong, unlikeSong } = useMusicStore();
  const { isSignedIn } = useAuth();
  const { cardLayout, setContainerRef } = useContentWidth();
  
  const {
    updateAvailable,
    isChecking,
    isUpdating,
    updateApplied,
    currentVersion,
    newVersion,
    checkForUpdate,
    applyUpdate,
  } = useAppUpdate(true);

  // Detect if mobile/touch device
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768;
    setIsMobile(isTouch || isSmallScreen);
  }, []);

  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        const downloads = await listDownloads();
        setOfflineSongs(downloads);
      } catch (error) {
        console.error("Failed to fetch downloads:", error);
        setOfflineSongs([]);
      }
    };
    fetchDownloads();
  }, [listDownloads]);

  // Handle scroll for dot indicator (mobile)
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.firstElementChild?.clientWidth || 0;
      const gap = 12;
      const newActive = Math.round(scrollLeft / (cardWidth + gap));
      setActiveCard(Math.min(newActive, 1));
    }
  };

  const scrollToCard = (idx: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.firstElementChild?.clientWidth || 0;
      const gap = 12;
      container.scrollTo({
        left: idx * (cardWidth + gap),
        behavior: 'smooth'
      });
    }
  };

  const handlePlayPause = (song: any, idx: number) => {
    if (currentSong?._id === song._id) {
      togglePlay();
    } else {
      initializeQueue(offlineSongs, idx, true);
    }
  };

  const handleDelete = async (songId: string) => {
    try {
      await removeDownload(songId);
      setOfflineSongs((prev) => prev.filter((s) => s._id !== songId));
      if (currentSong?._id === songId) {
        usePlayerStore.getState().reset();
      }
      toast.custom(
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/10"
        >
          <Trash2 className="h-4 w-4 text-red-400" />
          <span className="text-sm">Removed from downloads</span>
        </motion.div>,
        { duration: 1500 }
      );
    } catch (error) {
      console.error("Failed to delete download:", error);
    }
  };

  // const handleClearAll = async () => {
  //   setIsClearing(true);
  //   try {
  //     for (const song of offlineSongs) {
  //       await removeDownload(song._id);
  //     }
  //     setOfflineSongs([]);
  //     usePlayerStore.getState().reset();
  //     setClearAllDialogOpen(false);
  //     toast.custom(
  //       <motion.div
  //         initial={{ y: 30, opacity: 0 }}
  //         animate={{ y: 0, opacity: 1 }}
  //         className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/10"
  //       >
  //         <CheckCircle2 className="h-4 w-4 text-violet-400" />
  //         <span className="text-sm">All downloads cleared</span>
  //       </motion.div>,
  //       { duration: 1500 }
  //     );
  //   } catch (error) {
  //     console.error("Failed to clear downloads:", error);
  //     toast.error("Failed to clear downloads");
  //   } finally {
  //     setIsClearing(false);
  //   }
  // };

  const openOptionsMenu = (song: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSong(song);
    if (!isMobile) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setMenuPosition({
        x: rect.right - 192,
        y: rect.bottom + 8,
      });
    }
    setOptionsOpen(true);
  };

  // Queue actions
  const addPlayNext = useCallback((song: any) => {
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
  }, []);

    const isTouch = useIsTouchDevice();

  const addToQueue = useCallback((song: any) => {
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
          <ListEnd className="h-4 w-4 text-violet-400" />
          <span className="text-sm">Added to queue</span>
        </motion.div>,
        { duration: 1500 }
      );
    }
  }, []);

  const toggleLike = async (song: any) => {
    if (!isSignedIn) {
      toast.custom(
        <div className="bg-red-800/95 text-white px-4 py-2 rounded-full shadow-lg border border-red-400/30">
          <span className="text-sm">Please sign in to Like Songs</span>
        </div>,
        { duration: 1500 }
      );
      return;
    }
    
    const liked = likedSongs.some((s: any) => s._id === song._id);
    try {
      if (liked) {
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
  };

  const isLiked = (songId: string) => likedSongs.some((s: any) => s._id === songId);

  const isStacked = cardLayout === 'stacked';

  return (
    <main 
      ref={setContainerRef}
      className="rounded-lg overflow-hidden h-full bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-900"
    >
      <Topbar />
      <ScrollArea className="h-[calc(100vh-60px)] lg:h-[calc(100vh-180px)]">
        <MobileSubHeader 
          title="Downloads" 
          className="lg:hidden ml-1 mb-1"
          // rightSlot={
          //   offlineSongs.length > 0 && (
          //     <Button
          //       variant="ghost"
          //       size="sm"
          //       // onClick={() => setClearAllDialogOpen(true)}
          //       className="text-xs text-zinc-400 hover:text-red-400 hover:bg-red-400/10 px-2"
          //     >
          //       Clear All
          //     </Button>
          //   )
          // }
        />
        
        <div className="px-2 sm:px-6">
          {/* Header - Desktop */}
          <div className="hidden lg:flex sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 py-2 pb-4 sm:px-6 bg-gradient-to-b from-zinc-900/90 to-transparent backdrop-blur-sm items-center justify-between">
            <h1 className="text-2xl text-white/90 font-bold">Downloads</h1>
            {/* {offlineSongs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                // onClick={() => setClearAllDialogOpen(true)}
                className="text-sm text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )} */}
          </div>

          {/* ========== MOBILE: Swipeable Cards (< 640px) ========== */}
          <div className="sm:hidden mb-5">
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
                            {/* Card 1: App Update */}
                            <div 
                className={cn(
                  "flex-shrink-0 snap-start rounded-2xl p-3 border backdrop-blur-sm",
                  updateApplied
                    ? "bg-gradient-to-br from-emerald-600/20 via-emerald-500/10 to-green-600/20 border-emerald-500/30"
                    : updateAvailable 
                      ? "bg-gradient-to-br from-violet-600/20 via-violet-500/10 to-purple-600/20 border-violet-500/30" 
                      : "bg-zinc-800/40 border-zinc-700/50"
                )}
                style={{ width: 'calc(100% - 37px)', minWidth: 'calc(100% - 37px)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    updateApplied ? "bg-emerald-500/20"
                      : updateAvailable ? "bg-violet-500/20" : "bg-zinc-700/60"
                  )}>
                    {updateApplied ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : updateAvailable ? (
                      <Sparkles className="w-5 h-5 text-violet-400" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-white/80" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white/90">
                      {updateApplied ? 'Update Installed' 
                        : updateAvailable ? 'Update Ready' : 'App Version'}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 truncate">
                      {updateApplied 
                        ? `v${newVersion || currentVersion}`
                        : currentVersion ? `v${currentVersion}` : 'Vibra Music'}
                    </p>
                  </div>
                  {!updateAvailable && !updateApplied && !isChecking && (
                    <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0" />
                  )}
                </div>

                {updateApplied ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-sm text-emerald-200">
                      Close & reopen app to apply
                    </span>
                  </div>
                ) : updateAvailable ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
                      <span className="text-sm text-violet-200">v{newVersion} available</span>
                    </div>
                    <button
                      onClick={applyUpdate}
                      disabled={isUpdating}
                      className="w-full h-9 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white/90 rounded-3xl font-medium text-sm transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Installing...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Install Update
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={checkForUpdate}
                    disabled={isChecking}
                    className="w-full h-9 mt-8 px-1 flex items-center justify-center gap-2 border border-zinc-600/50 bg-zinc-700/40 hover:bg-zinc-700 active:bg-zinc-600 text-white/90 rounded-3xl font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {isChecking ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Check for Updates"
                    )}
                  </button>
                )}
              </div>

              {/* Card 2: Storage */}
              {storage && (
                <div 
                  className="flex-shrink-0 snap-start rounded-2xl p-3 bg-zinc-800/40 border border-zinc-700/50 backdrop-blur-sm"
                  style={{ width: 'calc(100% - 37px)', minWidth: 'calc(100% - 37px)' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-700/60 flex items-center justify-center shrink-0">
                      <HardDrive className="w-5 h-5 text-white/80" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white/90">Storage</h3>
                      <p className="text-xs text-zinc-400">
                        {offlineSongs.length} {offlineSongs.length === 1 ? 'song' : 'songs'} offline
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-white/90">{Math.round(storage.percentage)}%</p>
                      <p className="text-xs text-zinc-500">used</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="w-full bg-zinc-700/50 rounded-full h-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          storage.percentage > 90 ? "bg-gradient-to-r from-red-500 to-red-400" :
                          storage.percentage > 70 ? "bg-gradient-to-r from-amber-500 to-yellow-400" :
                          "bg-gradient-to-r from-violet-600 to-violet-400"
                        )}
                        style={{ width: `${Math.min(storage.percentage, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-around items-center px-2">
                      <div className="text-center">
                        <p className="text-base font-semibold text-white/90">{formatBytes(storage.used)}</p>
                        <p className="text-xs text-zinc-500">Used</p>
                      </div>
                      <div className="h-8 w-px bg-zinc-700" />
                      <div className="text-center">
                        <p className="text-base font-semibold text-white/90">{formatBytes(storage.available)}</p>
                        <p className="text-xs text-zinc-500">Free</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dot Indicators */}
            <div className="flex justify-center gap-2 mt-2">
              {[0, 1].map((idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToCard(idx)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    activeCard === idx 
                      ? "bg-white/50 w-6" 
                      : "bg-zinc-600 w-2 hover:bg-zinc-500"
                  )}
                  aria-label={`Go to card ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* ========== DESKTOP: Responsive Cards (>= 640px) ========== */}
          <div className={cn(
            "hidden sm:grid gap-3 mb-6 transition-all duration-300",
            isStacked ? "grid-cols-1" : "grid-cols-2"
          )}>
          <UpdateCard
            updateAvailable={updateAvailable}
            isChecking={isChecking}
            isUpdating={isUpdating}
            updateApplied={updateApplied}
            currentVersion={currentVersion}
            newVersion={newVersion}
            checkForUpdate={checkForUpdate}
            applyUpdate={applyUpdate}
            isStacked={isStacked}
          />
            
            {storage && (
              <StorageCard
                storage={storage}
                formatBytes={formatBytes}
                offlineSongsCount={offlineSongs.length}
                isStacked={isStacked}
              />
            )}
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-between mb-3 mt-6">
            <h2 className="text-sm font-semibold text-white/80 tracking-wide">
              Downloaded Songs
            </h2>
            <span className="text-xs text-zinc-400/80">
              {offlineSongs.length} saved
            </span>
          </div>

          {/* ========== Downloads List ========== */}
          <div className="mt-2">
            {offlineSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-zinc-400 py-16">
                <div className="relative bg-zinc-800/50 rounded-full mb-4 p-5">
                  <Music className="size-10 text-zinc-500" />
                </div>
                <h3 className="text-lg font-medium mb-1 text-zinc-300">
                  No downloads yet
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed text-center max-w-xs">
                  Songs you download will be available offline here
                </p>             
              </div>
            ) : (
              <div className="space-y-0.5 pb-4">
                {offlineSongs.map((song, idx) => {
                  const isCurrent = currentSong?._id === song._id;
                  const isCurrentPlaying = isCurrent && isPlaying;
                  
                  return (
                    <div
                      key={song._id}
                      onClick={() => handlePlayPause(song, idx)}
                      className={cn(
                        "group cursor-pointer rounded-xl",
                        "grid grid-cols-[1fr_36px] gap-2 px-2 py-2.5",
                        "transition-all duration-200 ease-out",
                        "hover:bg-white/5 active:bg-white/10",
                        isCurrent && "bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={song.imageUrl || "/placeholder.svg"}
                            alt={song.title}
                            className="size-12 rounded-lg object-cover transition-transform duration-200"
                          />
                          {isCurrentPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                              <span className="text-violet-400 text-sm animate-pulse">♫</span>
                            </div>
                          )}
                          {/* Offline badge */}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center border-2 border-zinc-900">
                            <Download className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-medium text-sm line-clamp-1 transition-colors duration-200",
                            isCurrent ? "text-violet-400" : "text-white"
                          )}>
                            {song.title}
                          </p>
                          <p className="text-xs text-zinc-400 line-clamp-1">
                            {song.artist}
                          </p>
                        </div>
                      </div>
                      
                      <div
                        className="flex items-center justify-end"
                        onClick={(e) => openOptionsMenu(song, e)}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-white/10"
                        >
                        {!isTouch ? (
                          <MoreHorizontal className="h-5 w-5 text-zinc-400" />
                        ) : (
                          <MoreVertical className="h-5 w-5 text-zinc-400" />
                        )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <MobileOverlaySpacer />
        </div>
      </ScrollArea>

      {/* Options Menu/Sheet */}
      {isMobile ? (
        <DownloadOptionsSheet
          isOpen={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          song={selectedSong}
          onPlayNext={() => selectedSong && addPlayNext(selectedSong)}
          onAddToQueue={() => selectedSong && addToQueue(selectedSong)}
          onToggleLike={() => selectedSong && toggleLike(selectedSong)}
          onRemoveDownload={() => selectedSong && handleDelete(selectedSong._id)}
          isLiked={selectedSong ? isLiked(selectedSong._id) : false}
        />
      ) : (
        <DownloadOptionsMenu
          isOpen={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          position={menuPosition}
          onPlayNext={() => selectedSong && addPlayNext(selectedSong)}
          onAddToQueue={() => selectedSong && addToQueue(selectedSong)}
          onToggleLike={() => selectedSong && toggleLike(selectedSong)}
          onRemoveDownload={() => selectedSong && handleDelete(selectedSong._id)}
          isLiked={selectedSong ? isLiked(selectedSong._id) : false}
        />
      )}

      {/* Clear All Dialog */}
      {/* <ClearAllDialog
        isOpen={clearAllDialogOpen}
        onClose={() => setClearAllDialogOpen(false)}
        onConfirm={handleClearAll}
        songCount={offlineSongs.length}
        isLoading={isClearing}
      /> */}
    </main>
  );
};

export default DownloadsPage;