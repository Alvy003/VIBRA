// src/pages/external/ExternalPlaylistPage.tsx
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStreamStore } from "@/stores/useStreamStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  ChevronLeft,
  Music,
  Clock,
  ListMusic,
  Users,
  Shuffle,
} from "lucide-react";
import { Song, ExternalSong } from "@/types";
import { cn } from "@/lib/utils";
import { useImageColors } from "@/hooks/useImageColors";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import SongOptions from "../album/components/SongOptions";
import { useVirtualizer } from "@tanstack/react-virtual";
import toast from "react-hot-toast";
import { axiosInstance } from "@/lib/axios";
import SaveToLibraryButton from "@/components/SaveToLibraryButton";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";

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

// ─── Skeleton Row ───
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
const PlaylistSongRow = ({
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

      {/* Thumbnail */}
      <div className={cn("rounded overflow-hidden bg-zinc-800 shrink-0", isCompact ? "w-9 h-9" : "w-10 h-10")}>
        {song.imageUrl ? (
          <img src={song.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-4 h-4 text-zinc-600" />
          </div>
        )}
      </div>

      {/* Title & Artist */}
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium line-clamp-1 leading-tight", isCompact ? "text-[13px]" : "text-sm", isCurrentSong ? "text-violet-300" : "text-white")}>{song.title}</p>
        <p className={cn("text-zinc-400 line-clamp-1", isCompact ? "text-[11px]" : "text-xs")}>{song.artist}</p>
      </div>

      {/* Duration - only on full width */}
      {showDuration && song.duration > 0 && (
        <span className="text-[11px] text-zinc-400 tabular-nums shrink-0 min-w-[40px] text-right">
          {formatDuration(song.duration)}
        </span>
      )}

      {/* Options - always visible on touch */}
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

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

const ExternalPlaylistPage = () => {
  const { source, id } = useParams<{ source: string; id: string }>();
  const navigate = useNavigate();
  const {
    currentExternalPlaylist: playlist,
    isLoadingDetail,
    fetchExternalPlaylist,
    clearDetail,
  } = useStreamStore();
  const { currentSong, isPlaying, initializeQueue, togglePlay } = usePlayerStore();
  const { contentWidth, setContainerRef } = useContentWidth();
  const [isShuffle, setIsShuffle] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isTouch = useIsTouchDevice();

  const colors = useImageColors(playlist?.imageUrl);

  useEffect(() => {
    if (source && id) fetchExternalPlaylist(source, id);
    return () => clearDetail();
  }, [source, id]);

  // Scroll detection
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const threshold = contentWidth === "compact" ? 260 : contentWidth === "medium" ? 300 : 340;
      setShowStickyHeader(container.scrollTop > threshold);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [playlist, contentWidth]);

  const allSongsAsSongType: Song[] = useMemo(() => {
    if (!playlist?.songs) return [];
    return playlist.songs.map((s: ExternalSong) => ({
      _id: s.externalId,
      title: s.title,
      artist: s.artist,
      duration: s.duration,
      imageUrl: s.imageUrl || playlist.imageUrl || "",
      audioUrl: s.streamUrl || "",
      albumId: null,
      source: (source || "jiosaavn") as Song["source"],
      externalId: s.externalId,
      streamUrl: s.streamUrl,
      album: "",
    }));
  }, [playlist, source]);

  const handlePlayAll = useCallback(
    async (startIndex = 0) => {
      if (!playlist?.songs?.length) return;

      const songs = [...allSongsAsSongType];
      const clicked = { ...songs[startIndex] };

      if (clicked.source === "jiosaavn" && !clicked.audioUrl && clicked.externalId) {
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
    [playlist, allSongsAsSongType, isShuffle, initializeQueue]
  );

  const handlePlayPause = useCallback(() => {
    if (!playlist?.songs) return;
    const isCurrentPlaylistPlaying = playlist.songs.some((s) => s.externalId === currentSong?._id);
    if (isCurrentPlaylistPlaying) togglePlay();
    else handlePlayAll(0);
  }, [playlist, currentSong, togglePlay, handlePlayAll]);

  const isPlaylistPlaying = playlist?.songs?.some((s) => s.externalId === currentSong?._id) && isPlaying;

  const isCompact = contentWidth === "compact";
  const isMedium = contentWidth === "medium";
  const showFullDetails = contentWidth === "full";
  const variant = isCompact ? "compact" : isMedium ? "medium" : "full";

  const rowHeight = isCompact ? 56 : isMedium ? 64 : 72;
  const songCount = playlist?.songs?.length ?? 0;

  // Virtualization for large playlists
  const songsVirtualizer = useVirtualizer({
    count: songCount,
    overscan: 8,
    estimateSize: () => rowHeight,
    getScrollElement: () => scrollRef.current,
  });

  useEffect(() => {
    songsVirtualizer.measure();
  }, [contentWidth, songsVirtualizer]);

  const totalDuration = playlist?.songs?.reduce((acc: number, s: ExternalSong) => acc + (s.duration || 0), 0) || 0;

  // ─── Loading ───
  if (isLoadingDetail) {
    return (
      <main ref={setContainerRef} className="h-full rounded-lg overflow-hidden bg-zinc-900">
        <div className="h-full overflow-hidden">
          <div className={cn("p-6 flex flex-col items-center gap-4", showFullDetails && "md:flex-row md:items-end")}>
            <div className={cn("rounded-lg bg-white/[0.06] animate-shimmer", isCompact ? "w-[180px] h-[180px]" : "w-[200px] h-[200px]")} />
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="h-3 w-16 rounded bg-white/[0.06] animate-shimmer" />
              <div className="h-10 w-48 rounded bg-white/[0.06] animate-shimmer" />
              <div className="h-4 w-56 rounded bg-white/[0.06] animate-shimmer" />
              <div className="h-4 w-32 rounded bg-white/[0.06] animate-shimmer" />
            </div>
          </div>
          <div className="px-6 pb-4 flex items-center gap-3 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] animate-shimmer" />
            <div className="w-14 h-14 rounded-full bg-white/[0.06] animate-shimmer" />
            <div className="w-12 h-12 rounded-full bg-white/[0.06] animate-shimmer" />
          </div>
          <div className="px-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <SongSkeletonRow key={i} variant={variant} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ─── Not Found ───
  if (!playlist) {
    return (
      <main className="h-full rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 flex flex-col items-center justify-center gap-4">
        <ListMusic className="w-12 h-12 text-zinc-600" />
        <p className="text-zinc-400">Playlist not found</p>
        <button onClick={() => navigate(-1)} className="text-sm text-violet-400 hover:text-violet-300">Go back</button>
      </main>
    );
  }

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
              <div className={cn("shrink-0 overflow-hidden rounded", isCompact ? "w-8 h-8" : "w-9 h-9")}>
                {playlist.imageUrl ? (
                  <img src={playlist.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-800 to-purple-900 flex items-center justify-center">
                    <ListMusic className="w-4 h-4 text-white/40" />
                  </div>
                )}
              </div>
              <span className={cn("font-semibold text-white truncate", isCompact && "text-sm")}>{playlist.title}</span>
            </div>
            <Button
              onClick={() => setIsShuffle(!isShuffle)}
              size="icon"
              variant="ghost"
              className={cn(
                "rounded-full shrink-0 transition-all duration-300",
                isShuffle ?
                 "border border-violet-500/50 text-violet-400 bg-violet-500/20" : "border border-white/20 text-white/70 hover:text-white",
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
              {isPlaylistPlaying ? (
                <Pause className={cn("text-black", isCompact ? "h-4 w-4" : "h-5 w-5")} fill="black" />
              ) : (
                <Play className={cn("text-black ml-0.5", isCompact ? "h-4 w-4" : "h-5 w-5")} fill="black" />
              )}
            </Button>

            <SaveToLibraryButton
            itemData={{
                type: "playlist",
                source: (source as "jiosaavn" | "youtube") || "jiosaavn",
                externalId: playlist?.externalId || `jiosaavn_playlist_${id}`,
                title: playlist?.title || "",
                artist: "",
                description: playlist?.description || "",
                imageUrl: playlist?.imageUrl || "",
                year: null,
                language: null,
                songCount: playlist?.songCount || playlist?.songs?.length || 0,
            }}
            size={isCompact ? "sm" : "md"}
            />

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
              height: "calc(var(--album-hero-height, 420px))",
              background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.secondary} 40%, rgba(24,24,27,0.95) 69%, rgb(24,24,27) 100%)`,
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

            {/* ─── Playlist Header ─── */}
            <div
              className={cn(
                "flex flex-col items-center gap-4 pb-6 -mt-12 transition-all duration-300 ease-out",
                isCompact ? "p-4" : isMedium ? "p-5" : "p-6",
                showFullDetails && "md:flex-row md:items-end md:gap-6 md:pb-8 md:mt-0"
              )}
            >
              {/* Playlist Cover */}
              <div
                className="shrink-0 transition-all duration-500 ease-out"
                style={{
                  boxShadow: colors.primary === "transparent" ? "0 25px 50px -12px rgba(0,0,0,0.5)" : `0 25px 50px -12px ${colors.primary}60`,
                }}
              >
                <div
                  className={cn(
                    "rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ease-out bg-zinc-800",
                    isCompact ? "w-[180px] h-[180px]" : isMedium ? "w-[180px] h-[180px]" : "w-[220px] h-[220px] md:w-[200px] md:h-[200px]"
                  )}
                >
                  {playlist.imageUrl ? (
                    <img src={playlist.imageUrl} alt={playlist.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-800 to-purple-900">
                      <ListMusic className="w-16 h-16 text-white/30" />
                    </div>
                  )}
                </div>
              </div>

              {/* Playlist Info */}
              <div className={cn("flex flex-col text-center transition-all duration-300 ease-out", showFullDetails && "md:ml-4 md:text-left md:justify-end")}>
                <p className={cn("font-semibold uppercase tracking-widest text-white/60 transition-all duration-300", isCompact ? "text-[10px]" : "text-xs")}>
                  Playlist
                </p>
                <h1
                  className={cn(
                    "font-bold my-2 text-white leading-tight transition-all duration-300 ease-out",
                    isCompact ? "text-xl" : isMedium ? "text-2xl" : "text-3xl sm:text-4xl md:text-5xl md:my-3"
                  )}
                >
                  {playlist.title}
                </h1>
                {playlist.description && (
                  <p className={cn("text-zinc-400 line-clamp-2 mb-2 transition-all duration-300", isCompact ? "text-xs" : "text-sm")}>
                    {playlist.description}
                  </p>
                )}
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-center gap-1.5 text-white/70 transition-all duration-300",
                    showFullDetails && "md:justify-start",
                    isCompact ? "text-xs" : "text-sm"
                  )}
                >
                  <span>{playlist.songCount || playlist.songs?.length || 0} songs</span>
                  {totalDuration > 0 && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(totalDuration / 60)} min
                      </span>
                    </>
                  )}
                  {playlist.followerCount && playlist.followerCount > 0 && (
                    <>
                      <span className="text-white/40">•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {playlist.followerCount.toLocaleString()} followers
                      </span>
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
                {isPlaylistPlaying ? (
                  <Pause className={cn("text-black", isCompact ? "h-5 w-5" : "h-7 w-7")} fill="black" />
                ) : (
                  <Play className={cn("text-black ml-0.5", isCompact ? "h-5 w-5" : "h-7 w-7")} fill="black" />
                )}
              </Button>

              <SaveToLibraryButton
                itemData={{
                    type: "playlist",
                    source: (source as "jiosaavn" | "youtube") || "jiosaavn",
                    externalId: playlist.externalId || `jiosaavn_playlist_${id}`,
                    title: playlist.title,
                    artist: "",
                    description: playlist.description || "",
                    imageUrl: playlist.imageUrl || "",
                    year: null,
                    language: null,
                    songCount: playlist.songCount || playlist.songs?.length || 0,
                }}
                variant="button"
                size={isCompact ? "md" : "lg"}
                />

            </div>

            {/* ─── Songs Section (Virtualized) ─── */}
            <div className="relative min-h-[50vh]">
              <div className="absolute inset-0 bg-zinc-900" />
              <div className="relative">
                {/* Table Header */}
                {showFullDetails && (
                  <div className="hidden md:grid grid-cols-[24px_40px_1fr_40px_40px] gap-3 px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                    <div className="text-center">#</div>
                    <div></div>
                    <div>Title</div>
                    <div className="flex items-center justify-end">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div></div>
                  </div>
                )}

                {/* Virtualized Song List */}
                <div className={cn("transition-all duration-300 ease-out", isCompact ? "px-1" : isMedium ? "px-2" : "px-2 md:px-4")}>
                  {playlist.songs && playlist.songs.length > 0 ? (
                    <div style={{ height: `${songsVirtualizer.getTotalSize()}px`, position: "relative" }}>
                     {songsVirtualizer.getVirtualItems().map((virtualRow) => {
                        const index = virtualRow.index;
                        const song = playlist.songs?.[index];
                        if (!song) return null;
                        const isCurrentSong = currentSong?._id === song.externalId;

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
                            <PlaylistSongRow
                                song={song}
                                index={index}
                                isCurrentSong={isCurrentSong}
                                isPlaying={isPlaying}
                                variant={variant}
                                onPlay={handlePlayAll}
                                songAsSongType={allSongsAsSongType[index]}
                                isTouch={isTouch}
                            />
                            </div>
                        );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-zinc-500">
                      <Music className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                      <p className="text-sm">No songs available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <MobileOverlaySpacer />
        </div>
      </div>
    </main>
  );
};

export default ExternalPlaylistPage;