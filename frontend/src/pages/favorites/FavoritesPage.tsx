// src/pages/favorites/FavoritesPage.tsx
import { useUser } from "@clerk/clerk-react";
import { Heart, Play, Pause, Clock, ChevronLeft, Shuffle } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import SongOptions from "@/pages/album/components/SongOptions";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { formatDuration } from "@/pages/album/AlbumPage";
import { cn } from "@/lib/utils";
import { axiosInstance } from "@/lib/axios";

// Violet color constants for Favorites page
const FAVORITES_COLORS = {
  primary: "rgb(139, 92, 246)",    // violet-500
  secondary: "rgb(76, 29, 149)",   // violet-900
};

// Improved custom hook with better ResizeObserver handling
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

    // Initial check
    checkWidth();

    // Create observer
    observerRef.current = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to avoid layout thrashing
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

    // Also listen to window resize as fallback
    window.addEventListener('resize', checkWidth);

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener('resize', checkWidth);
    };
  }, []);

  // Re-observe when ref changes
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

const FavoritesPage = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const navigate = useNavigate();
  const { likedSongs, fetchLikedSongs } = useMusicStore();
  const { currentSong, isPlaying, playAlbum, togglePlay, isShuffle, toggleShuffle } = usePlayerStore();
  const { contentWidth, setContainerRef } = useContentWidth();

  // Scroll state for sticky header
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchLikedSongs();
    }
  }, [isLoaded, isSignedIn, fetchLikedSongs]);

  // Handle scroll to show/hide sticky header
  useEffect(() => {
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const threshold = contentWidth === 'compact' ? 260 : contentWidth === 'medium' ? 300 : 340;
      setShowStickyHeader(scrollContainer.scrollTop > threshold);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [contentWidth]);

  // Shuffle toggle handler - ONLY toggles shuffle state, doesn't play
  const handleShuffleToggle = useCallback(() => {
    toggleShuffle();
  }, [toggleShuffle]);

  const hasFavourites = likedSongs && likedSongs.length > 0;
  const isPlayingFavorites = likedSongs?.some((song) => {
    const id = song._id || (song as any).externalId;
    const currentId = currentSong?._id || (currentSong as any)?.externalId;
    return id === currentId;
  }) && isPlaying;

  const handlePlayAll = useCallback(() => {
    if (!hasFavourites) return;
    const isCurrentlyPlayingFavorites = likedSongs.some((song) => {
      const id = song._id || (song as any).externalId;
      const currentId = currentSong?._id || (currentSong as any)?.externalId;
      return id === currentId;
    });
    if (isCurrentlyPlayingFavorites) {
      togglePlay();
    } else {
      // If shuffle is enabled, shuffle the songs before playing
      if (isShuffle) {
        const shuffledSongs = [...likedSongs];
        for (let i = shuffledSongs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledSongs[i], shuffledSongs[j]] = [shuffledSongs[j], shuffledSongs[i]];
        }
        playAlbum(shuffledSongs, 0);
      } else {
        playAlbum(likedSongs, 0);
      }
    }
  }, [hasFavourites, likedSongs, currentSong, togglePlay, isShuffle, playAlbum]);

const handlePlaySong = useCallback(async (index: number) => {
    const song = likedSongs[index];

    // External songs may need stream URL resolution
    if ((song as any)._likedType === "external" || song.source === "jiosaavn" || song._id?.startsWith("jiosaavn_")) {
      const songCopy = { ...song };
      if (!songCopy.audioUrl) {
        try {
          const cleanId = (songCopy.externalId || songCopy._id || "")
            .replace("jiosaavn_", "");
          const res = await axiosInstance.get(`/stream/stream-url/jiosaavn/${cleanId}`);
          if (res.data?.url) {
            songCopy.audioUrl = res.data.url;
          }
        } catch {
          console.error("Failed to resolve stream URL for liked song");
          return;
        }
      }
      // Play the resolved song and set the rest as queue
      const resolvedSongs = [...likedSongs];
      resolvedSongs[index] = songCopy;
      playAlbum(resolvedSongs, index);
    } else {
      playAlbum(likedSongs, index);
    }
  }, [likedSongs, playAlbum]);

  const isCompact = contentWidth === 'compact';
  const isMedium = contentWidth === 'medium';
  const showFullDetails = contentWidth === 'full';

  return (
    <main
      ref={setContainerRef}
      className="h-full rounded-lg overflow-hidden relative"
    >
      {/* Sticky Header - Appears on scroll */}
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
          style={{ backgroundColor: FAVORITES_COLORS.secondary }}
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
              <div className={cn(
                "rounded-md bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shrink-0 transition-all duration-300",
                isCompact ? "w-8 h-8" : "w-9 h-9"
              )}>
                <Heart className={cn(
                  "text-white transition-all duration-300",
                  isCompact ? "w-4 h-4" : "w-5 h-5"
                )} fill="white" />
              </div>
              <span className={cn(
                "font-semibold text-white truncate transition-all duration-300",
                isCompact && "text-sm"
              )}>
                Liked Songs
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
              onClick={handlePlayAll}
              size="icon"
              disabled={!hasFavourites}
              className={cn(
                "rounded-full bg-violet-600/90 hover:bg-violet-500 flex items-center justify-center shadow-xl shrink-0",
                "transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50",
                isCompact ? "w-9 h-9" : "w-10 h-10"
              )}
            >
              {isPlayingFavorites ? (
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
          {/* Gradient Hero - Violet theme */}
          <div
            className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: "calc(var(--favorites-hero-height, 420px))",
              background: `
                linear-gradient(
                  180deg,
                  ${FAVORITES_COLORS.primary} 0%,
                  ${FAVORITES_COLORS.secondary} 40%,
                  rgba(24,24,27,0.95) 69%,
                  rgb(24,24,27) 100%
                )
              `,
            }}
            aria-hidden="true"
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

            {/* Header Section - Responsive */}
            <div className={cn(
              "flex flex-col items-center gap-4 pb-6 -mt-12 md:mt-0 transition-all duration-300 ease-out",
              isCompact ? "p-4" : isMedium ? "p-5" : "p-6",
              showFullDetails && "md:flex-row md:items-end md:gap-6 md:pb-8"
            )}>
              {/* Favorites Cover */}
              <div
                className="shrink-0 transition-all duration-500 ease-out"
                style={{
                  boxShadow: `0 25px 50px -12px ${FAVORITES_COLORS.primary}60`,
                }}
              >
                <div className={cn(
                  "rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-2xl transition-all duration-300 ease-out",
                  isCompact ? "w-[180px] h-[180px]" :
                    isMedium ? "w-[180px] h-[180px]" :
                      "w-[220px] h-[220px] md:w-[200px] md:h-[200px]"
                )}>
                  <Heart className={cn(
                    "text-white transition-all duration-300",
                    "w-20 h-20"
                  )} fill="white" />
                </div>
              </div>

              <div className={cn(
                "flex flex-col text-center transition-all duration-300 ease-out",
                showFullDetails && "md:ml-4 md:text-left md:justify-end"
              )}>
                <p className={cn(
                  "font-semibold uppercase tracking-widest text-white/60 transition-all duration-300",
                  isCompact ? "text-[10px]" : "text-xs"
                )}>
                  Playlist
                </p>
                <h1 className={cn(
                  "font-bold my-2 text-white leading-tight transition-all duration-300 ease-out",
                  isCompact ? "text-xl" :
                    isMedium ? "text-2xl" :
                      "text-3xl sm:text-4xl md:text-5xl lg:text-6xl md:my-3"
                )}>
                  Liked Songs
                </h1>
                <div className={cn(
                  "flex flex-wrap items-center justify-center gap-1.5 text-white/70 transition-all duration-300",
                  showFullDetails && "md:justify-start",
                  isCompact ? "text-xs" : "text-sm"
                )}>
                  <span className="font-semibold text-white/90">{user?.fullName || "You"}</span>
                  <span className="text-white/40">•</span>
                  <span>{likedSongs?.length || 0} songs</span>
                </div>
              </div>
            </div>

            {/* Transition Scrim */}
            <div className="relative h-16 -mt-8 z-10">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900" />
            </div>

            {/* Action Bar with Shuffle */}
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
                onClick={handlePlayAll}
                size="icon"
                disabled={!hasFavourites}
                className={cn(
                  "rounded-full bg-violet-600/90 hover:bg-violet-500 flex items-center justify-center shadow-xl",
                  "transition-all duration-300 ease-out active:scale-95 disabled:opacity-50",
                  isCompact ? "w-12 h-12" : "w-14 h-14"
                )}
              >
                {isPlayingFavorites ? (
                  <Pause className={cn("text-black", isCompact ? "h-5 w-5" : "h-7 w-7")} fill="black" />
                ) : (
                  <Play className={cn("text-black ml-0.5", isCompact ? "h-5 w-5" : "h-7 w-7")} fill="black" />
                )}
              </Button>
            </div>

            {/* Songs Section */}
            <div className="relative min-h-[50vh]">
              <div className="absolute inset-0 bg-zinc-900" />
              <div className="relative">
                {/* Table Header - Full width only */}
                {showFullDetails && (
                  <div className="hidden md:grid grid-cols-[24px_4fr_minmax(60px,1fr)_48px] gap-4 px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                    <div className="text-center">#</div>
                    <div>Title</div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div></div>
                  </div>
                )}

                {/* Empty State */}
                {!hasFavourites && (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-violet-600/20 to-violet-800/20 flex items-center justify-center mb-4">
                      <Heart className="w-10 h-10 text-violet-400/50" />
                    </div>
                    <p className="font-medium text-lg text-zinc-300">Songs you like will appear here</p>
                    <p className="text-sm mt-2 text-zinc-500">Save songs by tapping the heart icon</p>
                  </div>
                )}

                {/* Songs List */}
                {hasFavourites && (
                  <div className={cn(
                    "transition-all duration-300 ease-out",
                    isCompact ? "px-1" : isMedium ? "px-2" : "px-2 md:px-4"
                  )}>
                    {likedSongs.map((song, index) => {
                      const isCurrentSong = (() => {
                        const id = song._id || (song as any).externalId;
                        const currentId = currentSong?._id || (currentSong as any)?.externalId;
                        return id === currentId;
                      })();

                      // Compact layout - simplified (title/artist + options only)
                      if (isCompact) {
                        return (
                          <div
                            key={song._id}
                            onClick={() => handlePlaySong(index)}
                            className={cn(
                              "group cursor-pointer rounded-lg",
                              "grid grid-cols-[1fr_36px] gap-2 px-2 py-2.5",
                              "transition-all duration-200 ease-out",
                              "hover:bg-white/5 active:bg-white/10",
                              isCurrentSong && "bg-white/5"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <img
                                  src={song.imageUrl}
                                  alt={song.title}
                                  loading="lazy"
                                  className="size-10 rounded object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                {isCurrentSong && isPlaying && (
                                  <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                                    <span className="text-violet-400 text-sm animate-pulse">♫</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={cn(
                                  "font-medium truncate text-sm transition-colors duration-200",
                                  isCurrentSong ? "text-violet-400" : "text-white"
                                )}>
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

                      // Medium layout - title/artist + duration + options
                      if (isMedium) {
                        return (
                          <div
                            key={song._id}
                            onClick={() => handlePlaySong(index)}
                            className={cn(
                              "group cursor-pointer rounded-lg",
                              "grid grid-cols-[1fr_50px_36px] gap-2 px-3 py-2.5",
                              "transition-all duration-200 ease-out",
                              "hover:bg-white/5 active:bg-white/10",
                              isCurrentSong && "bg-white/5"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <img
                                  src={song.imageUrl}
                                  alt={song.title}
                                  loading="lazy"
                                  className="size-10 rounded object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                {isCurrentSong && isPlaying && (
                                  <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                                    <span className="text-violet-400 text-sm animate-pulse">♫</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={cn(
                                  "font-medium truncate text-sm transition-colors duration-200",
                                  isCurrentSong ? "text-violet-400" : "text-white"
                                )}>
                                  {song.title}
                                </span>
                                <span className="text-xs text-zinc-400 truncate">
                                  {song.artist}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center text-zinc-400 text-xs tabular-nums">
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

                      // Full layout - all columns
                      return (
                        <div
                          key={song._id}
                          onClick={() => handlePlaySong(index)}
                          className={cn(
                            "group cursor-pointer rounded-lg",
                            "grid grid-cols-[1fr_48px] md:grid-cols-[24px_4fr_minmax(60px,1fr)_48px] gap-3 md:gap-4",
                            "px-3 md:px-4 py-3 text-sm",
                            "transition-all duration-200 ease-out",
                            "hover:bg-white/5 active:bg-white/10",
                            isCurrentSong && "bg-white/5"
                          )}
                        >
                          {/* Index - Desktop only */}
                          <div className="hidden md:flex items-center justify-center">
                            {isCurrentSong && isPlaying ? (
                              <div className="w-4 h-4 flex items-center justify-center text-violet-400">
                                <span className="text-sm animate-pulse">♫</span>
                              </div>
                            ) : (
                              <>
                                <span className="text-zinc-500 text-sm group-hover:hidden">
                                  {index + 1}
                                </span>
                                <Play className="h-4 w-4 text-zinc-300 hidden group-hover:block" />
                              </>
                            )}
                          </div>

                          {/* Title & Artist */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={song.imageUrl}
                                alt={song.title}
                                loading="lazy"
                                className="size-12 md:size-10 rounded object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                              {isCurrentSong && isPlaying && (
                                <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center md:hidden">
                                  <span className="text-violet-400 text-lg animate-pulse">♫</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className={cn(
                                "font-medium truncate text-sm transition-colors duration-200",
                                isCurrentSong ? "text-violet-400" : "text-white"
                              )}>
                                {song.title}
                              </span>
                              <span className="text-xs text-zinc-400 truncate">
                                {song.artist}
                              </span>
                            </div>
                          </div>

                          {/* Duration - Desktop only */}
                          <div className="hidden md:flex items-center text-zinc-400 text-sm tabular-nums">
                            {formatDuration(song.duration)}
                          </div>

                          {/* Song Options */}
                          <div
                            className="flex items-center justify-end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SongOptions song={song} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          <MobileOverlaySpacer />
        </div>
      </ScrollArea>
    </main>
  );
};

export default FavoritesPage;