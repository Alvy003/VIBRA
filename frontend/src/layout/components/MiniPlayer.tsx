// src/layout/components/MiniPlayer.tsx
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Play, Pause, SkipBack, SkipForward, ChevronDown, 
  Shuffle, Repeat, ListMusic, MoreVertical
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, PanInfo } from "framer-motion";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import LikeButton from "@/pages/home/components/LikeButton";
import { cn } from "@/lib/utils";
import PlaybackControlsSongOptions from "./PlaybackControlsSongOptions";
import { useLocation } from "react-router-dom"; 
import { useChatStore } from "@/stores/useChatStore";
import SleepTimer from "@/components/SleepTimer";
import MarqueeText from "@/components/ui/MarqueeText";

// function useDeferredMount(open: boolean, delay = 50) {
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     if (!open) {
//       setMounted(false);
//       return;
//     }
//     // Small delay to let the animation start first
//     const timeout = setTimeout(() => {
//       requestAnimationFrame(() => setMounted(true));
//     }, delay);
//     return () => clearTimeout(timeout);
//   }, [open, delay]);

//   return mounted;
// }

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// Lazy load Queue component
const LazyQueue = lazy(() => import("@/pages/home/components/Queue"));

// Queue Loading Skeleton
const QueueSkeleton = () => (
  <div className="px-4 py-3 space-y-4 animate-in fade-in duration-200">
    {/* Now Playing skeleton */}
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
    
    {/* Next up skeleton */}
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

// Draggable Queue Sheet
const SNAP_POINTS = [0.65, 0.9];

const DraggableQueueSheet = ({ onClose }: { onClose: () => void }) => {
  const [currentSnap, setCurrentSnap] = useState(0.65);
  const y = useMotionValue(0);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
      return;
    }

    const viewportHeight = window.innerHeight;
    const currentHeight = viewportHeight - info.point.y;
    const currentPercent = currentHeight / viewportHeight;

    const nearestSnap = SNAP_POINTS.reduce((prev, curr) => 
      Math.abs(curr - currentPercent) < Math.abs(prev - currentPercent) ? curr : prev
    );
    
    setCurrentSnap(nearestSnap);
    y.set(0);
  }, [onClose, y]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/60 z-[80]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0, height: `${currentSnap * 100}vh` }}
        exit={{ y: "100%" }}
        transition={{ 
          type: "spring", 
          damping: 32, 
          stiffness: 420,
          mass: 0.8,
        }}
        style={{ y }}
        className="fixed inset-x-0 bottom-0 z-[81] bg-zinc-900 rounded-t-3xl shadow-2xl flex flex-col"
      >
        {/* Drag Handle */}
        <motion.div 
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.2 }}
          onDragEnd={handleDragEnd}
          className="flex flex-col items-center py-3 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </motion.div>

        {/* Content with Suspense */}
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<QueueSkeleton />}>
            <LazyQueue />
          </Suspense>
        </div>
      </motion.div>
    </>
  );
};

// Main Mini Player Component
const MiniPlayer = () => {
  const location = useLocation();
  const { selectedUser } = useChatStore();
  // const tier = useDeviceTier();

  const { 
    currentSong, isPlaying, togglePlay, playNext, playPrevious,
    currentTime, duration, setCurrentTime, toggleShuffle, toggleRepeat,
    isShuffle, isRepeat
  } = usePlayerStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [songOptionsOpen, setSongOptionsOpen] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

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

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    const audio = document.querySelector("audio") as HTMLAudioElement | null;
    if (audio) audio.currentTime = newTime;
  };

  // Hide when in active chat conversation
  const isInActiveChat = location.pathname.startsWith("/chat") && selectedUser;

  if (!currentSong || isInActiveChat) return null;

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Mini Player Bar - positioned ABOVE bottom nav */}
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
              {/* Subtle album art blur in background */}
              <div
                className="absolute inset-0 opacity-30"
                style={{ 
                  backgroundImage: `url(${currentSong.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(30px)',
                }}
              />

              {/* Content */}
              <div className="relative flex items-center gap-3 px-3 w-full">
                <img
                  src={currentSong.imageUrl}
                  alt={currentSong.title}
                  className="w-11 h-11 object-cover rounded-xl shadow-lg"
                />

                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                  <MarqueeText
                    text={currentSong.title}
                    className="text-sm font-medium text-white"
                    speed={25}
                    pauseDuration={2500}
                    gap={80}
                    fadeWidth={32}
                  />
                  <MarqueeText
                    text={currentSong.artist}
                    className="text-xs text-white/60"
                    speed={22}
                    pauseDuration={3000}
                    gap={80}
                    fadeWidth={28}
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="mt-1 mr-2" onClick={(e) => e.stopPropagation()}>
                    <LikeButton songId={currentSong._id} />
                  </div>

                  <Button
                    size="icon"
                    className="bg-transparent text-white active:bg-white/10 rounded-full h-9 w-9 shadow-lg hover:scale-105 transition-transform"
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
                    className="
                      text-white h-9 w-9 rounded-full
                      active:bg-white/20
                      transition-colors duration-200
                    "
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>

                </div>
              </div>

              {/* Progress bar at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <motion.div
                  className="h-1/2 bg-white/80"
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
          style={{ willChange: 'opacity' }}
          >
        {/* Background - richer but still performant */}
        <div className="absolute inset-0 bg-black" style={{ willChange: 'transform' }}>

        {/* 1) Slightly blurred cover layer (keep blur modest) */}
        <div
            className="absolute inset-0 scale-110 opacity-60"
            style={{
            backgroundImage: `url(${currentSong.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(38px) saturate(1.25)", // was 80px; 35–45 is a good sweet spot
            transform: "translateZ(0)", // helps GPU compositing sometimes
            }}
        />

        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 via-transparent to-fuchsia-500/10" />

        {/* 2) Vignette + contrast (cheap, makes it feel less flat) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.10),rgba(0,0,0,0.0)_40%)]" />

        {/* 3) Darkening gradient like Spotify */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />

        {/* 4) Extra bottom depth so controls pop */}
        <div className="absolute inset-x-0 bottom-0 h-[45vh] bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

            {/* Content Container */}
            <motion.div
             initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ 
                type: "spring", 
                damping: 30, 
                stiffness: 350, 
                delay: 0.05 
              }}
              className="relative h-full flex flex-col"
              style={{ willChange: 'transform, opacity' }}
            >
              {/* Header */}
              <div 
                className="flex justify-between items-center px-4 py-3"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
              >
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-white/70 hover:text-white active:bg-white/10 h-10 w-10"
                  onClick={() => setIsExpanded(false)}
                >
                  <ChevronDown className="h-7 w-7" />
                </Button>
                
                <span className="text-[10px] text-white/50 font-normal uppercase tracking-wider">
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
              </div>

              {/* Album Art */}
              <div className="flex-1 flex items-center justify-center px-4 py-4">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 20, stiffness: 200, delay: 0.15 }}
                  className={cn(
                    "relative aspect-square w-full",
                    "max-w-[min(88vw,85vh-290px)]",  // Constrain by both width AND height
                    "max-h-[calc(100vh-400px)]"       // Ensure controls always have ~400px space
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
              <div className="px-6 pb-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
                {/* Song Info */}
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="w-full"
                    >
                      <MarqueeText
                    text={currentSong.title}
                    className="text-xl font-medium text-white"
                    speed={25}
                    pauseDuration={2500}
                    gap={80}
                    fadeWidth={32}
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="w-full mt-1"
                    >
                      <MarqueeText
                    text={currentSong.artist}
                    className="text-base text-white/60"
                    speed={22}
                    pauseDuration={3000}
                    gap={80}
                    fadeWidth={28}
                      />
                    </motion.div>
                  </div>
                  <div className="flex-shrink-0">
                    <LikeButton songId={currentSong._id} />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
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
                      "h-12 w-12 transition-all",
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
                    className="text-white h-14 w-14 active:bg-white/10"
                    onClick={playPrevious}
                  >
                    <SkipBack className="h-7 w-7" fill="white" />
                  </Button>

                  <Button
                    size="icon"
                    className="bg-white text-black rounded-full h-16 w-16 shadow-xl hover:scale-105 active:scale-95 transition-transform"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="h-11 w-11" fill="black"/>
                    ) : (
                      <Play className="h-11 w-11 ml-1" fill="black"/>
                    )}
                  </Button>

                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-white h-14 w-14 active:bg-white/10"
                    onClick={playNext}
                  >
                    <SkipForward className="h-7 w-7" fill="white" />
                  </Button>

                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className={cn(
                      "h-12 w-12 transition-all",
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
                <div className="flex items-center justify-center gap-6">
                  <SleepTimer />
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white/80 h-12 w-12"
                    onClick={() => setQueueOpen(true)}
                  >
                    <ListMusic className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Queue Sheet */}
            <AnimatePresence mode="wait">
              {queueOpen && (
                <DraggableQueueSheet onClose={() => setQueueOpen(false)} />
              )}
            </AnimatePresence>

            {/* Song Options Sheet */}
            <AnimatePresence>
              {songOptionsOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-[110]"
                    onClick={() => setSongOptionsOpen(false)}
                  />
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="fixed inset-x-0 bottom-0 z-[111] bg-zinc-900 rounded-t-3xl shadow-2xl max-h-[70vh]"
                  >
                    <div className="flex justify-center pt-3 pb-3">
                      <div className="w-10 h-1 bg-white/20 rounded-full" />
                    </div>

                    <div className="flex items-center gap-3 px-5 pb-4 border-b border-white/10">
                      <img
                        src={currentSong.imageUrl}
                        alt={currentSong.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{currentSong.title}</p>
                        <p className="text-white/50 text-sm truncate">{currentSong.artist}</p>
                      </div>
                    </div>

                    <div className="p-4 pb-8 overflow-y-auto">
                      <PlaybackControlsSongOptions
                        song={currentSong}
                        onClose={() => setSongOptionsOpen(false)}
                        variant="mobile-sheet"
                        onToggleFullscreen={toggleBrowserFullscreen} // Add this
                        isFullscreen={isBrowserFullscreen}
                      />
                    </div>
                    
                    <div className="h-[env(safe-area-inset-bottom)]" />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MiniPlayer;