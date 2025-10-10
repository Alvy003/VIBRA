  // src/pages/layout/components/PlaybackControls.tsx
  import { Button } from "@/components/ui/button";
  import { Slider } from "@/components/ui/slider";
  import { usePlayerStore } from "@/stores/usePlayerStore";
  import { useUIStore } from "@/stores/useUIStore";
  import { cn } from "@/lib/utils";
  import Queue from "@/pages/home/components/Queue";
  //import { usePalette } from "color-thief-react"; // Optional for color matching
  import {
    //Laptop2,
    ListMusic,
    //Mic2,
    Pause,
    Play,
    Repeat,
    Shuffle,
    SkipBack,
    SkipForward,
    Volume1,
    ChevronDown,
    Clock,
    Maximize2,
    Minimize2,
  } from "lucide-react";
  import { useEffect, useRef, useState } from "react";
  import LikeButton from "@/pages/home/components/LikeButton";
  import { motion, AnimatePresence } from "framer-motion";

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };


// ---- Sleep Timer Bottom Sheet ----
const SleepTimer = () => {
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying);
  const [activeSeconds, setActiveSeconds] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const endedHandlerRef = useRef<((e?: Event) => void) | null>(null);

  const clearEverything = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    if (endedHandlerRef.current) {
      const audio = document.querySelector("audio");
      if (audio) audio.removeEventListener("ended", endedHandlerRef.current);
    }
    endedHandlerRef.current = null;
    setActiveSeconds(null);
  };

  const startCountdown = (seconds: number) => {
    clearEverything();
    timeoutRef.current = window.setTimeout(() => {
      setIsPlaying(false);
      clearEverything();
    }, seconds * 1000);
    setActiveSeconds(seconds);
    setIsOpen(false);
  };

  const cancel = () => clearEverything();

  const isActive = (s: number) => activeSeconds === s;

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className={`text-zinc-400 hover:text-white ${activeSeconds ? "text-white" : ""}`}
        onClick={() => setIsOpen(true)}
        aria-label="Sleep timer"
      >
        <Clock className="h-5 w-5" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/40 z-[90]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Bottom Sheet */}
            <motion.div
              key="sleep-timer-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="fixed inset-x-0 bottom-0 z-[99] bg-zinc-900 rounded-t-2xl h-[45vh] shadow-2xl flex flex-col"
            >
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 120) setIsOpen(false);
                }}
                className="flex justify-center py-3"
              >
                <div className="w-10 h-1.5 bg-zinc-600 rounded-full" />
              </motion.div>

              <div className="flex-1 px-6 py-4 overflow-y-auto text-white">
                <h2 className="text-lg font-semibold mb-3">Sleep Timer</h2>

                <div className="flex flex-col gap-2">
                  {[5, 15, 30, 45, 60].map((m) => (
                    <Button
                      key={m}
                      variant="ghost"
                      className={`justify-start text-left ${
                        isActive(m * 60)
                          ? "text-violet-400 bg-violet-400/10"
                          : "text-zinc-300 hover:text-white"
                      }`}
                      onClick={() => startCountdown(m * 60)}
                    >
                      {m} minute{m > 1 ? "s" : ""}
                    </Button>
                  ))}
                  {activeSeconds !== null && (
                    <Button
                      variant="ghost"
                      className="justify-start text-red-400 hover:text-red-300 mt-2"
                      onClick={cancel}
                    >
                      Cancel Timer
                    </Button>
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
    
    const toggleSidePanelView = useUIStore((s) => s.toggleSidePanelView);
    const sidePanelView = useUIStore((s) => s.sidePanelView);

    const enterFullscreen = () => {
      const elem = document.documentElement; // Or use ref to your player container
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen(); // Safari
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen(); // IE11
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
      if (window.innerWidth < 768) return; // prevent on mobile
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
    transition={{ duration: 0.4, ease: "easeInOut" }}
    className="sm:hidden relative flex flex-col h-[100dvh] w-full overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
  >
    <div
      className="absolute inset-0 bg-cover bg-center blur-2xl opacity-80"
      style={{ backgroundImage: `url(${currentSong.imageUrl})` }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-900/80 to-transparent" />

    <div className="relative flex flex-col h-full px-6 pb-6 text-white overflow-y-auto">
      {/* Top bar with collapse button */}
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

      {/* Song cover */}
      <div className="flex justify-center mt-10">
        <img
          src={currentSong.imageUrl}
          alt={currentSong.title}
          className="w-[80vw] max-w-[320px] aspect-square rounded-2xl shadow-lg object-cover"
        />
      </div>

      {/* Song info and like */}
      <div className="mt-9 flex items-center justify-between w-full max-w-[320px] mx-auto">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="text-2xl font-semibold truncate">{currentSong.title}</div>
          <div className="text-sm text-zinc-400 truncate">{currentSong.artist}</div>
        </div>
        <div className="ml-3 flex-shrink-0">
          <LikeButton songId={currentSong._id} />
        </div>
      </div>

      {/* Progress slider */}
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

      {/* Playback controls */}
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

      {/* Bottom row */}
      <div className="mt-9 flex items-center justify-center gap-3">
        <SleepTimer />
        <Button size="icon" variant="ghost" className={`${isRepeat ? "text-transparent" : "text-transparent"}`} onClick={toggleRepeat} disabled>
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

    {/* Queue Overlay */}
    <AnimatePresence>
  {queueOpen && (
    <>
      {/* Backdrop: closes on click */}
      <motion.div
        className="fixed inset-0 bg-black/40 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setQueueOpen(false)}
      />

      {/* Draggable Panel */}
      <motion.div
        key="queue-overlay"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="fixed inset-x-0 bottom-0 z-50 bg-zinc-900 rounded-t-2xl h-[80vh] shadow-2xl flex flex-col"
      >
        {/* Grab Handle - ONLY this is draggable */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120) {
              setQueueOpen(false);
            }
          }}
          className="flex justify-center py-3 active:cursor-grabbing"
        >
          <div className="w-10 h-1.5 bg-zinc-600 rounded-full" />
        </motion.div>

        {/* Scrollable Queue */}
        <div className="flex-1 overflow-y-auto px-2">
          <Queue />
        </div>
      </motion.div>

          </>
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

        {/* Desktop right group: queue / sleep timer */}
        <div className="hidden sm:flex items-center gap-4 min-w-[180px] w-[30%] justify-end pr-4">
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleSidePanelView}
          className={cn(
            "text-zinc-400",
            sidePanelView === "queue" && "text-white"
          )}
        >
          <ListMusic className="h-4 w-4" />
        </Button>
          {/* Sleep timer on desktop group */}
          <div>
            <SleepTimer />
          </div>

          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="hover:text-white text-zinc-400">
              <Volume1 className="h-4 w-4" />
            </Button>

            <Slider value={[volume]} max={100} step={1} className="w-28 hover:cursor-grab active:cursor-grabbing" onValueChange={(value) => setVolume(value[0])} />
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
        <AnimatePresence>
    {isFullscreen && currentSong && (
      <motion.div
        key="fullscreen-player"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-between text-white bg-black/95 backdrop-blur-3xl"
      >
        {/* Background */}
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

        {/* Header */}
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

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 text-center w-full max-w-[700px] px-6">
          <img
            src={currentSong.imageUrl}
            alt={currentSong.title}
            className="w-[360px] md:w-[420px] lg:w-[460px] aspect-square object-cover rounded-3xl shadow-[0_0_60px_-20px_rgba(255,255,255,0.15)] transition-transform duration-300 hover:scale-[1.02]"
          />

          {/* Song info */}
          <div className="mt-10 flex items-center justify-between w-full max-w-[480px]">
            <div className="flex flex-col text-left truncate">
              <div className="text-2xl font-semibold truncate">{currentSong.title}</div>
              <div className="text-sm text-zinc-400">{currentSong.artist}</div>
            </div>
            <LikeButton songId={currentSong._id} />
          </div>

          {/* Slider */}
          <div className="flex items-center gap-3 w-full mt-6">
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

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-10 mt-10">
            <Button
              size="icon"
              variant="ghost"
              className={`${isShuffle ? "text-white" : "text-zinc-400"} hover:text-white`}
              onClick={toggleShuffle}
            >
              <Shuffle className="h-7 w-7" />
            </Button>

            <Button size="icon" variant="ghost" onClick={playPrevious} className="text-zinc-400 hover:text-white">
              <SkipBack className="h-10 w-10" />
            </Button>

            <Button
              size="icon"
              className="bg-white lg:hover:bg-white/80 text-black rounded-full h-16 w-16 shadow-xl"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9" />}
              </Button>

            <Button size="icon" variant="ghost" onClick={playNext} className="text-zinc-400 hover:text-white">
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

        {/* Bottom fade for cinematic feel */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
      </motion.div>
    )}
  </AnimatePresence>
      </footer>
    );
  };
  export default PlaybackControls;
