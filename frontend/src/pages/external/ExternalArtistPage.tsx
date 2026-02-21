// src/pages/external/ExternalArtistPage.tsx
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStreamStore } from "@/stores/useStreamStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Music,
  User,
  Disc3,
  Users,
  BadgeCheck,
  Shuffle,
} from "lucide-react";
import { Song, ExternalSong, ExternalAlbum } from "@/types";
import { cn } from "@/lib/utils";
import { useImageColors } from "@/hooks/useImageColors";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import SongOptions from "../album/components/SongOptions";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { axiosInstance } from "@/lib/axios";

// ─── Helpers ───
const formatDuration = (seconds: number) => {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// ─── Responsive Width Hook ───
const useContentWidth = () => {
  const [contentWidth, setContentWidth] = useState<"compact" | "medium" | "full">("full");
  const containerRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        if (width < 500) setContentWidth("compact");
        else if (width < 700) setContentWidth("medium");
        else setContentWidth("full");
      }
    };
    checkWidth();
    observerRef.current = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width < 500) setContentWidth("compact");
          else if (width < 700) setContentWidth("medium");
          else setContentWidth("full");
        }
      });
    });
    if (containerRef.current) observerRef.current.observe(containerRef.current);
    window.addEventListener("resize", checkWidth);
    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("resize", checkWidth);
    };
  }, []);

  const setContainerRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current && containerRef.current) observerRef.current.unobserve(containerRef.current);
    containerRef.current = node;
    if (observerRef.current && node) observerRef.current.observe(node);
  }, []);

  return { contentWidth, setContainerRef };
};

// ─── Horizontal Rail (for albums) ───
const HorizontalRail = ({
  children,
  className,
  isTouchDevice,
}: {
  children: React.ReactNode;
  className?: string;
  isTouchDevice: boolean;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScrollability();
    el.addEventListener("scroll", checkScrollability, { passive: true });
    const ro = new ResizeObserver(checkScrollability);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScrollability);
      ro.disconnect();
    };
  }, [checkScrollability]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -el.clientWidth * 0.8 : el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <AnimatePresence>
        {!isTouchDevice && isHovered && canScrollLeft && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/3 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-zinc-900/90 hover:bg-zinc-800 flex items-center justify-center shadow-lg"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!isTouchDevice && isHovered && canScrollRight && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/3 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-zinc-900/90 hover:bg-zinc-800 flex items-center justify-center shadow-lg"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
      <div ref={scrollRef} className="overflow-x-auto scrollbar-none scroll-smooth" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div className="flex gap-4 pb-2">{children}</div>
      </div>
    </div>
  );
};

const MobileHorizontalScroll = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto scrollbar-none -mx-4 px-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
    <div className="flex gap-4 pb-2 w-max">{children}</div>
  </div>
);

const ResponsiveRail = ({ children, isTouchDevice }: { children: React.ReactNode; isTouchDevice: boolean }) => (
  <>
    <div className="md:hidden"><MobileHorizontalScroll>{children}</MobileHorizontalScroll></div>
    <div className="hidden md:block"><HorizontalRail isTouchDevice={isTouchDevice}>{children}</HorizontalRail></div>
  </>
);

// ─── Skeleton ───
const SongSkeletonRow = ({
  variant,
}: {
  variant: "compact" | "medium" | "full";
}) => {
  const isCompact = variant === "compact";
  const showDuration = variant === "full";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-2 animate-pulse",
        isCompact ? "py-2.5" : "py-3"
      )}
    >
      {/* Index - only desktop */}
      {variant === "full" && (
        <div className="w-6 h-4 rounded bg-white/[0.06]" />
      )}

      {/* Thumbnail */}
      <div
        className={cn(
          "rounded bg-white/[0.06]",
          isCompact ? "w-9 h-9" : "w-10 h-10"
        )}
      />

      {/* Text */}
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-36 rounded bg-white/[0.06]" />
        <div className="h-3 w-24 rounded bg-white/[0.06]" />
      </div>

      {/* Duration - only desktop */}
      {showDuration && (
        <div className="h-3 w-10 rounded bg-white/[0.06]" />
      )}
    </div>
  );
};

// ─── Song Row ───
const ArtistSongRow = ({
  song,
  index,
  isCurrentSong,
  isPlaying,
  variant,
  onPlay,
  songAsSongType,
  isTouch,
}: {
  song: ExternalSong;
  index: number;
  isCurrentSong: boolean;
  isPlaying: boolean;
  variant: "compact" | "medium" | "full";
  onPlay: (index: number) => void;
  songAsSongType: Song;
  isTouch: boolean;
}) => {
  const isCompact = variant === "compact";
  const showDuration = variant === "full";

  return (
    <div
      onClick={() => onPlay(index)}
      className={cn(
        "group flex items-center gap-3 rounded-lg cursor-pointer transition-all",
        isCompact ? "px-2 py-2" : "px-2 py-2.5",
        isCurrentSong ? "bg-violet-500/10 hover:bg-violet-500/15" : "hover:bg-white/[0.04] active:bg-white/[0.06]"
      )}
    >
{/* Index / Play indicator - only on desktop */}
{variant === "full" && (
  <div className="w-6 text-center shrink-0">
    {isCurrentSong && isPlaying ? (
      <div className="flex items-center justify-center gap-[2px]">
        <span className="w-[3px] h-3 bg-violet-400 rounded-full animate-pulse" />
        <span className="w-[3px] h-4 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
        <span className="w-[3px] h-2.5 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
      </div>
    ) : (
      <>
        <span className={cn("text-xs tabular-nums group-hover:hidden", isCurrentSong ? "text-violet-400 font-semibold" : "text-zinc-500")}>{index + 1}</span>
        <Play className="w-3.5 h-3.5 text-white hidden group-hover:block mx-auto" />
      </>
    )}
  </div>
)}

      <div className={cn("rounded overflow-hidden bg-zinc-800 shrink-0", isCompact ? "w-9 h-9" : "w-10 h-10")}>
        {song.imageUrl ? (
          <img src={song.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Music className="w-4 h-4 text-zinc-600" /></div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn("font-medium line-clamp-1 leading-tight", isCompact ? "text-[13px]" : "text-sm", isCurrentSong ? "text-violet-300" : "text-white")}>{song.title}</p>
        <p className={cn("text-zinc-400 line-clamp-1", isCompact ? "text-[11px]" : "text-xs")}>{song.album || song.artist}</p>
      </div>
      {showDuration && song.duration > 0 && (
        <span className="text-[11px] text-zinc-400 tabular-nums shrink-0 min-w-[40px] text-right">
          {formatDuration(song.duration)}
        </span>
      )}

      <div
        className={cn(
          "shrink-0 transition-opacity",
          isTouch ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <SongOptions song={songAsSongType} />
      </div>
    </div>
  );
};

// ─── Album Card ───
const ArtistAlbumCard = ({
  album,
  onClick,
  isTouchDevice,
}: {
  album: ExternalAlbum;
  onClick: () => void;
  isTouchDevice: boolean;
}) => (
  <motion.div whileTap={{ scale: 0.98 }} className="group cursor-pointer w-[140px] sm:w-[150px] flex-shrink-0" onClick={onClick}>
    <div className="relative aspect-square rounded-lg overflow-hidden shadow-lg shadow-black/40 group-hover:shadow-xl transition-shadow mb-2 bg-zinc-800">
      {album.imageUrl ? (
        <img src={album.imageUrl} alt={album.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-800 to-purple-900">
          <Disc3 className="w-10 h-10 text-white/30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      {!isTouchDevice && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
          <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shadow-xl">
            <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
          </div>
        </div>
      )}
    </div>
    <div className="px-0.5 space-y-0.5">
      <h3 className="font-semibold text-xs text-white line-clamp-1">{album.title}</h3>
      {album.year && <p className="text-[11px] text-zinc-500">{album.year}</p>}
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

const ExternalArtistPage = () => {
  const { source, id } = useParams<{ source: string; id: string }>();
  const navigate = useNavigate();
  const {
    currentExternalArtist: artist,
    isLoadingDetail,
    fetchExternalArtist,
    clearDetail,
  } = useStreamStore();
  const { currentSong, isPlaying, initializeQueue, togglePlay } = usePlayerStore();
  const { contentWidth, setContainerRef } = useContentWidth();
  const isTouchDevice = useIsTouchDevice();
  const [isShuffle, setIsShuffle] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const colors = useImageColors(artist?.imageUrl);

  useEffect(() => {
    if (source && id) fetchExternalArtist(source, id);
    return () => clearDetail();
  }, [source, id]);

  // Scroll detection
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const threshold = contentWidth === "compact" ? 280 : contentWidth === "medium" ? 320 : 360;
      setShowStickyHeader(container.scrollTop > threshold);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [artist, contentWidth]);

  const topSongsAsSongType: Song[] = useMemo(() => {
    if (!artist?.topSongs) return [];
    return artist.topSongs.map((s: ExternalSong) => ({
      _id: s.externalId,
      title: s.title,
      artist: s.artist,
      duration: s.duration,
      imageUrl: s.imageUrl || artist.imageUrl || "",
      audioUrl: s.streamUrl || "",
      albumId: null,
      source: (source || "jiosaavn") as Song["source"],
      externalId: s.externalId,
      streamUrl: s.streamUrl,
      album: s.album,
    }));
  }, [artist, source]);

  const handlePlayTopSongs = useCallback(
    async (startIndex = 0) => {
      if (!artist?.topSongs?.length) return;

      const songs = [...topSongsAsSongType];
      const clicked = { ...songs[startIndex] };

      if (!clicked.audioUrl && clicked.externalId) {
        toast.loading("Loading...", { id: "stream-loading" });
        try {
          const cleanId = clicked.externalId.replace("jiosaavn_", "");
          const res = await axiosInstance.get(`/stream/stream-url/jiosaavn/${cleanId}`);
          if (res.data?.url) {
            clicked.audioUrl = res.data.url;
            clicked.streamUrl = res.data.url;
          }
        } catch {
          toast.dismiss("stream-loading");
          toast.error("Failed to load");
          return;
        }
        toast.dismiss("stream-loading");
      }

      if (!clicked.audioUrl && clicked.streamUrl) clicked.audioUrl = clicked.streamUrl;
      songs[startIndex] = clicked;

      const queue = songs.map((s) => (s.streamUrl ? { ...s, audioUrl: s.streamUrl } : s));

      if (isShuffle) {
        const shuffled = [...queue];
        const clickedSong = shuffled.splice(startIndex, 1)[0];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        shuffled.unshift(clickedSong);
        initializeQueue(shuffled, 0, true);
      } else {
        initializeQueue(queue, startIndex, true);
      }
    },
    [artist, topSongsAsSongType, isShuffle, initializeQueue]
  );

  const handlePlayPause = useCallback(() => {
    if (!artist?.topSongs) return;
    const isCurrentArtistPlaying = artist.topSongs.some((s) => s.externalId === currentSong?._id);
    if (isCurrentArtistPlaying) togglePlay();
    else handlePlayTopSongs(0);
  }, [artist, currentSong, togglePlay, handlePlayTopSongs]);

  const isArtistPlaying = artist?.topSongs?.some((s) => s.externalId === currentSong?._id) && isPlaying;

  const isCompact = contentWidth === "compact";
  const isMedium = contentWidth === "medium";
  const showFullDetails = contentWidth === "full";
  const variant = isCompact ? "compact" : isMedium ? "medium" : "full";

  const formatFollowers = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  // ─── Loading ───
  if (isLoadingDetail) {
    return (
      <main ref={setContainerRef} className="h-full rounded-lg overflow-hidden bg-zinc-900">
        <div className="h-full overflow-hidden">
          <div className={cn("p-6 flex flex-col items-center gap-4", showFullDetails && "md:flex-row md:items-end")}>
            <div className={cn("rounded-full bg-white/[0.06] animate-shimmer", isCompact ? "w-[160px] h-[160px]" : "w-[200px] h-[200px]")} />
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="h-10 w-48 rounded bg-white/[0.06] animate-shimmer" />
              <div className="h-4 w-32 rounded bg-white/[0.06] animate-shimmer" />
              <div className="h-4 w-24 rounded bg-white/[0.06] animate-shimmer" />
            </div>
          </div>
          <div className="px-6 pb-4 flex items-center gap-3 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] animate-shimmer" />
            <div className="w-14 h-14 rounded-full bg-white/[0.06] animate-shimmer" />
          </div>
          <div className="px-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SongSkeletonRow key={i} variant={variant} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ─── Not Found ───
  if (!artist) {
    return (
      <main className="h-full rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 flex flex-col items-center justify-center gap-4">
        <User className="w-12 h-12 text-zinc-600" />
        <p className="text-zinc-400">Artist not found</p>
        <button onClick={() => navigate(-1)} className="text-sm text-violet-400 hover:text-violet-300">Go back</button>
      </main>
    );
  }

  const hasTopSongs = artist.topSongs && artist.topSongs.length > 0;
  const hasAlbums = artist.topAlbums && artist.topAlbums.length > 0;

  return (
    <main ref={setContainerRef} className="h-full rounded-lg overflow-hidden relative">
      {/* ─── Sticky Header ─── */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-30 transition-all duration-300 ease-out",
          showStickyHeader ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        )}
      >
        <div
          className="border-b border-white/5"
          style={{ backgroundColor: colors.primary === "transparent" ? "rgb(24, 24, 27)" : colors.secondary }}
        >
          <div className={cn("flex items-center gap-2 px-3 py-2.5 transition-all duration-300", !isCompact && "gap-3 px-4 py-3")}>
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors shrink-0">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={cn("shrink-0 overflow-hidden rounded-full", isCompact ? "w-8 h-8" : "w-9 h-9")}>
                {artist.imageUrl ? (
                  <img src={artist.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-zinc-500" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn("font-semibold text-white truncate", isCompact && "text-sm")}>{artist.name}</span>
                {artist.isVerified && <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />}
              </div>
            </div>
            {hasTopSongs && (
              <>
                <Button
                  onClick={() => setIsShuffle(!isShuffle)}
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "rounded-full shrink-0 transition-all duration-300",
                    isShuffle ? "text-violet-400 bg-violet-500/20" : "text-white/70 hover:text-white",
                    isCompact ? "w-8 h-8" : "w-9 h-9"
                  )}
                >
                  <Shuffle className={cn("transition-all duration-300", isCompact ? "h-4 w-4" : "h-5 w-5")} />
                </Button>
                <Button
                  onClick={handlePlayPause}
                  size="icon"
                  className={cn(
                    "rounded-full bg-violet-600/90 hover:bg-violet-500 flex items-center justify-center shadow-xl shrink-0",
                    "transition-all duration-300 hover:scale-105 active:scale-95",
                    isCompact ? "w-9 h-9" : "w-10 h-10"
                  )}
                >
                  {isArtistPlaying ? (
                    <Pause className={cn("text-black", isCompact ? "h-4 w-4" : "h-5 w-5")} fill="black" />
                  ) : (
                    <Play className={cn("text-black ml-0.5", isCompact ? "h-4 w-4" : "h-5 w-5")} fill="black" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main Scroll Container ─── */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto overflow-x-hidden scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        <div className="relative min-h-full">
          {/* Gradient Hero */}
          <div
            className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: "calc(var(--album-hero-height, 480px))",
              background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.secondary} 35%, rgba(24,24,27,0.95) 65%, rgb(24,24,27) 100%)`,
            }}
          />
          <div className="absolute inset-0 bg-zinc-900 -z-10" />

          <div className="relative z-10">
            {/* Back Button */}
            <div className="sticky top-0 z-20 p-3">
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

            {/* ─── Artist Header ─── */}
            <div
              className={cn(
                "flex flex-col items-center gap-4 pb-6 -mt-12 transition-all duration-300 ease-out",
                isCompact ? "p-4" : isMedium ? "p-5" : "p-6",
                showFullDetails && "md:flex-row md:items-end md:gap-6 md:pb-8 md:mt-0"
              )}
            >
              {/* Artist Image (Circle) */}
              <div
                className="shrink-0 transition-all duration-500 ease-out"
                style={{
                  boxShadow: colors.primary === "transparent" ? "0 25px 50px -12px rgba(0,0,0,0.5)" : `0 25px 50px -12px ${colors.primary}60`,
                }}
              >
                <div
                  className={cn(
                    "rounded-full overflow-hidden shadow-2xl transition-all duration-300 ease-out bg-zinc-800 ring-4 ring-white/10",
                    isCompact ? "w-[160px] h-[160px]" : isMedium ? "w-[180px] h-[180px]" : "w-[220px] h-[220px] md:w-[200px] md:h-[200px]"
                  )}
                >
                  {artist.imageUrl ? (
                    <img src={artist.imageUrl} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800">
                      <User className="w-16 h-16 text-white/20" />
                    </div>
                  )}
                </div>
              </div>

              {/* Artist Info */}
              <div className={cn("flex flex-col text-center transition-all duration-300 ease-out", showFullDetails && "md:ml-4 md:text-left md:justify-end")}>
                <p className={cn("font-semibold uppercase tracking-widest text-white/60 transition-all duration-300", isCompact ? "text-[10px]" : "text-xs")}>
                  Artist
                </p>
                <div className="flex items-center justify-center gap-2 my-2">
                  <h1
                    className={cn(
                      "font-bold text-white leading-tight transition-all duration-300 ease-out",
                      isCompact ? "text-2xl" : isMedium ? "text-3xl" : "text-4xl sm:text-5xl md:text-6xl",
                      showFullDetails && "md:text-left"
                    )}
                  >
                    {artist.name}
                  </h1>
                  {artist.isVerified && (
                    <BadgeCheck className={cn("text-blue-400 shrink-0", isCompact ? "w-5 h-5" : "w-6 h-6")} />
                  )}
                </div>
                {artist.bio && (
                  <p className={cn("text-zinc-400 line-clamp-2 mb-2 transition-all duration-300", isCompact ? "text-xs" : "text-sm max-w-lg")}>
                    {artist.bio}
                  </p>
                )}
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-center gap-1.5 text-white/70 transition-all duration-300",
                    showFullDetails && "md:justify-start",
                    isCompact ? "text-xs" : "text-sm"
                  )}
                >
                  {(artist.followerCount ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {formatFollowers(artist.followerCount!)} followers
                    </span>
                  )}
                  {hasTopSongs && (
                    <>
                      {(artist.followerCount ?? 0) > 0 && <span className="text-white/40">•</span>}
                      <span>{artist.topSongs!.length} popular songs</span>
                    </>
                  )}
                  {hasAlbums && (
                    <>
                      <span className="text-white/40">•</span>
                      <span>{artist.topAlbums!.length} albums</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Transition Scrim */}
            <div className="relative h-16 -mt-8 z-10">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900" />
            </div>

            {/* ─── Action Bar ─── */}
            {hasTopSongs && (
              <div
                className={cn(
                  "pb-4 flex items-center gap-3 transition-all duration-300 ease-out",
                  isCompact ? "px-4 justify-center" : isMedium ? "px-5 justify-center" : "px-6 justify-center md:justify-start"
                )}
              >
                <Button
                  onClick={() => setIsShuffle(!isShuffle)}
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "rounded-full border transition-all duration-300 ease-out",
                    isShuffle ? "border-violet-500/50 text-violet-400 bg-violet-500/20" : "border-white/20 text-white/70 hover:text-white hover:border-white/40",
                    isCompact ? "w-10 h-10" : "w-12 h-12"
                  )}
                  title={isShuffle ? "Shuffle enabled" : "Enable shuffle"}
                >
                  <Shuffle className={cn("transition-all duration-300", isCompact ? "h-4 w-4" : "h-5 w-5")} />
                </Button>

                <Button
                  onClick={handlePlayPause}
                  size="icon"
                  className={cn(
                    "rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center shadow-xl",
                    "transition-all duration-300 ease-out hover:scale-105 active:scale-95",
                    isCompact ? "w-12 h-12" : "w-14 h-14"
                  )}
                >
                  {isArtistPlaying ? (
                    <Pause className={cn("text-black", isCompact ? "h-5 w-5" : "h-7 w-7")} fill="black" />
                  ) : (
                    <Play className={cn("text-black ml-0.5", isCompact ? "h-5 w-5" : "h-7 w-7")} fill="black" />
                  )}
                </Button>
              </div>
            )}

            {/* ─── Content ─── */}
            <div className="relative">
              <div className="absolute inset-0 bg-zinc-900" />
              <div className="relative space-y-8">
                {/* Popular Songs */}
                {hasTopSongs && (
                  <section>
                    <div className={cn("px-4 sm:px-6 mb-3")}>
                      <h2 className={cn("font-bold text-white", isCompact ? "text-base" : "text-lg")}>Popular</h2>
                    </div>
                    <div className={cn("transition-all duration-300 ease-out", isCompact ? "px-1" : isMedium ? "px-2" : "px-2 md:px-4")}>
                      {artist.topSongs!.slice(0, 20).map((song: ExternalSong, index: number) => {
                        const isCurrentSong = currentSong?._id === song.externalId;
                        return (
                          <ArtistSongRow
                            key={song.externalId}
                            song={song}
                            index={index}
                            isCurrentSong={isCurrentSong}
                            isPlaying={isPlaying}
                            variant={variant}
                            onPlay={handlePlayTopSongs}
                            songAsSongType={topSongsAsSongType[index]}
                            isTouch={isTouchDevice}
                          />
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Albums */}
                {hasAlbums && (
                  <section className={cn("pb-4", isCompact ? "px-4" : "px-4 sm:px-6")}>
                    <h2 className={cn("font-bold text-white mb-3", isCompact ? "text-base" : "text-lg")}>Albums</h2>
                    <ResponsiveRail isTouchDevice={isTouchDevice}>
                      {artist.topAlbums!.map((album: ExternalAlbum) => (
                        <ArtistAlbumCard
                          key={album.externalId}
                          album={album}
                          onClick={() => {
                            const albumId = album._id || album.externalId.replace("jiosaavn_album_", "");
                            navigate(`/albums/external/jiosaavn/${albumId}`);
                          }}
                          isTouchDevice={isTouchDevice}
                        />
                      ))}
                    </ResponsiveRail>
                  </section>
                )}
              </div>
            </div>
          </div>
          <MobileOverlaySpacer />
        </div>
      </div>
    </main>
  );
};

export default ExternalArtistPage;