// src/pages/downloads/DownloadsPage.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useDownloads } from "@/hooks/useDownloads";
import { Button } from "@/components/ui/button";
import { 
  Download,   
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
import BottomSheet from "@/components/ui/BottomSheet";

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
// MAIN DOWNLOADS PAGE
// ============================================================================
const DownloadsPage = () => {
  const [offlineSongs, setOfflineSongs] = useState<any[]>([]);
  // const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  // const [isClearing, setIsClearing] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  const { listDownloads, removeDownload } = useDownloads();
  const { initializeQueue, currentSong, isPlaying, togglePlay } = usePlayerStore();
  const { likedSongs, likeSong, unlikeSong } = useMusicStore();
  const { isSignedIn } = useAuth();
  const { setContainerRef } = useContentWidth();

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

  const handlePlayPause = (song: any, idx: number) => {
    // Ensure we pass the offline songs which now contain the local blob URLs
    if (currentSong?._id === song._id) {
      togglePlay();
    } else {
      // Pass the whole list so the queue works offline
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
        />
        
        <div className="px-2 sm:px-6">
          {/* Header - Desktop */}
          <div className="hidden lg:flex sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 py-2 pb-4 sm:px-6 bg-gradient-to-b from-zinc-900/90 to-transparent backdrop-blur-sm items-center justify-between">
            <h1 className="text-2xl text-white/90 font-bold">Downloads</h1>
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
        <BottomSheet
          isOpen={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          snapPoints={[0.38]}
          header={
            selectedSong && (
              <div className="flex items-center gap-3 px-4 pb-4 border-b border-zinc-800">
                <img
                  src={selectedSong?.imageUrl}
                  alt={selectedSong?.title}
                  className="w-12 h-12 rounded-lg object-cover ring-1 ring-white/10"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {selectedSong?.title}
                  </p>
                  <p className="text-sm text-zinc-400 truncate">
                    {selectedSong?.artist}
                  </p>
                </div>
                <div className="px-2 py-1 bg-violet-500/20 rounded-full">
                  <span className="text-xs text-violet-300">Offline</span>
                </div>
              </div>
            )
          }
        >
          <div className="p-4 space-y-1">
            <button
              onClick={() => {
                selectedSong && addPlayNext(selectedSong);
                setOptionsOpen(false);
              }}
              className="w-full text-left px-2 py-3.5 rounded-xl 
                active:bg-white/10 flex items-center gap-3 
                text-[15px] text-zinc-200 transition-colors"
            >
              <ListStart className="h-5 w-5 text-zinc-400" />
              <span>Play next</span>
            </button>

            <button
              onClick={() => {
                selectedSong && addToQueue(selectedSong);
                setOptionsOpen(false);
              }}
              className="w-full text-left px-2 py-3.5 rounded-xl 
                active:bg-white/10 flex items-center gap-3 
                text-[15px] text-zinc-200 transition-colors"
            >
              <ListEnd className="h-5 w-5 text-zinc-400" />
              <span>Add to queue</span>
            </button>

            <button
              onClick={() => {
                selectedSong && toggleLike(selectedSong);
                setOptionsOpen(false);
              }}
              className="w-full text-left px-2 py-3.5 rounded-xl 
                active:bg-white/10 flex items-center gap-3 
                text-[15px] text-zinc-200 transition-colors"
            >
              <Heart
                className={cn(
                  "h-5 w-5",
                  selectedSong && isLiked(selectedSong._id)
                    ? "fill-violet-500 text-violet-500"
                    : "text-zinc-400"
                )}
              />
              <span>
                {selectedSong && isLiked(selectedSong._id)
                  ? "Unlike"
                  : "Like"}
              </span>
            </button>

            <div className="border-t border-zinc-800 my-2" />

            <button
              onClick={() => {
                selectedSong && handleDelete(selectedSong._id);
                setOptionsOpen(false);
              }}
              className="w-full text-left px-2 py-3.5 rounded-xl 
                active:bg-white/10 flex items-center gap-3 
                text-[15px] text-red-400 transition-colors"
            >
              <Trash2 className="h-5 w-5 text-red-400" />
              <span>Remove Download</span>
            </button>
          </div>
        </BottomSheet>
      ) : (
        <DownloadOptionsMenu
          isOpen={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          position={menuPosition}
          onPlayNext={() => selectedSong && addPlayNext(selectedSong)}
          onAddToQueue={() => selectedSong && addToQueue(selectedSong)}
          onToggleLike={() => selectedSong && toggleLike(selectedSong)}
          onRemoveDownload={() =>
            selectedSong && handleDelete(selectedSong._id)
          }
          isLiked={selectedSong ? isLiked(selectedSong._id) : false}
        />
      )}
    </main>
  );
};

export default DownloadsPage;