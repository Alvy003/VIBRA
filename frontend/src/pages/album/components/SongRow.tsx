// src/pages/album/components/SongRow.tsx
import { cn } from "@/lib/utils";
import { useState, useEffect, memo, useRef } from "react";
import { formatDuration } from "../AlbumPage";
import SongOptions from "./SongOptions";

interface Song {
  _id: string;
  title: string;
  artist: string;
  imageUrl: string;
  duration: number;
  createdAt?: string;
}

interface SongRowProps {
  song: Song;
  index: number;
  isCurrentSong: boolean;
  isPlaying: boolean;
  variant: "compact" | "medium" | "full";
  onPlay: (index: number) => void;
}

export const SongRow = memo(({ 
  song, 
  index, 
  isCurrentSong, 
  isPlaying,
  variant, 
  onPlay 
}: SongRowProps) => {
  const [isReady, setIsReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const mountedRef = useRef(false);

  // Simulate initial render delay + wait for image
  useEffect(() => {
    mountedRef.current = true;
    
    // Small delay to allow virtualization to settle
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setIsReady(true);
      }
    }, 50);

    // Preload image
    const img = new Image();
    img.src = song.imageUrl;
    img.onload = () => {
      if (mountedRef.current) {
        setImageLoaded(true);
      }
    };
    img.onerror = () => {
      if (mountedRef.current) {
        setImageLoaded(true); // Still show row on error
      }
    };

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };
  }, [song.imageUrl, song._id]);

  // Show skeleton until both ready AND image loaded
  const showContent = isReady && imageLoaded;

  // Skeleton state
  if (!showContent) {
    return <SkeletonContent variant={variant} />;
  }

  // Actual content
  if (variant === "compact") {
    return (
      <div
        onClick={() => onPlay(index)}
        className={cn(
          "group cursor-pointer rounded-lg h-full",
          "grid grid-cols-[1fr_36px] gap-2 px-2",
          "transition-all duration-200 ease-out",
          "hover:bg-white/5 active:bg-white/10",
          "animate-in fade-in-0 duration-200",
          isCurrentSong && "bg-white/5"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 py-2">
        <div className="relative shrink-0">
          <img
            src={song.imageUrl}
            alt={song.title}
            className="size-10 rounded object-cover shrink-0"
          />
          {isCurrentSong && isPlaying && (
              <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                <span className="text-violet-400 text-sm animate-pulse">♫</span>
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0 gap-0.5">
            <span
              className={cn(
                "font-medium truncate text-sm",
                isCurrentSong ? "text-violet-400" : "text-white"
              )}
            >
              {song.title}
            </span>
            <span className="text-[11px] text-zinc-400 truncate">
              {song.artist}
            </span>
          </div>
        </div>
        <div 
          className="flex items-center justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <SongOptions song={song} />
        </div>
      </div>
    );
  }

  if (variant === "medium") {
    return (
      <div
        onClick={() => onPlay(index)}
        className={cn(
          "group cursor-pointer rounded-lg h-full",
          "grid grid-cols-[1fr_50px_36px] gap-2 px-3 items-center",
          "transition-all duration-200 ease-out",
          "hover:bg-white/5 active:bg-white/10",
          "animate-in fade-in-0 duration-200",
          isCurrentSong && "bg-white/5"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 py-2">
        <div className="relative shrink-0">
          <img
            src={song.imageUrl}
            alt={song.title}
            className="size-10 rounded object-cover shrink-0"
          />
          {isCurrentSong && isPlaying && (
              <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                <span className="text-violet-400 text-sm animate-pulse">♫</span>
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0 gap-0.5">
            <span
              className={cn(
                "font-medium truncate text-sm",
                isCurrentSong ? "text-violet-400" : "text-white"
              )}
            >
              {song.title}
            </span>
            <span className="text-xs text-zinc-400 truncate">
              {song.artist}
            </span>
          </div>
        </div>
        <div className="text-zinc-400 text-xs">
          {formatDuration(song.duration)}
        </div>
        <div 
          className="flex items-center justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <SongOptions song={song} />
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div
      onClick={() => onPlay(index)}
      className={cn(
        "group cursor-pointer rounded-lg h-full",
        "grid grid-cols-[1fr_48px] md:grid-cols-[24px_4fr_2fr_minmax(60px,1fr)_48px]",
        "px-3 md:px-4 text-sm items-center gap-3",
        "transition-all duration-200 ease-out",
        "hover:bg-white/5 active:bg-white/10",
        "animate-in fade-in-0 duration-200",
        isCurrentSong && "bg-white/5"
      )}
    >
      <div className="hidden md:flex justify-center text-zinc-400">
        {isCurrentSong && isPlaying ? (
          <span className="text-violet-400 animate-pulse">♫</span>
        ) : (
          index + 1
        )}
      </div>

      <div className="flex items-center gap-3 min-w-0 py-2">
        <img
          src={song.imageUrl}
          alt={song.title}
          className="size-10 rounded object-cover shrink-0"
        />
        <div className="min-w-0">
          <span
            className={cn(
              "truncate block",
              isCurrentSong ? "text-violet-400" : "text-white"
            )}
          >
            {song.title}
          </span>
          <span className="text-xs text-zinc-400 truncate block">
            {song.artist}
          </span>
        </div>
      </div>

      <div className="hidden md:flex text-zinc-400 items-center">
        {song.createdAt?.split("T")[0]}
      </div>

      <div className="hidden md:flex text-zinc-400 items-center">
        {formatDuration(song.duration)}
      </div>

      <div 
        className="flex items-center justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        <SongOptions song={song} />
      </div>
    </div>
  );
});

SongRow.displayName = "SongRow";

// Inline skeleton for the row
const SkeletonContent = memo(({ variant }: { variant: "compact" | "medium" | "full" }) => {
  if (variant === "compact") {
    return (
      <div className="grid grid-cols-[1fr_36px] gap-2 px-2 h-full items-center">
        <div className="flex items-center gap-2.5 min-w-0 py-2">
          <div className="size-10 rounded bg-white/[0.08] animate-shimmer shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="h-3.5 w-[75%] rounded-sm bg-white/[0.08] animate-shimmer" />
            <div className="h-2.5 w-[55%] rounded-sm bg-white/[0.06] animate-shimmer" />
          </div>
        </div>
        <div className="size-7 rounded-full bg-white/[0.04]" />
      </div>
    );
  }

  if (variant === "medium") {
    return (
      <div className="grid grid-cols-[1fr_50px_36px] gap-2 px-3 h-full items-center">
        <div className="flex items-center gap-2.5 min-w-0 py-2">
          <div className="size-10 rounded bg-white/[0.08] animate-shimmer shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="h-3.5 w-[70%] rounded-sm bg-white/[0.08] animate-shimmer" />
            <div className="h-2.5 w-[50%] rounded-sm bg-white/[0.06] animate-shimmer" />
          </div>
        </div>
        <div className="h-3 w-9 rounded-sm bg-white/[0.06] animate-shimmer" />
        <div className="size-7 rounded-full bg-white/[0.04]" />
      </div>
    );
  }

  // Full
  return (
    <div className="grid grid-cols-[1fr_48px] md:grid-cols-[24px_4fr_2fr_minmax(60px,1fr)_48px] px-3 md:px-4 gap-3 h-full items-center">
      <div className="hidden md:flex justify-center">
        <div className="h-4 w-4 rounded-sm bg-white/[0.06] animate-shimmer" />
      </div>
      <div className="flex items-center gap-3 min-w-0 py-2">
        <div className="size-10 rounded bg-white/[0.08] animate-shimmer shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="h-3.5 w-[65%] rounded-sm bg-white/[0.08] animate-shimmer" />
          <div className="h-2.5 w-[40%] rounded-sm bg-white/[0.06] animate-shimmer" />
        </div>
      </div>
      <div className="hidden md:flex">
        <div className="h-3 w-20 rounded-sm bg-white/[0.06] animate-shimmer" />
      </div>
      <div className="hidden md:flex">
        <div className="h-3 w-9 rounded-sm bg-white/[0.06] animate-shimmer" />
      </div>
      <div className="size-7 rounded-full bg-white/[0.04]" />
    </div>
  );
});

SkeletonContent.displayName = "SkeletonContent";