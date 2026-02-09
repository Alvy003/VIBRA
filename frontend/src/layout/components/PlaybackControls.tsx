// src/layout/components/PlaybackControls.tsx
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useUIStore } from "@/stores/useUIStore";
import { cn } from "@/lib/utils";
import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronDown,
  MoreHorizontal,
  Share2,
  ListPlus,
  ListEnd,
  Maximize,
  Minimize,
  Download,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import LikeButton from "@/pages/home/components/LikeButton";
import { motion, AnimatePresence } from "framer-motion";
import PlaybackControlsSongOptions from "./PlaybackControlsSongOptions";
import SleepTimer from "@/components/SleepTimer";
import { Song } from "@/types";
import AddToPlaylistDialog from "@/components/AddToPlaylistDialog";
import Queue from "@/pages/home/components/Queue";
import { useDownloads } from "@/hooks/useDownloads";
import ShareDialog from "@/components/ShareDialog";

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// ==================== CUSTOM PROGRESS SLIDER ====================
interface ProgressSliderProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  showThumbAlways?: boolean;
  trackColor?: string;
  progressColor?: string;
}

const ProgressSlider = ({
  value,
  max,
  onChange,
  disabled = false,
  className = "",
  showThumbAlways = false,
  trackColor = "bg-zinc-600",
  progressColor = "bg-white",
}: ProgressSliderProps) => {
  const percent = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className={cn("relative group h-1 w-full", className)}>
      {/* Track */}
      <div className={cn("absolute inset-0 rounded-full", trackColor)} />
      
      {/* Progress */}
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full transition-all", progressColor)}
        style={{ width: `${percent}%` }}
      />
      
      {/* Thumb - Shows on hover or always */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-lg pointer-events-none transition-opacity",
          progressColor,
          showThumbAlways ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        style={{ left: `calc(${percent}% - 6px)` }}
      />
      
      {/* Invisible input for interaction */}
      <input
        type="range"
        min={0}
        max={max || 100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
};

// ==================== CUSTOM VOLUME SLIDER ====================
interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const VolumeSlider = ({ value, onChange, className = "" }: VolumeSliderProps) => {
  return (
    <div className={cn("relative group h-1", className)}>
      {/* Track */}
      <div className="absolute inset-0 rounded-full bg-zinc-600" />
      
      {/* Progress */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-white/95 transition-all"
        style={{ width: `${value}%` }}
      />
      
      {/* Thumb */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white/95 rounded-full shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ left: `calc(${value}% - 6px)` }}
      />
      
      {/* Invisible input */}
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
      />
    </div>
  );
};

// ==================== SONG OPTIONS MENU ====================
const SongOptionsMenu = ({
  isOpen,
  onClose,
  song,
  position,
  onToggleFullscreen,
  isFullscreen,
}: {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  position: { x: number; y: number } | null;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}) => {
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  if (!isOpen || !song || !position) return null;

  const menuItems = [
    { 
      icon: isFullscreen ? Minimize : Maximize, 
      label: isFullscreen ? "Exit Fullscreen" : "Fullscreen", 
      action: () => {
        onToggleFullscreen();
        onClose();
      },
      divider: true,
    },
    { 
      icon: ListPlus, 
      label: "Add to Playlist", 
      action: () => {
        setShowPlaylistDialog(true);
      }
    },
    { 
      icon: ListEnd, 
      label: "Add to Queue", 
      action: () => {
        usePlayerStore.getState().addSongToQueue(song);
        onClose();
      }
    },
    { 
      icon: Share2, 
      label: "Share", 
      action: () => {
        setShowShareDialog(true);
      }
    },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="absolute bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden w-56"
          style={{
            top: Math.min(position.y, window.innerHeight - 280),
            left: Math.min(position.x - 120, window.innerWidth - 240),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Song Preview */}
          <div className="flex items-center gap-3 p-3 border-b border-white/5 bg-white/5">
            <img 
              src={song.imageUrl} 
              alt={song.title}
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{song.title}</p>
              <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-1.5">
            {menuItems.map((item, idx) => (
              <div key={idx}>
                <button
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <item.icon className="w-4 h-4 text-zinc-400" />
                  {item.label}
                </button>
                {item.divider && <div className="my-1 border-t border-white/5" />}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      <AddToPlaylistDialog
        isOpen={showPlaylistDialog}
        onClose={() => {
          setShowPlaylistDialog(false);
          onClose();
        }}
        song={song}
      />

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          onClose();
        }}
        title={song.title}
        text={`Listen to ${song.title} by ${song.artist}`}
        url={`${window.location.origin}/song/${song._id}`}
        imageUrl={song.imageUrl}
      />
    </>
  );
};

// ==================== MAIN PLAYBACK CONTROLS ====================
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

  const { 
    toggleSidePanelView, 
    sidePanelView,
    isRightSidebarCollapsed,
    setRightSidebarCollapsed,
    setSidePanelView
  } = useUIStore();

  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showSongOptions, setShowSongOptions] = useState(false);
  const [optionsPosition, setOptionsPosition] = useState<{ x: number; y: number } | null>(null);
  const [songOptionsOpen, setSongOptionsOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const { start, state } = useDownloads(currentSong);

  const previousVolumeRef = useRef(volume);

  // Toggle mute/unmute
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(previousVolumeRef.current || 50);
      setIsMuted(false);
    } else {
      previousVolumeRef.current = volume;
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume, setVolume]);

  // Browser fullscreen (F11 style)
  const toggleBrowserFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsBrowserFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsBrowserFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Update muted state when volume changes externally
  useEffect(() => {
    if (volume === 0 && !isMuted) {
      setIsMuted(true);
    } else if (volume > 0 && isMuted) {
      setIsMuted(false);
      previousVolumeRef.current = volume;
    }
  }, [volume, isMuted]);

  // Close song options when song changes
  useEffect(() => {
    setSongOptionsOpen(false);
    setContextMenuPos(null);
    setShowSongOptions(false);
  }, [currentSong?._id]);

  // Fullscreen handlers
  const openFullscreen = useCallback(() => {
    setIsFullscreen(true);
    setShowQueue(false);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setShowQueue(false);
    setShowSongOptions(false);
  }, []);

  // ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSongOptions) {
          setShowSongOptions(false);
        } else if (showQueue) {
          setShowQueue(false);
        } else if (isFullscreen) {
          closeFullscreen();
        }
      }
      if (e.key === "F11" && isFullscreen) {
        e.preventDefault();
        toggleBrowserFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, showQueue, showSongOptions, closeFullscreen, toggleBrowserFullscreen]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Seek handler
  const handleSeek = useCallback((newTime: number) => {
    setCurrentTime(newTime);
    const audio = document.querySelector("audio") as HTMLAudioElement | null;
    if (audio) audio.currentTime = newTime;
  }, [setCurrentTime]);

  // Volume handler
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
  }, [setVolume]);

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!currentSong) return;
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setSongOptionsOpen(true);
  }, [currentSong]);

  // Options menu in fullscreen
  const handleOptionsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOptionsPosition({ x: e.clientX, y: e.clientY });
    setShowSongOptions(true);
  }, []);

  return (
    <footer className="hidden sm:flex h-24 bg-zinc-900 border-t border-zinc-800 items-center px-4 mx-auto w-full">
      {/* Left: Song Info + Like */}
      <div
        className="flex items-center gap-4 min-w-[180px] w-[30%]"
        onContextMenu={handleContextMenu}
      >
        {currentSong ? (
          <>
            <img
              src={currentSong.imageUrl}
              alt={currentSong.title}
              className="w-14 h-14 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
              onClick={openFullscreen}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span 
                  className="font-medium truncate hover:underline cursor-pointer"
                  onClick={openFullscreen}
                >
                  {currentSong.title}
                </span>
                <LikeButton songId={currentSong._id} />
              </div>
              <span className="text-sm text-zinc-400 truncate hover:underline cursor-pointer block">
                {currentSong.artist}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4 opacity-50">
            <div className="w-14 h-14 bg-zinc-800 rounded-md" />
            <div>
              <div className="font-medium text-zinc-500">No song playing</div>
              <div className="text-sm text-zinc-600">Select a song to play</div>
            </div>
          </div>
        )}
      </div>

      {/* Center: Player Controls */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-[45%]">
        {/* Control Buttons */}
        <div className="flex items-center gap-4 lg:gap-5">
          <button
            className={cn(
              "p-1.5 rounded-full transition-colors relative",
              isShuffle
                ? "text-violet-400 hover:text-violet-300"
                : "text-zinc-400 hover:text-white",
              !currentSong && "opacity-40 cursor-not-allowed"
            )}
            onClick={toggleShuffle}
            disabled={!currentSong}
          >
            <Shuffle className="h-4 w-4" />
            {isShuffle && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-violet-400 rounded-full" />
            )}
          </button>

          <button
            onClick={playPrevious}
            disabled={!currentSong}
            className={cn(
              "p-1.5 text-zinc-400 hover:text-white transition-colors",
              !currentSong && "opacity-40 cursor-not-allowed"
            )}
          >
            <SkipBack className="h-4 w-4" fill="currentColor" />
          </button>

          <button
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center transition-all",
              currentSong
                ? "bg-white hover:bg-white/90 hover:scale-105 text-black"
                : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
            )}
            onClick={togglePlay}
            disabled={!currentSong}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" fill="currentColor" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
            )}
          </button>

          <button
            onClick={playNext}
            disabled={!currentSong}
            className={cn(
              "p-1.5 text-zinc-400 hover:text-white transition-colors",
              !currentSong && "opacity-40 cursor-not-allowed"
            )}
          >
            <SkipForward className="h-4 w-4" fill="currentColor" />
          </button>

          <button
            className={cn(
              "p-1.5 rounded-full transition-colors relative",
              isRepeat
                ? "text-violet-400 hover:text-violet-300"
                : "text-zinc-400 hover:text-white",
              !currentSong && "opacity-40 cursor-not-allowed"
            )}
            onClick={toggleRepeat}
            disabled={!currentSong}
          >
            <Repeat className="h-4 w-4" />
            {isRepeat && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-violet-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Progress Bar - Custom Slider */}
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-zinc-400 w-10 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          
          <ProgressSlider
            value={currentTime}
            max={duration || 100}
            onChange={handleSeek}
            disabled={!currentSong}
            className="flex-1"
            trackColor="bg-zinc-700"
            progressColor="bg-white/95"
          />
          
          <span className="text-xs text-zinc-400 w-10 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: Volume & Extra Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-[140px] sm:min-w-[160px] lg:min-w-[180px] w-[30%] justify-end">
        {/* Queue Toggle */}
        <button
          onClick={() => {
            if (isRightSidebarCollapsed) {
              setRightSidebarCollapsed(false);
              setSidePanelView("queue");
            } else {
              toggleSidePanelView();
            }
          }}
          className={cn(
            "p-2 rounded-lg transition-colors",
            sidePanelView === "queue" && !isRightSidebarCollapsed
              ? "text-violet-400 hover:text-violet-300"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <ListMusic className="h-4 w-4" />
        </button>

        {/* Sleep Timer */}
        <SleepTimer />

        {/* Volume Controls */}
        <div className="flex items-center gap-1.5">
          <button
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : volume < 50 ? (
              <Volume1 className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          
          <VolumeSlider
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 lg:w-24"
          />
        </div>

        {/* Fullscreen */}
        <button
          className={cn(
            "p-2 text-zinc-400 hover:text-white transition-colors",
            !currentSong && "opacity-40 cursor-not-allowed"
          )}
          onClick={openFullscreen}
          disabled={!currentSong}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* ==================== PREMIUM FULLSCREEN PLAYER ==================== */}
      <AnimatePresence>
        {isFullscreen && currentSong && (
          <motion.div
            key="fullscreen-player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] overflow-hidden"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentSong._id}
                src={currentSong.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                initial={{ scale: 1.05, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </AnimatePresence>
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/60 to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/70" />
            </div>

            {/* Main Content */}
            <div className="relative h-full flex flex-col z-[2]">
              {/* Top Bar */}
              <motion.header 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4"
              >
                <button
                  onClick={closeFullscreen}
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
                >
                  <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                  <span className="text-sm font-medium hidden sm:inline">Back</span>
                </button>

                <div className="absolute left-1/2 -translate-x-1/2 text-center hidden sm:block">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">
                    Now Playing
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowQueue(!showQueue)}
                    className={cn(
                      "flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-full text-sm font-medium transition-all",
                      showQueue 
                        ? "bg-white text-black" 
                        : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                    )}
                  >
                    <ListMusic className="w-4 h-4" />
                    <span className="hidden sm:inline">Queue</span>
                  </button>

                  <button
                    onClick={handleOptionsClick}
                    className="p-2 sm:p-2.5 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </motion.header>

              {/* Main Area */}
              <div className="flex-1 flex overflow-hidden">
                <motion.div 
                  className={cn(
                    "flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-16 pb-6 sm:pb-8",
                    "transition-all duration-300"
                  )}
                >
                  <div className={cn(
                    "flex items-center w-full transition-all duration-300",
                    showQueue 
                      ? "flex-col xl:flex-row gap-6 xl:gap-8 max-w-lg xl:max-w-none" 
                      : "flex-col lg:flex-row gap-6 lg:gap-10 xl:gap-11 max-w-5xl",
                    "mx-auto"
                  )}>
                    {/* Album Art */}
                    <motion.div
                      layout
                      className={cn(
                        "relative shrink-0 transition-all duration-300",
                        showQueue 
                          ? "w-44 h-44 lg:w-56 lg:h-56" 
                          : "w-56 h-56 lg:w-64 lg:h-64"
                      )}
                    >
                      <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl">
                        <img
                          src={currentSong.imageUrl}
                          alt={currentSong.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </motion.div>

                    {/* Song Info & Controls */}
                    <motion.div 
                      layout
                      className={cn(
                        "flex-1 min-w-0 space-y-4 sm:space-y-5 transition-all duration-300",
                        showQueue 
                          ? "text-center xl:text-left w-full xl:w-auto" 
                          : "text-center lg:text-left w-full lg:w-auto",
                        showQueue ? "max-w-md xl:max-w-md" : "max-w-lg xl:max-w-lg"
                      )}
                    >
                      {/* Song Details */}
                      <div className="space-y-1">
                        <motion.h1 
                          layout="position"
                          className={cn(
                            "truncate max-w-full font-bold text-white leading-tight",
                            showQueue 
                              ? "text-lg sm:text-xl xl:text-xl" 
                              : "text-xl sm:text-xl md:text-xl lg:text-2xl"
                          )}
                        >
                          {currentSong.title}
                        </motion.h1>
                        <motion.p 
                          layout="position"
                          className={cn(
                            "truncate max-w-full text-white/50 font-medium",
                            showQueue 
                              ? "text-sm xl:text-base" 
                              : "text-sm sm:text-base md:text-base"
                          )}
                        >
                          {currentSong.artist}
                        </motion.p>
                      </div>

                      {/* Progress Bar - Fullscreen */}
                      <div className={cn(
                        "space-y-2 w-full",
                        showQueue ? "max-w-sm xl:max-w-md mx-auto xl:mx-0" : "max-w-md lg:max-w-lg mx-auto lg:mx-0"
                      )}>
                        <ProgressSlider
                          value={currentTime}
                          max={duration || 100}
                          onChange={handleSeek}
                          className="h-1.5"
                          trackColor="bg-white/20"
                          progressColor="bg-white/95"
                        />
                        <div className="flex justify-between text-xs text-white/40 tabular-nums">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className={cn(
                        "flex items-center gap-4 sm:gap-5 lg:gap-8",
                        "justify-center"
                      )}>
                        <button
                          onClick={toggleShuffle}
                          className={cn(
                            "p-2 rounded-full transition-all relative",
                            isShuffle 
                              ? "text-violet-400" 
                              : "text-white/60 hover:text-white"
                          )}
                        >
                          <Shuffle className="w-5 h-5" />
                        </button>

                        <button
                          onClick={playPrevious}
                          className="p-2 text-white/70 hover:text-white transition-colors"
                        >
                          <SkipBack className="w-6 h-6" fill="currentColor" />
                        </button>

                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={togglePlay}
                          className={cn(
                            "rounded-full bg-white text-black flex items-center justify-center shadow-xl",
                            showQueue 
                              ? "w-14 h-14" 
                              : "w-14 h-14 lg:w-16 lg:h-16"
                          )}
                        >
                          {isPlaying ? (
                            <Pause className="w-6 h-6" fill="currentColor" />
                          ) : (
                            <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                          )}
                        </motion.button>

                        <button
                          onClick={playNext}
                          className="p-2 text-white/70 hover:text-white transition-colors"
                        >
                          <SkipForward className="w-6 h-6" fill="currentColor" />
                        </button>

                        <button
                          onClick={toggleRepeat}
                          className={cn(
                            "p-2 rounded-full transition-all relative",
                            isRepeat 
                              ? "text-violet-400" 
                              : "text-white/60 hover:text-white"
                          )}
                        >
                          <Repeat className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Extra Actions */}
                      <div className={cn(
                        "flex items-center gap-3 pt-1",
                        "justify-center lg:justify-start"
                      )}>
                        <LikeButton songId={currentSong._id} />
                        <button
                          onClick={start}
                          disabled={state === "downloading" || state === "completed"}
                          className={cn(
                            "p-2 transition-colors",
                            state === "completed"
                              ? "text-violet-400"
                              : "text-white/70 hover:text-white"
                          )}
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        
                        {/* Volume */}
                        <div className="hidden sm:flex items-center gap-2 ml-auto">
                          <button
                            onClick={toggleMute}
                            className="text-white/70 hover:text-white transition-colors"
                          >
                            {isMuted || volume === 0 ? (
                              <VolumeX className="w-5 h-5" />
                            ) : volume < 50 ? (
                              <Volume1 className="w-5 h-5" />
                            ) : (
                              <Volume2 className="w-5 h-5" />
                            )}
                          </button>
                          
                          <div className="w-20 lg:w-24">
                            <VolumeSlider
                              value={volume}
                              onChange={handleVolumeChange}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Queue Panel */}
                <AnimatePresence>
                  {showQueue && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 380, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ type: "spring", damping: 30, stiffness: 300 }}
                      className="h-full border-l border-white/5 overflow-hidden  backdrop-blur-xl shrink-0 hidden lg:block"
                    >
                      <div className="w-[380px] h-full">
                        <Queue />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile Queue */}
            <AnimatePresence>
              {showQueue && (
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 top-16 z-[10] backdrop-blur-md lg:hidden"
                >
                  <Queue />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Song Options Menu */}
            <AnimatePresence>
              {showSongOptions && (
                <SongOptionsMenu
                  isOpen={showSongOptions}
                  onClose={() => setShowSongOptions(false)}
                  song={currentSong}
                  position={optionsPosition}
                  onToggleFullscreen={toggleBrowserFullscreen}
                  isFullscreen={isBrowserFullscreen}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Context Menu */}
      {songOptionsOpen && currentSong && contextMenuPos && (
        <div
          className="fixed inset-0 z-[9999]"
          onClick={() => {
            setSongOptionsOpen(false);
            setContextMenuPos(null);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setSongOptionsOpen(false);
            setContextMenuPos(null);
          }}
        >
          <div
            className="bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl p-1 w-48"
            style={{
              position: "fixed",
              top: Math.min(contextMenuPos.y, window.innerHeight - 300),
              left: Math.min(contextMenuPos.x, window.innerWidth - 200),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <PlaybackControlsSongOptions
              song={currentSong}
              onClose={() => {
                setSongOptionsOpen(false);
                setContextMenuPos(null);
              }}
              variant="desktop"
            />
          </div>
        </div>
      )}
    </footer>
  );
};

export default PlaybackControls;