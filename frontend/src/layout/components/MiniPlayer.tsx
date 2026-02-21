// src/layout/components/MiniPlayer.tsx
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Play, Pause, SkipBack, SkipForward, ChevronDown, 
  Shuffle, Repeat, ListMusic, MoreVertical
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useState, useEffect, useCallback, lazy, Suspense, useRef } from "react";
import LikeButton from "@/pages/home/components/LikeButton";
import { cn } from "@/lib/utils";
import PlaybackControlsSongOptions from "./PlaybackControlsSongOptions";
import { useLocation } from "react-router-dom"; 
import { useChatStore } from "@/stores/useChatStore";
import MarqueeText from "@/components/ui/MarqueeText";
import BottomSheet from "@/components/ui/BottomSheet";
import { useLyricsStore } from "@/stores/useLyricsStore";
import { MicVocal } from "lucide-react";
import LyricsContainer from "@/components/LyricsContainer";
import LyricsOptionsMenu from "@/components/LyricsOptionsMenu";
import SleepTimer from "@/components/SleepTimer";

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const LazyQueue = lazy(() => import("@/pages/home/components/Queue"));

const QueueSkeleton = () => (
  <div className="px-4 py-3 space-y-4 animate-in fade-in duration-200">
    <div>
      <div className="h-3 w-20 bg-zinc-800 rounded mb-3" />
      <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30">
        <div className="w-12 h-12 rounded-md bg-zinc-700/50" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-zinc-700/50 rounded" />
          <div className="h-3 w-24 bg-zinc-800 rounded" />
        </div>
      </div>
    </div>
    <div>
      <div className="h-3 w-16 bg-zinc-800 rounded mb-3" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="flex items-center gap-3 p-2 rounded-lg"
            style={{ opacity: 1 - i * 0.15 }}
          >
            <div className="w-11 h-11 rounded-md bg-zinc-800/60" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-28 bg-zinc-800/60 rounded" />
              <div className="h-3 w-20 bg-zinc-800/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);


// ─── Swipe-to-dismiss expanded player ───
const DISMISS_THRESHOLD = 120;

const MiniPlayer = () => {
  const location = useLocation();
  const { selectedUser } = useChatStore();

  const { 
    currentSong, isPlaying, togglePlay, playNext, playPrevious,
    currentTime, duration, setCurrentTime, toggleShuffle, toggleRepeat,
    isShuffle, isRepeat
  } = usePlayerStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [songOptionsOpen, setSongOptionsOpen] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [sleepTimerOpen, setSleepTimerOpen] = useState(false);

  // Swipe-to-dismiss state
  const dragY = useMotionValue(0);
  const expandedOpacity = useTransform(dragY, [0, DISMISS_THRESHOLD * 1.5], [1, 0.3]);
  const expandedScale = useTransform(dragY, [0, DISMISS_THRESHOLD * 2], [1, 0.92]);
  const artScale = useTransform(dragY, [0, DISMISS_THRESHOLD], [1, 0.85]);
  const isDismissing = useRef(false);

  const seekFromPointer = (
    e: React.PointerEvent<HTMLDivElement>,
    duration: number,
    setCurrentTime: (t: number) => void
  ) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
  
    const newTime = Math.max(0, Math.min(duration * percent, duration));
  
    setCurrentTime(newTime);
  
    const audio = document.querySelector("audio") as HTMLAudioElement | null;
    if (audio) audio.currentTime = newTime;
  };
  

  const handleExpandedDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > DISMISS_THRESHOLD || info.velocity.y > 800) {
      isDismissing.current = true;
      setIsExpanded(false);
      // Reset after animation
      setTimeout(() => {
        isDismissing.current = false;
        dragY.set(0);
      }, 300);
    } else {
      dragY.set(0);
    }
  }, [dragY]);

  const toggleBrowserFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsBrowserFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsBrowserFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Lock body scroll when expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  useEffect(() => {
    setSongOptionsOpen(false);
  }, [currentSong?._id]);

  const handleSeek = useCallback((value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    const audio = document.querySelector("audio") as HTMLAudioElement | null;
    if (audio) audio.currentTime = newTime;
  }, [setCurrentTime]);

  // Swipe left/right to skip on expanded player album art
  const artSwipeStartX = useRef<number | null>(null);
  const artSwipeStartY = useRef<number | null>(null);
  const isHorizontalSwipe = useRef(false);

  const handleArtTouchStart = useCallback((e: React.TouchEvent) => {
    artSwipeStartX.current = e.touches[0].clientX;
    artSwipeStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = false;
  }, []);

  const handleArtTouchMove = useCallback((e: React.TouchEvent) => {
    if (artSwipeStartX.current === null || artSwipeStartY.current === null) return;
    const dx = Math.abs(e.touches[0].clientX - artSwipeStartX.current);
    const dy = Math.abs(e.touches[0].clientY - artSwipeStartY.current);
    if (dx > 15 && dx > dy * 1.5) {
      isHorizontalSwipe.current = true;
    }
  }, []);

  const handleArtTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isHorizontalSwipe.current || artSwipeStartX.current === null) {
      artSwipeStartX.current = null;
      artSwipeStartY.current = null;
      return;
    }

    const endX = e.changedTouches[0].clientX;
    const dx = endX - artSwipeStartX.current;

    if (Math.abs(dx) > 60) {
      if (dx < 0) {
        playNext();
      } else {
        playPrevious();
      }
    }

    artSwipeStartX.current = null;
    artSwipeStartY.current = null;
    isHorizontalSwipe.current = false;
  }, [playNext, playPrevious]);

  // ADD this effect — fetches lyrics when song changes
  const {
    fetchForSong,
    hasLyrics,
    isLyricsVisible,
    setLyricsVisible,
  } = useLyricsStore();
  
  // Fetch lyrics when song changes (with duration debounce)
  useEffect(() => {
    if (!currentSong) return;
  
    // Wait for duration to be available (avoids wrong match)
    if (duration && duration > 0) {
      fetchForSong(
        currentSong._id,
        currentSong.title,
        currentSong.artist,
        duration
      );
    } else {
      // Fetch without duration after a short delay
      const timer = setTimeout(() => {
        fetchForSong(
          currentSong._id,
          currentSong.title,
          currentSong.artist
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentSong?._id, duration]);
  
  // Close lyrics when player collapses
  useEffect(() => {
    if (!isExpanded) {
      setLyricsVisible(false);
    }
  }, [isExpanded, setLyricsVisible]);

  const prefetchedMobileRef = useRef<Set<string>>(new Set());

  // Prefetch next song lyrics on mobile
  const { prefetchForSong } = useLyricsStore();
  const { queue, currentIndex } = usePlayerStore();

  useEffect(() => {
    if (!currentSong || !isExpanded || currentIndex < 0 || queue.length === 0) return;

    const timer = setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex < queue.length) {
        const nextSong = queue[nextIndex];
        if (nextSong && !prefetchedMobileRef.current.has(nextSong._id)) {
          prefetchedMobileRef.current.add(nextSong._id);
          prefetchForSong(nextSong._id, nextSong.title, nextSong.artist);
        }
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentSong?._id, isExpanded, currentIndex, queue]);

  const getPrimaryArtist = (text: string) => {
    if (!text) return "";

    // Split by common separators
    const separators = [",", "&", "feat.", "ft.", "Feat.", "Ft."];
    let primary = text;

    for (let sep of separators) {
      if (text.includes(sep)) {
        primary = text.split(sep)[0];
        break;
      }
    }

    return primary.trim();
  };

  // Hide when in active chat conversation
  const isInActiveChat = location.pathname.startsWith("/chat") && selectedUser;

  if (!currentSong || isInActiveChat) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Mini Player Bar */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 z-40 px-2 md:hidden"
            style={{ bottom: `calc(56px + env(safe-area-inset-bottom))` }}
          >
            <div
              className="relative flex items-center gap-3 h-16 cursor-pointer rounded-xl overflow-hidden shadow-2xl"
              onClick={() => setIsExpanded(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(39,39,42,0.98) 0%, rgba(24,24,27,0.98) 100%)',
              }}
            >
              {/* Background blur */}
              <div
                className="absolute inset-0 opacity-30"
                style={{ 
                  backgroundImage: `url(${currentSong.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(30px)',
                }}
              />
              <div className="relative flex items-center gap-3 px-2 mb-1 w-full">
                <img
                  src={currentSong.imageUrl}
                  alt={currentSong.title}
                  className="w-11 h-11 object-cover rounded-md shadow-lg"
                />

                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                  <MarqueeText
                    text={currentSong.title}
                    className="text-sm font-medium text-white"
                    speed={25}
                    pauseDuration={2500}
                    gap={80}
                    disabled={isExpanded}
                  />
                  <div className=" ml-1 text-xs text-white/60 whitespace-nowrap">
                    {getPrimaryArtist(currentSong.artist)}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="mt-1 mr-2" onClick={(e) => e.stopPropagation()}>
                    <LikeButton song={currentSong} />
                  </div>

                  <Button
                    size="icon"
                    className="bg-transparent text-white active:bg-white/10 rounded-full h-9 w-9 shadow-lg transition-transform"
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      playNext();
                    }}
                    className="text-white h-9 w-9 rounded-full active:bg-white/20 transition-colors duration-200"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Progress bar at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <motion.div
                  className="h-1/2 bg-white/70"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Full Screen Player */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="expanded-player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] md:hidden"
            style={{ willChange: "opacity" }}
          >

      {/* Background — dominant color: full color for lyrics, fade to black for normal */}
      <div className="absolute inset-0 bg-black">
  <div
    className="absolute inset-0 scale-110 opacity-60"
    style={{
      backgroundImage: `url(${currentSong.imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      filter: "blur(38px) saturate(1.25)",
      transform: "translateZ(0)",
    }}
  />

  {/* Soft color accents */}
  <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 via-transparent to-fuchsia-500/10" />

  {/* Subtle highlight */}
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.10),rgba(0,0,0,0.0)_40%)]" />

  {/* Depth gradients */}
  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />
  <div className="absolute inset-x-0 bottom-0 h-[45vh] bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
</div>


      {/* Swipe-to-dismiss wrapper */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={handleExpandedDragEnd}
        style={{
          y: dragY,
          opacity: expandedOpacity,
          scale: expandedScale,
          willChange: "transform, opacity",
        }}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 350,
          delay: 0.05,
        }}
        className="relative h-full flex flex-col touch-pan-x"
      >
        {/* Header — changes based on lyrics mode */}
        <div
          className="flex justify-between items-center px-4 py-3 shrink-0"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 12px)",
          }}
        >
          <Button
            size="icon"
            variant="ghost"
            className="text-white/70 active:bg-white/10 h-10 w-10"
            onClick={() => {
              if (isLyricsVisible) {
                setLyricsVisible(false);
              } else {
                setIsExpanded(false);
              }
            }}
          >
            <ChevronDown className="h-7 w-7" />
          </Button>

          {isLyricsVisible ? (
            // Lyrics mode: song info centered + options on right
            <>
              <div className="flex-1 mx-3 min-w-0">
                <p className="text-sm font-semibold text-white truncate text-center">
                  {currentSong.title}
                </p>
                <p className="text-xs text-white/50 truncate text-center">
                  {currentSong.artist}
                </p>
              </div>
              <LyricsOptionsMenu variant="mobile" />
            </>
          ) : (
            <>
              <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">
                Now Playing
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="text-white/70 hover:text-white active:bg-white/10 h-10 w-10"
                onClick={() => setSongOptionsOpen(true)}
              >
                <MoreVertical className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {isLyricsVisible ? (
            // ═══════════ LYRICS MODE ═══════════
            <motion.div
              key="lyrics-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden relative"
            >
              {/* LyricsContainer handles loading, no-lyrics, sync, options */}
              <LyricsContainer
                variant="mobile"
              />

              {/* Bottom controls — ALWAYS VISIBLE in lyrics mode */}
              <div
                  className="px-6 pb-4 pt-2 shrink-0"
                  style={{
                    paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
                  }}
                >
                {/* Slim progress bar */}
                <div
                  className="w-full touch-none"
                  onPointerDown={(e) => {
                    if (!duration) return;
                    seekFromPointer(e, duration, setCurrentTime);
                  }}
                >
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    className="w-full"
                    onValueChange={handleSeek}
                  />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-white/40 tabular-nums">
                      {formatTime(currentTime)}
                    </span>
                    <span className="text-xs text-white/40 tabular-nums">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Compact controls */}
                <div className="flex items-center justify-center gap-8">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white/70 h-10 w-10 active:scale-90 transition-transform"
                    onClick={playPrevious}
                  >
                    <SkipBack className="h-5 w-5" fill="white" fillOpacity={0.7} />
                  </Button>
                  
                  <Button
                    size="icon"
                    className="bg-white text-black rounded-full h-12 w-12 shadow-xl active:scale-95 transition-transform"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6" fill="black" />
                    ) : (
                      <Play className="h-6 w-6 ml-0.5" fill="black" />
                    )}
                  </Button>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white/70 h-10 w-10 active:scale-90 transition-transform"
                    onClick={playNext}
                  >
                    <SkipForward className="h-5 w-5" fill="white" fillOpacity={0.7} />
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            // ═══════════ NORMAL MODE (Album Art) ═══════════
            <motion.div
              key="normal-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col"
            >
              {/* Album Art */}
              <div
                className="flex-1 flex items-center justify-center px-4 py-4"
                onTouchStart={handleArtTouchStart}
                onTouchMove={handleArtTouchMove}
                onTouchEnd={handleArtTouchEnd}
              >
              <motion.div
                style={{ scale: artScale }}
                className={cn(
                  "relative aspect-square w-full",
                  "max-w-[min(88vw,85vh-290px)]",
                  "max-h-[calc(100vh-400px)]"
                )}
              >
                <img
                  src={currentSong.imageUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover rounded-lg shadow-2xl"
                />
              </motion.div>
              </div>

              {/* Song Info + Controls */}
              <div
                className="px-6 pb-6"
                style={{
                  paddingBottom:
                    "calc(env(safe-area-inset-bottom) + 24px)",
                }}
              >
                {/* Song Info */}
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`title-${currentSong._id}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                      >
                        <MarqueeText
                          text={currentSong.title}
                          className="text-xl font-medium text-white"
                          speed={25}
                          pauseDuration={2500}
                          gap={80}
                        />
                      </motion.div>
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`artist-${currentSong._id}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, delay: 0.05 }}
                        className="w-full"
                      >
                        <MarqueeText
                          text={currentSong.artist}
                          className="text-base text-white/60"
                          speed={22}
                          pauseDuration={3000}
                          gap={80}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="flex-shrink-0">
                    <LikeButton song={currentSong} />
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  className="w-full touch-none"
                  onPointerDown={(e) => {
                    if (!duration) return;
                    seekFromPointer(e, duration, setCurrentTime);
                  }}
                >
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    className="w-full"
                    onValueChange={handleSeek}
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-white/50 tabular-nums">
                      {formatTime(currentTime)}
                    </span>
                    <span className="text-xs text-white/50 tabular-nums">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-between mb-6">
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-12 w-12 transition-all active:scale-90",
                      isShuffle
                        ? "text-violet-400 scale-105"
                        : "text-white/70"
                    )}
                    onClick={toggleShuffle}
                  >
                    <Shuffle className="h-5 w-5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white h-14 w-14 active:bg-white/10 active:scale-90 transition-transform"
                    onClick={playPrevious}
                  >
                    <SkipBack className="h-7 w-7" fill="white" />
                  </Button>

                  <Button
                    size="icon"
                    className="bg-white text-black rounded-full h-16 w-16 shadow-xl active:scale-95 transition-transform"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="h-11 w-11" fill="black" />
                    ) : (
                      <Play className="h-11 w-11 ml-1" fill="black" />
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white h-14 w-14 active:bg-white/10 active:scale-90 transition-transform"
                    onClick={playNext}
                  >
                    <SkipForward className="h-7 w-7" fill="white" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-12 w-12 transition-all active:scale-90",
                      isRepeat
                        ? "text-violet-400 scale-105"
                        : "text-white/70"
                    )}
                    onClick={toggleRepeat}
                  >
                    <Repeat className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Secondary Controls */}
                <div className="flex items-center justify-center gap-5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-12 w-12 active:scale-90 transition-all",
                      hasLyrics ? "text-white/80" : "text-white/40" // softer dim, not disabled look
                    )}
                    onClick={() => setLyricsVisible(true)}
                  >

                    <MicVocal className="h-5 w-5" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white/80 h-12 w-12 active:scale-90 transition-transform"
                    onClick={() => setQueueOpen(true)}
                  >
                    <ListMusic className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <SleepTimer
          externalOpen={sleepTimerOpen}
          onExternalClose={() => setSleepTimerOpen(false)}
          hideTrigger
        />

        {/* Queue Sheet */}
        <BottomSheet
          isOpen={queueOpen}
          onClose={() => setQueueOpen(false)}
          snapPoints={[0.65]}
          zIndex={200}
        >
          <Suspense fallback={<QueueSkeleton />}>
            <LazyQueue />
          </Suspense>
        </BottomSheet>

        {/* Song Options Sheet — NOW INCLUDES SLEEP TIMER */}
        <BottomSheet
          isOpen={songOptionsOpen}
          onClose={() => setSongOptionsOpen(false)}
          snapPoints={[0.50]}
          zIndex={210}
          header={
            <div className="flex items-center gap-3 px-5 pb-4 border-b border-white/10">
              <img
                src={currentSong.imageUrl}
                alt={currentSong.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {currentSong.title}
                </p>
                <p className="text-white/50 text-sm truncate">
                  {currentSong.artist}
                </p>
              </div>
            </div>
          }
        >
          <div className="p-4">
            <PlaybackControlsSongOptions
              song={currentSong}
              onClose={() => setSongOptionsOpen(false)}
              variant="mobile-sheet"
              onToggleFullscreen={toggleBrowserFullscreen}
              isFullscreen={isBrowserFullscreen}
              onOpenSleepTimer={() => setSleepTimerOpen(true)}
            />
          </div>
        </BottomSheet>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
    </>
  );
};

export default MiniPlayer;