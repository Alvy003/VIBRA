// src/pages/album/AlbumPage.tsx
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { ChevronLeft, Clock, Pause, Play, Shuffle, Pencil } from "lucide-react";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import { useImageColors } from "@/hooks/useImageColors";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import EditAlbumDialog from "@/components/EditAlbumDialog";
import { AlbumCover } from "./components/AlbumCover";
import { AlbumCoverSmall } from "./components/AlbumCoverSmall";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SongSkeletonRow } from "./components/SongSkeletonRow";
import { SongRow } from "./components/SongRow";

export const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// Custom hook for responsive width detection
const useContentWidth = () => {
  const [contentWidth, setContentWidth] = useState<'compact' | 'medium' | 'full'>('full');
  const containerRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        if (width < 500) {
          setContentWidth('compact');
        } else if (width < 700) {
          setContentWidth('medium');
        } else {
          setContentWidth('full');
        }
      }
    };

    checkWidth();

    observerRef.current = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width < 500) {
            setContentWidth('compact');
          } else if (width < 700) {
            setContentWidth('medium');
          } else {
            setContentWidth('full');
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

  const setContainerRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current && containerRef.current) {
      observerRef.current.unobserve(containerRef.current);
    }
    containerRef.current = node;
    if (observerRef.current && node) {
      observerRef.current.observe(node);
    }
  }, []);

  return { contentWidth, containerRef, setContainerRef };
};

const AlbumPage = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();
  const { fetchAlbumById, currentAlbum, isLoading } = useMusicStore();
  const { currentSong, isPlaying, playAlbum, togglePlay, isShuffle, toggleShuffle } = usePlayerStore();
  const { contentWidth, setContainerRef } = useContentWidth();
  const { isAdmin } = useAuthStore();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const colorSourceImage = useMemo(() => {
    if (currentAlbum?.songs?.[0]?.imageUrl) {
      return currentAlbum.songs[0].imageUrl;
    }
    return currentAlbum?.imageUrl;
  }, [currentAlbum]);

  const colors = useImageColors(colorSourceImage);

  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (albumId) fetchAlbumById(albumId);
  }, [fetchAlbumById, albumId]);

  useEffect(() => {
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const threshold = contentWidth === 'compact' ? 260 : contentWidth === 'medium' ? 300 : 340;
      setShowStickyHeader(scrollContainer.scrollTop > threshold);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [currentAlbum, contentWidth]);

  const handleShuffleToggle = useCallback(() => {
    toggleShuffle();
  }, [toggleShuffle]);

  const handlePlayAlbum = useCallback(() => {
    if (!currentAlbum) return;
    const isCurrentAlbumPlaying = currentAlbum?.songs.some(
      (song) => song._id === currentSong?._id
    );
    if (isCurrentAlbumPlaying) {
      togglePlay();
    } else {
      if (isShuffle) {
        const shuffledSongs = [...currentAlbum.songs];
        for (let i = shuffledSongs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledSongs[i], shuffledSongs[j]] = [shuffledSongs[j], shuffledSongs[i]];
        }
        playAlbum(shuffledSongs, 0);
      } else {
        playAlbum(currentAlbum?.songs, 0);
      }
    }
  }, [currentAlbum, currentSong, isShuffle, playAlbum, togglePlay]);

  const handlePlaySong = useCallback((index: number) => {
    if (!currentAlbum) return;
    playAlbum(currentAlbum?.songs, index);
  }, [currentAlbum, playAlbum]);

  const isAlbumPlaying = currentAlbum?.songs.some((song) => song._id === currentSong?._id) && isPlaying;

  const isCompact = contentWidth === 'compact';
  const isMedium = contentWidth === 'medium';
  const showFullDetails = contentWidth === 'full';
  const variant = isCompact ? "compact" : isMedium ? "medium" : "full";

  const rowHeight = contentWidth === "compact" ? 56 : contentWidth === "medium" ? 64 : 72;

  // Calculate how many skeleton rows we need to fill the viewport
  const songCount = currentAlbum?.songs.length ?? 0;

  const songsVirtualizer = useVirtualizer({
    count: songCount,
    overscan: 5,
    estimateSize: () => rowHeight,
    getScrollElement: () =>
      scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') ?? null,
  });

  useEffect(() => {
    songsVirtualizer.measure();
  }, [contentWidth, songsVirtualizer]);

  return (
    <main
      ref={setContainerRef}
      className="h-full rounded-lg overflow-hidden relative"
    >
      {isLoading ? (
        // Initial loading state - show full skeleton page
        <div className="h-full bg-zinc-900 overflow-hidden">
          {/* Skeleton header */}
          <div className="p-6 flex flex-col items-center gap-4 md:flex-row md:items-end">
            <div className={cn(
              "rounded-lg bg-white/[0.06] animate-shimmer",
              isCompact ? "w-[180px] h-[180px]" : "w-[200px] h-[200px]"
            )} />
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="h-3 w-16 rounded bg-white/[0.06] animate-shimmer" />
              <div className="h-10 w-48 rounded bg-white/[0.06] animate-shimmer" />
              <div className="h-4 w-32 rounded bg-white/[0.06] animate-shimmer" />
            </div>
          </div>
          
          {/* Skeleton action bar */}
          <div className="px-6 pb-4 flex items-center gap-3 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] animate-shimmer" />
            <div className="w-14 h-14 rounded-full bg-white/[0.06] animate-shimmer" />
          </div>
          
          {/* Skeleton song rows */}
          <div className="px-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <SongSkeletonRow key={i} variant={variant} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Sticky Header */}
          <div
            className={cn(
              "absolute top-0 left-0 right-0 z-30 transition-all duration-300 ease-out",
              showStickyHeader
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-full pointer-events-none"
            )}
          >
            <div
              className="border-b border-white/5"
              style={{
                backgroundColor: colors.primary === "transparent"
                  ? "rgb(24, 24, 27)"
                  : colors.secondary
              }}
            >
              <div className={cn(
                "flex items-center gap-2 px-3 py-2.5 transition-all duration-300",
                !isCompact && "gap-3 px-4 py-3"
              )}>
                <button
                  onClick={() => navigate(-1)}
                  className="md:hidden p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors shrink-0"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className={cn(
                      "shrink-0 overflow-hidden rounded",
                      isCompact ? "w-8 h-8" : "w-9 h-9"
                    )}
                  >
                    <AlbumCoverSmall
                      songs={currentAlbum?.songs}
                      imageUrl={currentAlbum?.imageUrl}
                    />
                  </div>

                  <span
                    className={cn(
                      "font-semibold text-white truncate",
                      isCompact && "text-sm"
                    )}
                  >
                    {currentAlbum?.title}
                  </span>
                </div>

                <Button
                  onClick={handleShuffleToggle}
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "rounded-full shrink-0 transition-all duration-300",
                    isShuffle ? "text-violet-400 bg-violet-500/20" : "text-white/70 hover:text-white",
                    isCompact ? "w-8 h-8" : "w-9 h-9"
                  )}
                >
                  <Shuffle className={cn(
                    "transition-all duration-300",
                    isCompact ? "h-4 w-4" : "h-5 w-5"
                  )} />
                </Button>

                <Button
                  onClick={handlePlayAlbum}
                  size="icon"
                  className={cn(
                    "rounded-full bg-violet-600/90 hover:bg-violet-500 flex items-center justify-center shadow-xl shrink-0",
                    "transition-all duration-300 hover:scale-105 active:scale-95",
                    isCompact ? "w-9 h-9" : "w-10 h-10"
                  )}
                >
                  {isAlbumPlaying ? (
                    <Pause className={cn("text-black", isCompact ? "h-4 w-4" : "h-5 w-5")} fill="black" />
                  ) : (
                    <Play className={cn("text-black ml-0.5", isCompact ? "h-4 w-4" : "h-5 w-5")} fill="black" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea ref={scrollRef} className="h-[calc(100vh-8px)] lg:h-full">
            <div className="relative min-h-full">
              {/* Gradient Hero */}
              <div
                className="absolute inset-x-0 top-0 pointer-events-none"
                style={{
                  height: "calc(var(--album-hero-height, 420px))",
                  background: `
                    linear-gradient(
                      180deg,
                      ${colors.primary} 0%,
                      ${colors.secondary} 40%,
                      rgba(24,24,27,0.95) 69%,
                      rgb(24,24,27) 100%
                    )
                  `,
                }}
              />

              {/* Base background for songs area */}
              <div className="absolute inset-0 bg-zinc-900 -z-10" />

              <div className="relative z-10">
                {/* Back Button - Mobile */}
                <div className="md:hidden sticky top-0 z-20 p-3">
                  <button
                    onClick={() => navigate(-1)}
                    className={cn(
                      "p-2 rounded-full bg-black/40 backdrop-blur-sm active:bg-white/10 transition-all duration-300",
                      showStickyHeader && "opacity-0 pointer-events-none"
                    )}
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Album Header */}
                <div className={cn(
                  "flex flex-col items-center gap-4 pb-6 -mt-12 md:mt-0 transition-all duration-300 ease-out",
                  isCompact ? "p-4" : isMedium ? "p-5" : "p-6",
                  showFullDetails && "md:flex-row md:items-end md:gap-6 md:pb-8"
                )}>
                  <div
                    className="shrink-0 transition-all duration-500 ease-out"
                    style={{
                      boxShadow: colors.primary === "transparent"
                        ? "0 25px 50px -12px rgba(0,0,0,0.5)"
                        : `0 25px 50px -12px ${colors.primary}60`,
                    }}
                  >
                    <AlbumCover
                      songs={currentAlbum?.songs}
                      imageUrl={currentAlbum?.imageUrl}
                      className={cn(
                        "shadow-2xl transition-all duration-300 ease-out",
                        isCompact ? "w-[180px] h-[180px]" :
                        isMedium ? "w-[180px] h-[180px]" :
                        "w-[220px] h-[220px] md:w-[200px] md:h-[200px]"
                      )}
                    />
                  </div>
                  
                  <div className={cn(
                    "flex flex-col text-center transition-all duration-300 ease-out",
                    showFullDetails && "md:ml-4 md:text-left md:justify-end"
                  )}>
                    <p className={cn(
                      "font-semibold uppercase tracking-widest text-white/60 transition-all duration-300",
                      isCompact ? "text-[10px]" : "text-xs"
                    )}>
                      Album
                    </p>
                    <h1 className={cn(
                      "font-bold my-2 text-white leading-tight transition-all duration-300 ease-out",
                      isCompact ? "text-xl" :
                      isMedium ? "text-2xl" :
                      "text-3xl sm:text-4xl md:text-5xl lg:text-6xl md:my-3"
                    )}>
                      {currentAlbum?.title}
                    </h1>
                    <div className={cn(
                      "flex flex-wrap items-center justify-center gap-1.5 text-white/70 transition-all duration-300",
                      showFullDetails && "md:justify-start",
                      isCompact ? "text-xs" : "text-sm"
                    )}>
                      <span className="font-semibold text-white/90">{currentAlbum?.artist}</span>
                      <span className="text-white/40">•</span>
                      <span>{currentAlbum?.releaseYear}</span>
                      <span className="text-white/40">•</span>
                      <span>{currentAlbum?.songs.length} songs</span>
                      <span className="text-white/40">•</span>
                      <span>By Vibra</span>
                    </div>
                  </div>
                </div>

                {/* Transition Scrim */}
                <div className="relative h-16 -mt-8 z-10">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900" />
                </div>

                {/* Action Bar */}
                <div className={cn(
                  "pb-4 flex items-center gap-3 transition-all duration-300 ease-out",
                  isCompact ? "px-4 justify-center" :
                  isMedium ? "px-5 justify-center" :
                  "px-6 justify-center md:justify-start"
                )}>
                  <Button
                    onClick={handleShuffleToggle}
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "rounded-full border transition-all duration-300 ease-out",
                      isShuffle
                        ? "border-violet-500/50 text-violet-400 bg-violet-500/20"
                        : "border-white/20 text-white/70 hover:text-white hover:border-white/40",
                      isCompact ? "w-10 h-10" : "w-12 h-12"
                    )}
                    title={isShuffle ? "Shuffle enabled" : "Enable shuffle"}
                  >
                    <Shuffle className={cn(
                      "transition-all duration-300",
                      isCompact ? "h-4 w-4" : "h-5 w-5"
                    )} />
                  </Button>

                  <Button
                    onClick={handlePlayAlbum}
                    size="icon"
                    className={cn(
                      "rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center shadow-xl",
                      "transition-all duration-300 ease-out hover:scale-105 active:scale-95",
                      isCompact ? "w-12 h-12" : "w-14 h-14"
                    )}
                  >
                    {isAlbumPlaying ? (
                      <Pause className={cn("text-black", isCompact ? "h-5 w-5" : "h-7 w-7")} fill="black" />
                    ) : (
                      <Play className={cn("text-black ml-0.5", isCompact ? "h-5 w-5" : "h-7 w-7")} fill="black" />
                    )}
                  </Button>

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditDialogOpen(true)}
                      className={cn(
                        "rounded-full border transition-all duration-300 ease-out border-white/20 text-white/70 hover:text-white hover:border-white/40",
                        isCompact ? "w-10 h-10" : "w-12 h-12"
                      )}
                    >
                      <Pencil className={cn(
                        "text-white/70",
                        isCompact ? "h-4 w-4" : "h-5 w-5"
                      )} />
                    </Button>
                  )}
                </div>

                {currentAlbum && isAdmin && (
                  <EditAlbumDialog
                    isOpen={editDialogOpen}
                    onClose={() => setEditDialogOpen(false)}
                    album={currentAlbum}
                  />
                )}

                {/* Songs Section */}
                <div className="relative min-h-[50vh]">
                  <div className="absolute inset-0 bg-zinc-900" />
                  <div className="relative">
                    {/* Table Header - Full width only */}
                    {showFullDetails && (
                      <div className="hidden md:grid grid-cols-[24px_4fr_2fr_minmax(60px,1fr)_48px] gap-4 px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                        <div className="text-center">#</div>
                        <div>Title</div>
                        <div>Release Date</div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div></div>
                      </div>
                    )}

                    {/* Virtualized Songs List */}
                    <div
                      className={cn(
                        "relative transition-all duration-300 ease-out",
                        isCompact ? "px-1" : isMedium ? "px-2" : "px-2 md:px-4"
                      )}
                    >
                      <div
                        style={{
                          height: `${songsVirtualizer.getTotalSize()}px`,
                          position: "relative",
                        }}
                      >
                        {songsVirtualizer.getVirtualItems().map((virtualRow) => {
                          const index = virtualRow.index;
                          const song = currentAlbum?.songs[index];
                          const isCurrentSong = !!song && currentSong?._id === song._id;

                          return (
                            <div
                              key={virtualRow.key}
                              data-index={virtualRow.index}
                              ref={songsVirtualizer.measureElement}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                            >
                              {song && (
                                <SongRow
                                  song={song}
                                  index={index}
                                  isCurrentSong={isCurrentSong}
                                  isPlaying={isPlaying}
                                  variant={variant}
                                  onPlay={handlePlaySong}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <MobileOverlaySpacer />
            </div>
          </ScrollArea>
        </>
      )}
    </main>
  );
};

export default AlbumPage;