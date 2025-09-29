// src/pages/layout/components/PlaybackControls.tsx
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/usePlayerStore";
import {
  Laptop2,
  ListMusic,
  Mic2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  ChevronDown,
  Clock,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import LikeButton from "@/pages/home/components/LikeButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

/**
 * SleepTimer
 *
 * - uses setTimeout for countdown (no visible clock)
 * - uses an 'ended' handler for "End of song"
 * - never calls store setters during render
 */
const SleepTimer = () => {
  // explicit setter to pause playback
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);

  // null => no active timer, >0 => seconds countdown active, -1 => end-of-song active
  const [activeSeconds, setActiveSeconds] = useState<number | null>(null);

  // keep handles so we can cancel
  const timeoutRef = useRef<number | null>(null);
  const endedHandlerRef = useRef<((e?: Event) => void) | null>(null);

  // cleanup on unmount
  useEffect(() => {
    return () => clearEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearEverything = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (endedHandlerRef.current) {
      const audio = document.querySelector("audio");
      if (audio) audio.removeEventListener("ended", endedHandlerRef.current);
      endedHandlerRef.current = null;
    }
    setActiveSeconds(null);
  };

  const startCountdown = (seconds: number) => {
    // clear any existing timers/listeners first
    clearEverything();

    // schedule a timeout that will explicitly pause playback
    timeoutRef.current = window.setTimeout(() => {
      // explicitly pause
      setIsPlaying(false);
      timeoutRef.current = null;
      setActiveSeconds(null);
    }, seconds * 1000);

    setActiveSeconds(seconds);
  };

  const cancel = () => {
    clearEverything();
  };

  const isActive = (s: number) => activeSeconds === s;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`text-zinc-400 hover:text-white ${activeSeconds ? "text-violet-400" : ""}`}
          aria-label="Sleep timer"
        >
          <Clock className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-zinc-900 border-zinc-700 w-44">
        <DropdownMenuItem
          onClick={() => startCountdown(5 * 60)}
          className={isActive(5 * 60) ? "text-violet-400 font-medium" : ""}
        >
          5 minutes
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => startCountdown(15 * 60)}
          className={isActive(15 * 60) ? "text-violet-400 font-medium" : ""}
        >
          15 minutes
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => startCountdown(30 * 60)}
          className={isActive(30 * 60) ? "text-violet-400 font-medium" : ""}
        >
          30 minutes
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => startCountdown(60 * 60)}
          className={isActive(60 * 60) ? "text-violet-400 font-medium" : ""}
        >
          1 hour
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => startCountdown(120 * 60)}
          className={isActive(120 * 60) ? "text-violet-400 font-medium" : ""}
        >
          2 hour
        </DropdownMenuItem>

        {activeSeconds !== null && (
          <>
            <div className="border-t border-white/5 my-1" />
            <DropdownMenuItem onClick={cancel} className="text-red-400">
              Cancel timer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
        fixed bottom-1 left-0 right-0 z-50
        sm:static sm:border-none sm:px-0
        transition-all duration-300 ease-in-out
        ${isExpanded ? "h-screen sm:h-24" : "h-19 sm:h-24"}
        flex flex-col sm:flex-row sm:justify-between items-center
        max-w-[1800px] mx-auto w-full`}
    >

      <AnimatePresence initial={false}>
      {/* MOBILE MINI PLAYER */}
      {!isExpanded && currentSong && (
        <motion.div
        key="mini"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.3 }}
        className="relative flex sm:hidden items-center gap-3 w-full h-16 cursor-pointer rounded-md overflow-hidden"
        onClick={toggleExpand}
      >
        <div
          className="relative flex sm:hidden items-center gap-3 w-full h-16 cursor-pointer rounded-md overflow-hidden"
          onClick={toggleExpand}
        >
          <div
            className="absolute inset-0 bg-cover bg-center blur-lg opacity-40"
            style={{ backgroundImage: `url(${currentSong.imageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-zinc-900/40 to-transparent" />

          <div className="relative flex items-center gap-4 px-3 w-full">
            <img
              src={currentSong.imageUrl}
              alt={currentSong.title}
              className="w-10 h-10 object-cover rounded-md"
            />

            <div className="flex flex-col overflow-hidden">
              <div className="text-sm font-medium text-white truncate">{currentSong.title}</div>
              <div className="text-xs text-zinc-300 truncate">{currentSong.artist}</div>
            </div>

            {/* Like Button in Mini Player */}
            <div className="ml-auto flex items-center">
              <LikeButton songId={currentSong._id} />
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  playPrevious();
                }}
                className="text-zinc-300 lg:hover:text-white"
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
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
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
        transition={{ duration: 0.40, ease: "easeInOut" }}
        className="sm:hidden relative flex flex-col h-screen w-full overflow-hidden pt-safe"
      >
        <div className="sm:hidden relative flex flex-col h-full w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30"
            style={{ backgroundImage: `url(${currentSong.imageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-900/80 to-transparent" />

          <div className="relative flex flex-col h-full px-6 py-4 text-white">
              <div className="flex justify-start">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-zinc-300 sm:hover:text-white"
                  onClick={toggleExpand}
                >
                  <ChevronDown className="h-7 w-7 mt-1" />
                </Button>
              </div>

            <div className="flex justify-center mt-12">
              <img
                src={currentSong.imageUrl}
                alt={currentSong.title}
                className="w-80 h-80 rounded-2xl shadow-lg object-cover"
              />
            </div>
            {/* Song Info + Like */}
            <div className="mt-9 text-center flex flex-row justify-between items-center gap-2 w-80 mx-auto">
              <div className="flex flex-col items-start">
                <div className="text-2xl font-semibold truncate">{currentSong.title}</div>
                <div className="text-sm text-zinc-400">{currentSong.artist}</div>
              </div>

              <div className="ml-auto flex items-center">
                <LikeButton songId={currentSong._id} />
              </div>
            </div>
            <div className="mt-10 flex items-center gap-2">
              <div className="text-xs text-zinc-400">{formatTime(currentTime)}</div>
              <Slider value={[currentTime]} max={duration || 100} step={1} className="w-full" onValueChange={handleSeek} />
              <div className="text-xs text-zinc-400">{formatTime(duration)}</div>
            </div>

            <div className="mt-9 flex items-center justify-center gap-12">
              <Button size="icon" variant="ghost" className="text-zinc-400 lg:hover:text-white" onClick={playPrevious}>
                <SkipBack className="h-9 w-9" />
              </Button>

              <Button size="icon" className="bg-white lg:hover:bg-white/80 text-black rounded-full h-16 w-16 shadow-lg" onClick={togglePlay}>
                {isPlaying ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9" />}
              </Button>

              <Button size="icon" variant="ghost" className="text-zinc-400 lg:hover:text-white" onClick={playNext}>
                <SkipForward className="h-9 w-9" />
              </Button>
            </div>

            <div className="mt-10 flex items-center justify-center gap-10">
              <Button size="icon" variant="ghost" className={`${isShuffle ? "text-white" : "text-zinc-400"} `} onClick={toggleShuffle}>
                <Shuffle className="h-6 w-6" />
              </Button>

              {/* Sleep timer placed between shuffle & repeat on mobile */}
              <div>
                <SleepTimer />
              </div>

              <Button size="icon" variant="ghost" className={`${isRepeat ? "text-white" : "text-zinc-400"} `} onClick={toggleRepeat}>
                <Repeat className="h-6 w-6" />
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2">
              <Button size="icon" variant="ghost" className="lg:hover:text-white text-zinc-400">
                <Volume1 className="h-6 w-6" />
              </Button>

              <Slider value={[volume]} max={100} step={1} className="w-full hover:cursor-grab active:cursor-grabbing" onValueChange={(value) => setVolume(value[0])} />
            </div>
          </div>
        </div>
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

          <Button size="icon" className="bg-white hover:bg-white/80 text-black rounded-full h-8 w-8" onClick={togglePlay} disabled={!currentSong}>
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

      {/* Desktop right group: mic / queue / devices / sleep timer */}
      <div className="hidden sm:flex items-center gap-4 min-w-[180px] w-[30%] justify-end pr-4">
        <Button size="icon" variant="ghost" className="hover:text-white text-zinc-400">
          <Mic2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="hover:text-white text-zinc-400">
          <ListMusic className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="hover:text-white text-zinc-400">
          <Laptop2 className="h-4 w-4" />
        </Button>

        {/* Sleep timer on desktop group */}
        <div>
          <SleepTimer />
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="hover:text-white text-zinc-400">
            <Volume1 className="h-4 w-4" />
          </Button>

          <Slider value={[volume]} max={100} step={1} className="w-24 hover:cursor-grab active:cursor-grabbing" onValueChange={(value) => setVolume(value[0])} />
        </div>
      </div>
    </footer>
  );
};
export default PlaybackControls;
