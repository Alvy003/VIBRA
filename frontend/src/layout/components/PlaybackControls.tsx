// src/pages/layout/components/PlaybackControls.tsx
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useUIStore } from "@/stores/useUIStore";
import { cn } from "@/lib/utils";
import Queue from "@/pages/home/components/Queue";
import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  VolumeX,
  ChevronDown,
  Maximize2,
  Minimize2,
  // Music2,
  Timer,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import LikeButton from "@/pages/home/components/LikeButton";
import { motion, AnimatePresence, useMotionValue, PanInfo } from "framer-motion";

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// ---- Improved Sleep Timer Bottom Sheet ----
const SleepTimer = () => {
  const { setIsPlaying } = usePlayerStore();
  const [activeSeconds, setActiveSeconds] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<"timer" | "endOfSong" | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const endedListenerRef = useRef<(() => void) | null>(null);

  const clearEverything = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    
    // Remove ended event listener if exists
    if (endedListenerRef.current) {
      const audio = document.querySelector("audio");
      if (audio) {
        audio.removeEventListener("ended", endedListenerRef.current);
      }
      endedListenerRef.current = null;
    }
    
    setActiveSeconds(null);
    setActiveMode(null);
  };

  const startCountdown = (seconds: number) => {
    clearEverything();
    timeoutRef.current = window.setTimeout(() => {
      setIsPlaying(false);
      clearEverything();
    }, seconds * 1000);
    setActiveSeconds(seconds);
    setActiveMode("timer");
    setIsOpen(false);
  };

  // const setEndOfSong = () => {
  //   clearEverything();
  //   const audio = document.querySelector("audio") as HTMLAudioElement;
    
  //   if (audio && duration > 0) {
  //     // Create listener that will pause at the end
  //     const endedListener = () => {
  //       audio.pause();
  //       setIsPlaying(false);
  //       clearEverything();
  //     };
      
  //     // Store reference and add listener
  //     endedListenerRef.current = endedListener;
  //     audio.addEventListener("ended", endedListener, { once: true });
      
  //     const remainingTime = (duration - currentTime) * 1000;
  //     setActiveMode("endOfSong");
  //     setActiveSeconds(Math.floor(remainingTime / 1000));
  //     setIsOpen(false);
  //   }
  // };

  const cancel = () => clearEverything();

  const isActiveTimer = (s: number) => activeMode === "timer" && activeSeconds === s;

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "text-zinc-400 hover:text-white transition-all relative",
          activeMode && "text-violet-400"
        )}
        onClick={() => setIsOpen(true)}
        aria-label="Sleep timer"
      >
        <Timer className={cn("h-5 w-5 transition-transform", activeMode && "scale-110")} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-[90] backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              key="sleep-timer-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[99] bg-gradient-to-b from-neutral-900 to-neutral-950 lg:bg-gradient-to-b lg:from-zinc-900 lg:to-zinc-950 rounded-t-[28px] shadow-2xl flex flex-col max-h-[75vh]"
            >
              {/* Header */}
              <div className="flex flex-col items-center pt-3 pb-2 border-b border-zinc-800/50">
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full mb-4" />
                <div className="flex items-center gap-2.5 px-6 pb-3">
                  <Timer className="w-5 h-5 text-violet-400" />
                  <h2 className="text-xl font-bold text-white">Sleep Timer</h2>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 px-4 py-6 overflow-y-auto">
                <div className="max-w-md mx-auto space-y-6">
                  {/* Quick Timers */}
                  <div>
                    <h3 className="text-sm font-medium text-zinc-400 mb-3 px-2">Timer Duration</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { label: "5 minutes", value: 5 },
                        { label: "15 minutes", value: 15 },
                        { label: "30 minutes", value: 30 },
                        { label: "45 minutes", value: 45 },
                        { label: "1 hour", value: 60 },
                        { label: "2 hours", value: 120 },
                      ].map(({ label, value }) => (
                        <Button
                          key={value}
                          variant="outline"
                          className={cn(
                            "h-14 justify-start text-left border-zinc-800 hover:border-violet-500/50 transition-all rounded-xl",
                            isActiveTimer(value * 60)
                              ? "bg-violet-500/15 border-violet-500 text-violet-300 shadow-lg shadow-violet-500/10"
                              : "bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                          )}
                          onClick={() => startCountdown(value * 60)}
                        >
                          <Timer className="w-4 h-4 mr-2.5" />
                          <span className="font-medium">{label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* End of Song Option */}
                  {/* <div>
                    <h3 className="text-sm font-medium text-zinc-400 mb-3 px-2">Special Options</h3>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-14 justify-start text-left border-zinc-800 hover:border-violet-500/50 transition-all rounded-xl",
                        activeMode === "endOfSong"
                          ? "bg-violet-500/15 border-violet-500 text-violet-300 shadow-lg shadow-violet-500/10"
                          : "bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                      )}
                      onClick={setEndOfSong}
                      disabled={!duration || duration === 0}
                    >
                      <Music2 className="w-4 h-4 mr-2.5" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">End of current song</span>
                        {duration > 0 && (
                          <span className="text-xs text-zinc-500">
                            {formatTime(duration - currentTime)} remaining
                          </span>
                        )}
                      </div>
                    </Button>
                  </div> */}

                  {/* Cancel Button */}
                  {activeMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-2"
                    >
                      <Button
                        variant="outline"
                        className="w-full h-12 border-red-900/50 bg-red-950/20 text-red-400 hover:bg-red-950/40 hover:text-red-300 hover:border-red-800 rounded-xl font-medium"
                        onClick={cancel}
                      >
                        Cancel Timer
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// ---- Improved Draggable Queue Sheet ----
const SNAP_POINTS = [0.4, 0.65, 0.9];
const CLOSE_THRESHOLD = 120;

const DraggableQueueSheet = ({ 
  onClose 
}: { 
  onClose: () => void;
}) => {
  const [currentSnap, setCurrentSnap] = useState(0.65);
  const y = useMotionValue(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const findNearestSnap = (currentY: number, velocity: number): number => {
    const viewportHeight = window.innerHeight;
    const currentHeight = viewportHeight - currentY;
    const currentPercent = currentHeight / viewportHeight;

    if (velocity > 800) return 0;
    
    if (velocity < -800) {
      const higherSnaps = SNAP_POINTS.filter(s => s > currentPercent);
      if (higherSnaps.length > 0) return Math.min(...higherSnaps);
    }

    return SNAP_POINTS.reduce((prev, curr) => 
      Math.abs(curr - currentPercent) < Math.abs(prev - currentPercent) ? curr : prev
    );
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    isDraggingRef.current = false;
    
    if (info.offset.y > CLOSE_THRESHOLD || info.velocity.y > 500) {
      onClose();
      return;
    }

    const nearestSnap = findNearestSnap(info.point.y, info.velocity.y);
    setCurrentSnap(nearestSnap);
    y.set(0);
  };

  const sheetHeight = `${currentSnap * 100}vh`;

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0, height: sheetHeight }}
        exit={{ y: "100%" }}
        transition={{ 
          type: "spring",
          damping: 35,
          stiffness: 400,
          mass: 0.8
        }}
        style={{ y }}
        className="fixed inset-x-0 bottom-0 z-50 bg-neutral-900 rounded-t-[30px] shadow-2xl flex flex-col"
      >
        <motion.div 
          drag="y"
          dragDirectionLock
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.2 }}
          onDragStart={() => {
            isDraggingRef.current = true;
          }}
          onDrag={(_, info) => {
            if (scrollRef.current && scrollRef.current.scrollTop > 5 && info.offset.y > 0) {
              return false;
            }
          }}
          onDragEnd={handleDragEnd}
          className="flex flex-col items-center py-4 cursor-grab active:cursor-grabbing select-none shrink-0"
        >
          <div className="w-12 h-1.5 bg-zinc-600 rounded-full" />
        </motion.div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-2 overscroll-contain"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
          onTouchStart={() => {
            if (scrollRef.current && scrollRef.current.scrollTop > 0) {
              isDraggingRef.current = false;
            }
          }}
        >
          <Queue />
        </div>
      </motion.div>
    </>
  );
};

export const PlaybackControls = () => {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    currentTime,
    duration,
    volume,
    setVolume,
    setCurrentTime,
    toggleShuffle,
    toggleRepeat,
    isShuffle,
    isRepeat,
  } = usePlayerStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const previousVolumeRef = useRef(volume);
  
  const toggleSidePanelView = useUIStore((s) => s.toggleSidePanelView);
  const sidePanelView = useUIStore((s) => s.sidePanelView);

  // Toggle mute/unmute
  const toggleMute = () => {
    if (isMuted) {
      // Unmute - restore previous volume
      setVolume(previousVolumeRef.current || 50);
      setIsMuted(false);
    } else {
      // Mute - save current volume and set to 0
      previousVolumeRef.current = volume;
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Update muted state when volume changes externally
  useEffect(() => {
    if (volume === 0 && !isMuted) {
      setIsMuted(true);
    } else if (volume > 0 && isMuted) {
      setIsMuted(false);
      previousVolumeRef.current = volume;
    }
  }, [volume, isMuted]);

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
    setIsFullscreen(true);
  };
  
  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
    setIsFullscreen(false);
  };
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    if (window.innerWidth < 768) return;
    if (!isFullscreen) enterFullscreen();
    else exitFullscreen();
  };
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
    };

    window.addEventListener("keydown", handleEsc);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isFullscreen]);

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);

    const audio = document.querySelector("audio") as HTMLAudioElement | null;
    if (audio) audio.currentTime = newTime;
  };

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <footer
      className={`bg-zinc-900 border-t border-zinc-800 
        fixed bottom-1 left-0 right-0 z-40
        sm:static sm:border-none sm:px-0
        transition-all duration-300 ease-in-out
        ${isExpanded ? "h-screen sm:h-24" : "h-19 sm:h-24"}
        flex flex-col sm:flex-row sm:justify-between items-center
        max-w-[1800px] mx-auto w-full`}
    >
      <AnimatePresence initial={false}>
        {/* MOBILE MINI PLAYER */}
        {!isExpanded && (
          <motion.div
            key="mini"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
            className="relative flex sm:hidden items-center gap-3 w-full h-16 cursor-pointer rounded-md overflow-hidden"
            onClick={() => currentSong && toggleExpand()}
          >
            {currentSong && (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center blur-lg opacity-40"
                  style={{ backgroundImage: `url(${currentSong.imageUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-zinc-900/40 to-transparent" />
              </>
            )}

            <div className="relative flex items-center gap-4 px-3 w-full">
              {currentSong ? (
                <>
                  <img
                    src={currentSong.imageUrl}
                    alt={currentSong.title}
                    className="w-10 h-10 object-cover rounded-md"
                  />
                  <div className="flex flex-col overflow-hidden">
                    <div className="text-sm font-medium text-white truncate">{currentSong.title}</div>
                    <div className="text-xs text-zinc-300 truncate">{currentSong.artist}</div>
                  </div>

                  <div className="ml-auto flex items-center">
                    <LikeButton songId={currentSong._id} />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col overflow-hidden ml-1">
                    <div className="text-sm font-medium text-white/85">Not playing</div>
                    <div className="text-xs text-zinc-400">Tap a song to start</div>
                  </div>
                  <div className="ml-auto" />
                </>
              )}

              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    playPrevious();
                  }}
                  className="text-zinc-300 lg:hover:text-white"
                  disabled={!currentSong}
                >
                  <SkipBack className="h-5 w-5" />
                </Button>

                <Button
                  size="icon"
                  className="bg-white lg:hover:bg-white/80 text-black rounded-full h-9 w-9"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  disabled={!currentSong}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    playNext();
                  }}
                  className="text-zinc-300 lg:hover:text-white"
                  disabled={!currentSong}
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* MOBILE EXPANDED VIEW */}
        {isExpanded && currentSong && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="sm:hidden fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            style={{ height: "calc(var(--vh, 1vh) * 100)" }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl opacity-80"
              style={{ backgroundImage: `url(${currentSong.imageUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-900/80 to-transparent" />

            <div className="relative flex flex-col h-full px-6 pb-6 text-white overflow-y-auto">
              <div className="flex justify-start sticky top-0 z-10 pt-6">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-zinc-300"
                  onClick={toggleExpand}
                >
                  <ChevronDown className="h-7 w-7" />
                </Button>
              </div>

              <div className="flex justify-center mt-10">
                <img
                  src={currentSong.imageUrl}
                  alt={currentSong.title}
                  className="w-[80vw] max-w-[320px] aspect-square rounded-2xl shadow-lg object-cover"
                />
              </div>

              <div className="mt-9 flex items-center justify-between w-full max-w-[320px] mx-auto">
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="text-2xl font-semibold truncate">{currentSong.title}</div>
                  <div className="text-sm text-zinc-400 truncate">{currentSong.artist}</div>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <LikeButton songId={currentSong._id} />
                </div>
              </div>

              <div className="mt-10 flex items-center gap-2">
                <div className="text-xs text-zinc-400">{formatTime(currentTime)}</div>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  className="w-full"
                  onValueChange={handleSeek}
                />
                <div className="text-xs text-zinc-400">{formatTime(duration)}</div>
              </div>

              <div className="mt-11 flex items-center justify-center gap-8">
                <Button size="icon" variant="ghost" className={`${isShuffle ? "text-white" : "text-zinc-400"}`} onClick={toggleShuffle}>
                  <Shuffle className="h-6 w-6" />
                </Button>
                <Button size="icon" variant="ghost" className="text-zinc-400" onClick={playPrevious}>
                  <SkipBack className="h-9 w-9" />
                </Button>
                <Button size="icon" className="bg-white text-black rounded-full h-16 w-16 shadow-lg" onClick={togglePlay}>
                  {isPlaying ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9" />}
                </Button>
                <Button size="icon" variant="ghost" className="text-zinc-400" onClick={playNext}>
                  <SkipForward className="h-9 w-9" />
                </Button>
                <Button size="icon" variant="ghost" className={`${isRepeat ? "text-white" : "text-zinc-400"}`} onClick={toggleRepeat}>
                  <Repeat className="h-6 w-6" />
                </Button>
              </div>

              <div className="mt-9 flex items-center justify-center gap-3">
                <SleepTimer />
                <Button size="icon" variant="ghost" className="text-transparent" disabled>
                  <Repeat className="h-6 w-6" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-zinc-400"
                  onClick={() => setQueueOpen(true)}
                >
                  <ListMusic className="h-6 w-6" />
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {queueOpen && (
                <DraggableQueueSheet 
                  onClose={() => setQueueOpen(false)} 
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DESKTOP SONG INFO + LIKE */}
      <div className="hidden sm:flex items-center gap-4 min-w-[180px] w-[30%] pl-4">
        {currentSong && (
          <>
            <img src={currentSong.imageUrl} alt={currentSong.title} className="w-14 h-14 object-cover rounded-md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-medium truncate hover:underline cursor-pointer">{currentSong.title}</div>
                <LikeButton songId={currentSong._id} />
              </div>
              <div className="text-sm text-zinc-400 truncate hover:underline cursor-pointer">{currentSong.artist}</div>
            </div>
          </>
        )}
      </div>

      {/* Desktop Player Controls */}
      <div className="hidden sm:flex flex-col items-center gap-2 flex-1 max-w-[45%]">
        <div className="flex items-center gap-6">
          <Button size="icon" variant="ghost" className={`${isShuffle ? "text-white" : "text-zinc-400"} hover:text-white`} onClick={toggleShuffle}>
            <Shuffle className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="ghost" onClick={playPrevious} disabled={!currentSong} className="hover:text-white text-zinc-400">
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button size="icon" className="bg-white lg:hover:bg-white/80 text-black rounded-full h-8 w-8" onClick={togglePlay} disabled={!currentSong}>
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <Button size="icon" variant="ghost" onClick={playNext} disabled={!currentSong} className="hover:text-white text-zinc-400">
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="ghost" className={`${isRepeat ? "text-white" : "text-zinc-400"} hover:text-white`} onClick={toggleRepeat}>
            <Repeat className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full">
          <div className="text-xs text-zinc-400">{formatTime(currentTime)}</div>
          <Slider value={[currentTime]} max={duration || 100} step={1} className="w-full hover:cursor-grab active:cursor-grabbing" onValueChange={handleSeek} />
          <div className="text-xs text-zinc-400">{formatTime(duration)}</div>
        </div>
      </div>

      {/* Desktop right group */}
      <div className="hidden sm:flex items-center gap-4 min-w-[180px] w-[30%] justify-end pr-4">
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleSidePanelView}
          className={cn(
            "text-zinc-400 hover:text-white",
            sidePanelView === "queue" && "text-white"
          )}
        >
          <ListMusic className="h-4 w-4" />
        </Button>

        <SleepTimer />

        <div className="flex items-center gap-2">
          <Button 
            size="icon" 
            variant="ghost" 
            className="hover:text-white text-zinc-400"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume1 className="h-4 w-4" />
            )}
          </Button>
          <Slider 
            value={[volume]} 
            max={100} 
            step={1} 
            className="w-28 hover:cursor-grab active:cursor-grabbing" 
            onValueChange={(value) => {
              setVolume(value[0]);
              if (value[0] > 0) setIsMuted(false);
            }} 
          />
        </div>

        <Button
          size="icon"
          variant="ghost"
          className="hover:text-white text-zinc-400"
          onClick={toggleFullscreen}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Fullscreen Player */}
      <AnimatePresence>
        {isFullscreen && currentSong && (
          <motion.div
            key="fullscreen-player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-between text-white bg-black/95 backdrop-blur-3xl overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-cover bg-center blur-3xl opacity-80 scale-110"
              style={{ backgroundImage: `url(${currentSong.imageUrl})` }}
              animate={{
                scale: [1.1, 1.15, 1.1],
                x: [-30, 30, -30],
                y: [-15, 15, -15],
              }}
              transition={{
                duration: 40,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

            <div className="relative z-10 w-full flex justify-end p-6">
              <Button
                size="icon"
                variant="ghost"
                className="text-zinc-300 hover:text-white"
                onClick={toggleFullscreen}
              >
                <Minimize2 className="h-6 w-6" />
              </Button>
            </div>

            <div
              className="relative z-10 flex flex-col items-center justify-center text-center w-full px-6"
              style={{
                maxWidth: "min(95vw, 900px)",
                flex: "1 1 auto",
                gap: "clamp(16px, 4vh, 40px)",
              }}
            >
              <img
                src={currentSong.imageUrl}
                alt={currentSong.title}
                className="object-cover -mt-10 rounded-3xl shadow-[0_0_60px_-20px_rgba(255,255,255,0.15)] transition-transform duration-300 hover:scale-[1.02]"
                style={{
                  width: "clamp(240px, 50vh, 600px)",
                  aspectRatio: "1 / 1",
                }}
              />

              <div className="mt-2 w-full flex items-center justify-between max-w-[550px]">
                <div className="flex flex-col text-left truncate">
                  <div className="text-2xl font-semibold truncate">{currentSong.title}</div>
                  <div className="text-sm text-zinc-400">{currentSong.artist}</div>
                </div>
                <LikeButton songId={currentSong._id} />
              </div>

              <div className="flex items-center gap-3 w-full mt-2">
                <span className="text-xs text-zinc-400">{formatTime(currentTime)}</span>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleSeek}
                  className="flex-1"
                />
                <span className="text-xs text-zinc-400">{formatTime(duration)}</span>
              </div>

              <div className="flex items-center justify-center gap-8 mt-2 flex-wrap">
                <Button
                  size="icon"
                  variant="ghost"
                  className={`${isShuffle ? "text-white" : "text-zinc-400"} hover:text-white`}
                  onClick={toggleShuffle}
                >
                  <Shuffle className="h-7 w-7" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={playPrevious}
                  className="text-zinc-400 hover:text-white"
                >
                  <SkipBack className="h-10 w-10" />
                </Button>

                <Button
                  size="icon"
                  className="bg-white lg:hover:bg-white/80 text-black rounded-full h-16 w-16 shadow-xl"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9" />}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={playNext}
                  className="text-zinc-400 hover:text-white"
                >
                  <SkipForward className="h-10 w-10" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleRepeat}
                  className={`${isRepeat ? "text-white" : "text-zinc-400"} hover:text-white`}
                >
                  <Repeat className="h-7 w-7" />
                </Button>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>
    </footer>
  );
};

export default PlaybackControls;