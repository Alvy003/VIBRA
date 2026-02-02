// src/pages/admin/components/SongsTable.tsx
import { Button } from "@/components/ui/button";
import { useMusicStore } from "@/stores/useMusicStore";
import { Trash2, Play, Loader } from "lucide-react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import SongOptions from "../../album/components/SongOptions";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { useLocation } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState, useEffect, memo } from "react";
import { cn } from "@/lib/utils";

interface SongsTableProps {
  songs?: any[];
  hideActions?: boolean;
}

// Skeleton row component
const SongRowSkeleton = memo(({ isMobile }: { isMobile: boolean }) => {
  if (isMobile) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="w-11 h-11 rounded-md bg-white/[0.08] animate-shimmer shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="h-3.5 w-[70%] max-w-[180px] rounded bg-white/[0.08] animate-shimmer" />
          <div className="h-2.5 w-[50%] max-w-[120px] rounded bg-white/[0.06] animate-shimmer" />
        </div>
        <div className="size-8 rounded-full bg-white/[0.04]" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2.5">
      <div className="w-10 flex justify-center">
        <div className="h-4 w-4 rounded bg-white/[0.06] animate-shimmer" />
      </div>
      <div className="w-10 h-10 rounded bg-white/[0.08] animate-shimmer shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 w-[60%] max-w-[200px] rounded bg-white/[0.08] animate-shimmer" />
      </div>
      <div className="flex-1 min-w-0 hidden sm:block">
        <div className="h-3.5 w-[50%] max-w-[150px] rounded bg-white/[0.06] animate-shimmer" />
      </div>
      <div className="w-10 flex justify-center">
        <div className="size-7 rounded-full bg-white/[0.04]" />
      </div>
      <div className="w-10 hidden sm:flex justify-center">
        <div className="size-7 rounded bg-white/[0.04]" />
      </div>
    </div>
  );
});

SongRowSkeleton.displayName = "SongRowSkeleton";

// Individual song row with loading state
const SongRow = memo(({
  song,
  index,
  isMobile,
  hideActions,
  isCurrentSong,
  isPlaying,
  onPlay,
  onDelete,
}: {
  song: any;
  index: number;
  isMobile: boolean;
  hideActions: boolean;
  isCurrentSong: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onDelete: () => void;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(() => {
      if (mounted) setIsReady(true);
    }, 30);

    const img = new Image();
    img.src = song.imageUrl;
    img.onload = () => {
      if (mounted) setImageLoaded(true);
    };
    img.onerror = () => {
      if (mounted) setImageLoaded(true);
    };

    return () => {
      mounted = false;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };
  }, [song.imageUrl, song._id]);

  const showContent = isReady && imageLoaded;

  if (!showContent) {
    return <SongRowSkeleton isMobile={isMobile} />;
  }

  // Mobile version - Clean, no delete button (it's in SongOptions)
  if (isMobile) {
    return (
      <div
        onClick={onPlay}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5",
          "active:bg-white/5 cursor-pointer",
          "animate-in fade-in-0 duration-150 rounded-xl",
          isCurrentSong && "bg-white/5"
        )}
      >
        <div className="relative w-11 h-11 shrink-0">
          <img
            src={song.imageUrl}
            alt={song.title}
            className="w-11 h-11 rounded-md object-cover"
          />
          {isCurrentSong && isPlaying && (
            <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
              <span className="text-violet-400 text-sm animate-pulse">♫</span>
            </div>
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className={cn(
            "text-sm font-medium line-clamp-1",
            isCurrentSong ? "text-violet-400" : "text-white"
          )}>
            {song.title}
          </div>
          <div className="text-xs text-zinc-400 line-clamp-1">{song.artist}</div>
        </div>

        <div
          className="flex items-center shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <SongOptions song={song} />
        </div>
      </div>
    );
  }

  // Desktop version - Proper grid layout
  return (
    <div
      onClick={onPlay}
      className={cn(
        "group flex items-center gap-4 px-4 py-2 rounded-md",
        "hover:bg-zinc-800/50 cursor-pointer",
        "animate-in fade-in-0 duration-150",
        isCurrentSong && "bg-zinc-800/30"
      )}
    >
      {/* Index / Play / Current */}
      <div className="w-10 flex justify-center shrink-0">
        <div className="relative flex items-center justify-center text-sm text-zinc-400 tabular-nums">
          {isCurrentSong && isPlaying ? (
            <span className="text-violet-400 animate-pulse">♫</span>
          ) : (
            <>
              <span className="group-hover:opacity-0 transition-opacity">{index + 1}</span>
              <Play className="absolute h-4 w-4 opacity-0 group-hover:opacity-100 text-white" fill="white" />
            </>
          )}
        </div>
      </div>

      {/* Image */}
      <div className="w-10 h-10 shrink-0">
        <img
          src={song.imageUrl}
          alt={song.title}
          className="w-full h-full rounded object-cover"
        />
      </div>

      {/* Title */}
      <div className={cn(
        "flex-1 text-base min-w-0 truncate",
        isCurrentSong ? "text-violet-400" : "text-white"
      )}>
        {song.title}
      </div>

      {/* Artist */}
      <div className="flex-1 text-base min-w-0 truncate text-zinc-400 hidden sm:block">
        {song.artist}
      </div>

      {/* Options */}
      <div className="w-10 flex justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
        <SongOptions song={song} />
      </div>

      {/* Delete - Desktop only, on hover */}
      {!hideActions && (
        <div className="w-10 hidden sm:flex justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

SongRow.displayName = "SongRow";

const SongsTable = ({ songs: overrideSongs, hideActions = false }: SongsTableProps) => {
  const { songs, isLoading, error, deleteSong } = useMusicStore();
  const { initializeQueue, currentSong, isPlaying } = usePlayerStore();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const location = useLocation();
  const { addRecentlyPlayedFromSearch } = usePreferencesStore();
  const isSearchPage = location.pathname === "/search";

  const renderSongs = overrideSongs ?? songs;

  const parentRef = useRef<HTMLDivElement>(null);

  const rowHeight = isMobile ? 64 : 56;

  const rowVirtualizer = useVirtualizer({
    count: renderSongs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  if (isLoading && !overrideSongs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (error && !overrideSongs) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (renderSongs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-500">No songs found</div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      // className={cn(
      //   "overflow-auto scrollbar-thin",
      //   isMobile ? "max-h-[calc(100vh-280px)]" : "max-h-[65vh]"
      // )}
    >
      {/* Header - Desktop only */}
      {!isMobile && (
        <div className={cn(
          "flex items-center gap-4 px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider",
          "border-b border-zinc-800/80 sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10"
        )}>
          <div className="w-10 text-center">#</div>
          <div className="w-10"></div>
          <div className="flex-1">Title</div>
          <div className="flex-1 hidden sm:block">Artist</div>
          <div className="w-10"></div>
          {!hideActions && <div className="w-10 hidden sm:block"></div>}
        </div>
      )}

      {/* Virtualized list */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const song = renderSongs[virtualRow.index];
          const isCurrentSong = currentSong?._id === song._id;

          return (
            <div
              key={song._id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <SongRow
                song={song}
                index={virtualRow.index}
                isMobile={isMobile}
                hideActions={hideActions}
                isCurrentSong={isCurrentSong}
                isPlaying={isPlaying}
                onPlay={() => {
                  if (isSearchPage) {
                    addRecentlyPlayedFromSearch(song);
                  }
                  initializeQueue(renderSongs, virtualRow.index, true);
                }}
                onDelete={() => deleteSong(song._id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SongsTable;