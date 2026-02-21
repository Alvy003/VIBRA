import { useRef, useState, useCallback, useEffect } from "react";
import {
  Music, X, Check,
  Loader2, AlertCircle,
  Globe,
  AlertTriangle, SkipForward, CheckCircle2, XCircle,
  Film, Languages, ThumbsUp, ThumbsDown,
  Keyboard, Ban, Info, Play, Pause,
  Volume2, VolumeX, Monitor, Sparkles, Disc3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import toast from "react-hot-toast";

import {
  CLOUD_PROVIDERS_UI,
} from "./constants";
import type {
  CloudProviderId,
  MetadataWarning,
  MetadataResult,
  AlbumSuggestion,
  QueuedSong,
} from "./constants";
import { formatDuration, formatFileSize } from "./utils";

// ============================================================================
// MOBILE BLOCK SCREEN
// ============================================================================

export const MobileBlockScreen = () => (
  <div className="fixed inset-0 z-50 bg-zinc-900 flex items-center justify-center p-6 sm:hidden">
    <div className="text-center space-y-4 max-w-sm">
      <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto">
        <Monitor className="w-8 h-8 text-violet-400" />
      </div>
      <h2 className="text-xl font-bold text-white">Desktop Required</h2>
      <p className="text-zinc-400 text-sm">
        The music upload feature requires a larger screen for the best experience.
        Please use a desktop or laptop computer to add songs.
      </p>
      <div className="pt-4">
        <div className="inline-flex items-center gap-2 text-xs text-zinc-500 bg-zinc-800 px-3 py-2 rounded-full">
          <Monitor className="w-3.5 h-3.5" />
          Minimum width: 640px
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// BADGES
// ============================================================================

export const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  const percent = Math.round(confidence * 100);

  let color = "bg-green-500/20 text-green-400 border-green-500/30";
  let icon = <ThumbsUp className="w-3 h-3" />;

  if (confidence < 0.5) {
    color = "bg-red-500/20 text-red-400 border-red-500/30";
    icon = <ThumbsDown className="w-3 h-3" />;
  } else if (confidence < 0.75) {
    color = "bg-amber-500/20 text-amber-400 border-amber-500/30";
    icon = <AlertCircle className="w-3 h-3" />;
  }

  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0", color)}>
      {icon}
      {percent}%
    </span>
  );
};

export const WarningBadge = ({ warning }: { warning: MetadataWarning }) => {
  const config: Record<MetadataWarning, { icon: typeof AlertCircle; label: string; color: string }> = {
    non_latin: { icon: Languages, label: "Foreign", color: "bg-purple-500/20 text-purple-400" },
    soundtrack: { icon: Film, label: "Soundtrack", color: "bg-blue-500/20 text-blue-400" },
    low_confidence: { icon: AlertCircle, label: "Low Match", color: "bg-amber-500/20 text-amber-400" },
    mismatch_filename: { icon: XCircle, label: "Mismatch", color: "bg-red-500/20 text-red-400" },
    possible_cover: { icon: Music, label: "Cover?", color: "bg-cyan-500/20 text-cyan-400" },
    generic_title: { icon: Info, label: "Generic", color: "bg-zinc-500/20 text-zinc-400" },
    generic_artist: { icon: AlertTriangle, label: "Changed Artist", color: "bg-orange-500/20 text-orange-400" },
  };

  const { icon: Icon, label, color } = config[warning];

  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0", color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

export const SourceBadge = ({ source }: { source: MetadataResult["source"] }) => {
  const config: Record<string, { label: string; color: string }> = {
    itunes: { label: "iTunes", color: "bg-pink-500/20 text-pink-400" },
    musicbrainz: { label: "MusicBrainz", color: "bg-orange-500/20 text-orange-400" },
    deezer: { label: "Deezer", color: "bg-purple-500/20 text-purple-400" },
    filename: { label: "Filename", color: "bg-zinc-500/20 text-zinc-400" },
  };

  const { label, color } = config[source];

  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0", color)}>
      {label}
    </span>
  );
};

// ============================================================================
// CLOUD PROVIDER SELECTOR
// ============================================================================

export const CloudProviderSelector = ({
  selected,
  onChange,
}: {
  selected: CloudProviderId;
  onChange: (provider: CloudProviderId) => void;
}) => {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-violet-400" />
        Cloud Storage
      </label>
      <div className="grid grid-cols-2 gap-2">
        {CLOUD_PROVIDERS_UI.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => onChange(provider.id)}
            className={cn(
              "relative flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all text-left",
              selected === provider.id
                ? `${provider.activeColor} shadow-sm`
                : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
            )}
          >
            {provider.recommended && (
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-green-800 text-white text-[8px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                Recommended
              </span>
            )}
            <span className="text-lg shrink-0">{provider.icon}</span>
            <div className="min-w-0">
              <p className={cn("text-xs font-semibold", selected === provider.id ? "text-white" : "text-zinc-300")}>
                {provider.name}
              </p>
            </div>
            {selected === provider.id && (
              <Check className="w-4 h-4 text-green-400 shrink-0 ml-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// ALBUM SUGGESTION PANEL
// ============================================================================

export const AlbumSuggestionChips = ({
  suggestions,
  selectedAlbum,
  onSelectAlbum,
}: {
  suggestions: AlbumSuggestion[];
  selectedAlbum: string;
  onSelectAlbum: (albumId: string) => void;
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        Suggested playlists
      </p>
      <div className="flex gap-2">
        {suggestions.map((suggestion) => {
          const isSelected = suggestion.albumId === selectedAlbum;

          return (
            <button
              key={suggestion.albumId}
              type="button"
              onClick={() => onSelectAlbum(suggestion.albumId)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left flex-1 min-w-0",
                isSelected
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
              )}
            >
              <Disc3 className={cn("w-4 h-4 shrink-0", isSelected ? "text-violet-400" : "text-zinc-500")} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white line-clamp-1">{suggestion.albumTitle}</p>
                <p className="text-[10px] text-zinc-500 line-clamp-1">
                  {suggestion.reason}
                  {suggestion.songCount !== undefined && (
                    <span className="text-zinc-600"> · {suggestion.songCount} songs</span>
                  )}
                </p>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// AUDIO PLAYER
// ============================================================================

export const AudioPlayer = ({
  audioUrl,
  title,
  artist,
  imageUrl,
}: {
  audioUrl: string | null;
  title: string;
  artist: string;
  imageUrl: string | null;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const vol = value[0];
    setVolume(vol);
    audioRef.current.volume = vol;
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.7;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  if (!audioUrl) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
          <Music className="w-4 h-4" />
          <span>No audio to preview</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 rounded-xl p-3 border border-zinc-700/50 space-y-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0 ring-1 ring-zinc-700">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-5 h-5 text-zinc-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-white line-clamp-1">{title || "Untitled"}</p>
          <p className="text-xs text-zinc-400 line-clamp-1">{artist || "Unknown Artist"}</p>
        </div>

        <button
          onClick={togglePlay}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
            isPlaying
              ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
              : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
          )}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
      </div>

      <div className="space-y-1">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-zinc-500">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={toggleMute} className="p-1 text-zinc-400 hover:text-white transition-colors">
          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="w-24 cursor-pointer"
        />
      </div>
    </div>
  );
};

// ============================================================================
// DROP ZONE
// ============================================================================

export const DropZone = ({
  onFileDrop,
  accept,
  file,
  onClear,
  icon: Icon,
  label,
  sublabel,
  preview,
  isLoading,
  error,
  maxSize,
  className,
}: {
  onFileDrop: (file: File) => void;
  accept: string;
  file: File | null;
  onClear: () => void;
  icon: typeof Music;
  label: string;
  sublabel: string;
  preview?: string | null;
  isLoading?: boolean;
  error?: string | null;
  maxSize: number;
  className?: string;
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.size > maxSize) {
        toast.error(`File too large. Max: ${formatFileSize(maxSize)}`);
        return;
      }
      onFileDrop(droppedFile);
    }
  }, [onFileDrop, maxSize]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > maxSize) {
        toast.error(`File too large. Max: ${formatFileSize(maxSize)}`);
        e.target.value = "";
        return;
      }
      onFileDrop(selectedFile);
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden",
        error
          ? "border-red-500/50 bg-red-500/5"
          : isDragOver
          ? "border-violet-500 bg-violet-500/10"
          : file
          ? "border-violet-500/50 bg-violet-500/5"
          : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/30",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {file ? (
        <div className="p-2.5 flex items-center gap-2.5">
          {preview ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-violet-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white line-clamp-1">{file.name}</p>
            <p className="text-[10px] text-zinc-400">{formatFileSize(file.size)}</p>
          </div>
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 rounded-full hover:bg-zinc-700 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}
        </div>
      ) : (
        <div className="p-3 flex flex-col items-center justify-center text-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors",
            isDragOver ? "bg-violet-500/20" : "bg-zinc-800"
          )}>
            <Icon className={cn("w-4 h-4", isDragOver ? "text-violet-400" : "text-zinc-400")} />
          </div>
          <p className="text-xs font-medium text-zinc-300">{label}</p>
          <p className="text-[10px] text-zinc-500">{sublabel}</p>
          <p className="text-[9px] text-zinc-600 mt-0.5">Max: {formatFileSize(maxSize)}</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// QUEUE ITEM
// ============================================================================

export const QueueItem = ({
  item,
  isActive,
  onClick,
  onRemove,
}: {
  item: QueuedSong;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
}) => (
  <div
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all",
      isActive
        ? "bg-violet-500/20 border border-violet-500/50"
        : item.status === "success"
        ? "bg-green-500/10 border border-green-500/30"
        : item.status === "error"
        ? "bg-red-500/10 border border-red-500/30"
        : item.status === "skipped"
        ? "bg-zinc-700/30 border border-zinc-700/50 opacity-50"
        : "bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800"
    )}
  >
    <div className="w-8 h-8 rounded overflow-hidden bg-zinc-800 shrink-0">
      {item.imagePreview ? (
        <img src={item.imagePreview} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Music className="w-3 h-3 text-zinc-500" />
        </div>
      )}
    </div>

    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-medium text-white line-clamp-1">
        {item.metadata.title || "Untitled"}
      </p>
      <p className="text-[9px] text-zinc-400 line-clamp-1">
        {item.metadata.artist || "Unknown"}
      </p>
      {(item.metadata.language || item.metadata.mood) && (
        <div className="flex gap-1 mt-0.5">
          {item.metadata.language && (
            <span className="text-[8px] px-1 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
              {item.metadata.language}
            </span>
          )}
          {item.metadata.mood && (
            <span className="text-[8px] px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded">
              {item.metadata.mood}
            </span>
          )}
        </div>
      )}
    </div>

    <div className="shrink-0 flex items-center gap-1">
      <span className="text-[9px]" title={item.cloud === "imagekit" ? "ImageKit" : "Cloudinary"}>
        {item.cloud === "imagekit" ? "🚀" : "☁️"}
      </span>

      {item.isDuplicate && item.status === "pending" && (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
      )}
      {item.status === "processing" && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
      {item.status === "uploading" && <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />}
      {item.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
      {item.status === "error" && <XCircle className="w-3.5 h-3.5 text-red-400" />}
      {item.status === "skipped" && <Ban className="w-3.5 h-3.5 text-zinc-500" />}
      {item.status === "pending" && !item.isDuplicate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 rounded hover:bg-zinc-700 transition-colors"
        >
          <X className="w-3 h-3 text-zinc-400" />
        </button>
      )}
    </div>
  </div>
);

// ============================================================================
// DUPLICATE WARNING
// ============================================================================

export const DuplicateWarning = ({
  duplicateInfo,
  onIgnore,
  onSkip,
}: {
  duplicateInfo: { title: string; artist: string };
  onIgnore: () => void;
  onSkip: () => void;
}) => (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 space-y-2">
    <div className="flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-300">Possible Duplicate</p>
        <p className="text-xs text-amber-400/80 mt-0.5 line-clamp-1">
          Found: "{duplicateInfo.title}" by {duplicateInfo.artist}
        </p>
      </div>
    </div>
    <div className="flex gap-2 ml-6">
      <Button
        size="sm"
        variant="outline"
        onClick={onSkip}
        className="h-6 text-[10px] border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
      >
        <SkipForward className="w-3 h-3 mr-1" />
        Skip
      </Button>
      <Button
        size="sm"
        onClick={onIgnore}
        className="h-6 text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
      >
        Add Anyway
      </Button>
    </div>
  </div>
);

// ============================================================================
// KEYBOARD SHORTCUTS HELP
// ============================================================================

export const KeyboardShortcutsHelp = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button tabIndex={-1} className="p-1.5 rounded-lg mt-6 hover:bg-zinc-800 transition-colors">
          <Keyboard className="w-4 h-4 text-zinc-500" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="bg-zinc-900 border-zinc-800 p-3 max-w-xs">
        <p className="font-medium text-white text-sm mb-2">Keyboard Shortcuts</p>
        <div className="space-y-1 text-xs text-zinc-400">
          <div className="flex justify-between gap-4">
            <span>Enter</span>
            <span className="text-zinc-500">Add Song</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>← →</span>
            <span className="text-zinc-500">Navigate Queue</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>S</span>
            <span className="text-zinc-500">Skip Current</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Ctrl+Z</span>
            <span className="text-zinc-500">Undo</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>1-5</span>
            <span className="text-zinc-500">Select Result</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Space</span>
            <span className="text-zinc-500">Play/Pause Preview</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);