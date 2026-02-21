// pages/search/SearchPage.tsx
import Topbar from "@/components/Topbar";
import { Input } from "@/components/ui/input";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useStreamStore } from "@/stores/useStreamStore";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { useFuzzySearch } from "@/hooks/useFuzzySearch";
import SongsTable from "../admin/components/SongsTable";
import {
  Search,
  X,
  Music,
  Loader2,
  Play,
  Library,
  Globe,
  Disc3,
  ListMusic,
  Upload,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import {
  Song,
  ExternalSong,
  ExternalAlbum,
  ExternalPlaylist,
  ExternalArtist,
} from "@/types";
import SongOptions from "../album/components/SongOptions";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { axiosInstance } from "@/lib/axios";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import { AnimatePresence, motion } from "framer-motion";
import SmartImage from "@/components/ui/SmartImage";

type SearchMode = "online" | "library";

// ═══════════════════════════════════════════════════════════
// HORIZONTAL SCROLL - Exact same pattern as HomePage
// ═══════════════════════════════════════════════════════════

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
    const resizeObserver = new ResizeObserver(checkScrollability);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScrollability);
      resizeObserver.disconnect();
    };
  }, [checkScrollability]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-none scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex gap-4 pb-2">{children}</div>
      </div>
    </div>
  );
};

// Mobile touch scroll - matching HomePage pattern exactly
const MobileHorizontalScroll = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <div
    className="overflow-x-auto scrollbar-none -mx-4 px-4"
    style={{
      scrollbarWidth: "none",
      msOverflowStyle: "none",
      WebkitOverflowScrolling: "touch",
    }}
  >
    <div className="flex gap-4 pb-2 w-max">{children}</div>
  </div>
);

// Responsive rail (mobile: touch scroll, desktop: arrow rail)
const ResponsiveRail = ({
  children,
  isTouchDevice,
}: {
  children: React.ReactNode;
  isTouchDevice: boolean;
}) => (
  <>
    <div className="md:hidden">
      <MobileHorizontalScroll>{children}</MobileHorizontalScroll>
    </div>
    <div className="hidden md:block">
      <HorizontalRail isTouchDevice={isTouchDevice}>{children}</HorizontalRail>
    </div>
  </>
);

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// MusicPlaceholder - used for missing album/artist images and as a generic placeholder
// ═════════════════════════════════════════════════════════════════════════════════════════════════════

const MusicPlaceholder = ({
  className,
  iconSize = "md",
  rounded = "lg",
}: {
  className?: string;
  iconSize?: "sm" | "md" | "lg";
  rounded?: "lg" | "full" | "md";
}) => {
  // const iconSizes = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-10 h-10" };
  const roundedMap = { lg: "rounded-lg", full: "rounded-full", md: "rounded-md" };

  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center",
        "bg-gradient-to-br from-zinc-800 via-zinc-800/80 to-zinc-900",
        roundedMap[rounded],
        className
      )}
    >
      <div className="flex flex-col items-center gap-1 opacity-60">
        {/* Vinyl record style */}
        <div className="relative">
          <div
            className={cn(
              "rounded-full bg-zinc-700 flex items-center justify-center ring-1 ring-white/5",
              iconSize === "sm" && "w-6 h-6",
              iconSize === "md" && "w-12 h-12",
              iconSize === "lg" && "w-14 h-14"
            )}
          >
            <div
              className={cn(
                "rounded-full bg-zinc-900",
                iconSize === "sm" && "w-2 h-2",
                iconSize === "md" && "w-4 h-4",
                iconSize === "lg" && "w-5 h-5"
              )}
            />
          </div>
          {/* Groove rings */}
          <div
            className={cn(
              "absolute inset-0 rounded-full border border-white/5",
              iconSize === "md" && "m-1.5",
              iconSize === "lg" && "m-2"
            )}
          />
          <div
            className={cn(
              "absolute inset-0 rounded-full border border-white/[0.03]",
              iconSize === "md" && "m-3",
              iconSize === "lg" && "m-3.5"
            )}
          />
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// SONG HORIZONTAL CARD (for horizontal song rail)
// ═══════════════════════════════════════════════════════════

const SongHorizontalCard = ({
  song,
  songAsSong,
  onClick,
  isTouchDevice,
}: {
  song: ExternalSong;
  songAsSong: Song;  // ← ADD this
  onClick: () => void;
  isTouchDevice: boolean;
}) => {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsPos, setOptionsPos] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLongPress = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      setOptionsPos({ x: touch.clientX, y: touch.clientY });
      setOptionsOpen(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOptionsPos({ x: e.clientX, y: e.clientY });
    setOptionsOpen(true);
  };

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="group cursor-pointer w-[140px] sm:w-[150px] flex-shrink-0 relative"
        onClick={onClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleLongPress}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        <div className="relative aspect-square rounded-lg overflow-hidden shadow-lg shadow-black/40 group-hover:shadow-xl transition-shadow mb-2 bg-zinc-800">
          <SmartImage
            src={song.imageUrl}
            alt={song.title}
            fallback={<MusicPlaceholder iconSize="md" />}
            imgClassName="object-cover"
          />
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
          <h3 className="font-semibold text-xs text-white line-clamp-1 leading-tight">
            {song.title}
          </h3>
          <p className="text-[11px] text-zinc-400 line-clamp-1">{song.artist}</p>
        </div>
      </motion.div>

      {/* SongOptions triggered via long-press / right-click */}
      <SongOptions
        song={songAsSong}
        forceOpen={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        inlineTrigger={false}
        triggerPosition={optionsPos}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN SEARCH PAGE
// ═══════════════════════════════════════════════════════════

const SearchPage = () => {
  const [query, setQuery] = useState(() => {
    return useStreamStore.getState().searchQuery || "";
  });
  const [searchMode, setSearchMode] = useState<SearchMode>("online");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const isTouchDevice = useIsTouchDevice();
  const debouncedQuery = useDebounce(query, 350);
  const { songs, fetchSongs } = useMusicStore();
  const { initializeQueue } = usePlayerStore();
  const {
    searchAllResults,
    isSearching: isSearchingExternal,
    searchAll,
    clearSearch: clearExternalSearch,
  } = useStreamStore();
  const {
    recentlyPlayedFromSearch,
    addRecentlyPlayedFromSearch,
    removeRecentlyPlayedFromSearch,
    clearRecentlyPlayedFromSearch,
  } = usePreferencesStore();

  useEffect(() => {
    if (songs.length === 0) fetchSongs();
  }, [fetchSongs, songs.length]);

  const localResults = useFuzzySearch(songs, debouncedQuery, {
    keys: ["title", "artist"],
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    returnAllOnEmpty: false,
    limit: 20,
  });

  // Add inside SearchPage component:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
      const active = document.activeElement;
      if (active?.tagName !== "INPUT" && active?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []);

useEffect(() => {
  if (searchMode === "online" && debouncedQuery.trim().length >= 2) {
    // Don't re-search if we already have results for this exact query
    const currentResults = useStreamStore.getState().searchAllResults;
    const currentStoredQuery = useStreamStore.getState().searchQuery;
    const alreadyHasResults = currentStoredQuery === debouncedQuery && currentResults &&
      ((currentResults.songs?.length ?? 0) > 0 ||
       (currentResults.albums?.length ?? 0) > 0 ||
       (currentResults.playlists?.length ?? 0) > 0 ||
       (currentResults.artists?.length ?? 0) > 0);
    if (alreadyHasResults) return;
    searchAll(debouncedQuery);
  }
}, [debouncedQuery, searchMode]);

  const hasQuery = debouncedQuery.trim().length > 0;
  const hasLocalResults = localResults.length > 0;
  const hasRichResults =
    searchAllResults &&
    ((searchAllResults.songs?.length ?? 0) > 0 ||
      (searchAllResults.albums?.length ?? 0) > 0 ||
      (searchAllResults.playlists?.length ?? 0) > 0 ||
      (searchAllResults.artists?.length ?? 0) > 0);
  const hasRecentSongs = recentlyPlayedFromSearch.length > 0;

  const clearSearch = () => {
    setQuery("");
    clearExternalSearch();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handlePlayExternalFromIndex = async (
    results: ExternalSong[],
    index: number
  ) => {
    const allAsSongs: Song[] = results.map((s) => ({
      _id: s.externalId,
      title: s.title,
      artist: s.artist,
      duration: s.duration,
      imageUrl: s.imageUrl,
      audioUrl: s.streamUrl || "",
      albumId: null,
      source: s.source as Song["source"],
      externalId: s.externalId,
      videoId: s.videoId,
      streamUrl: s.streamUrl,
      album: s.album,
    }));

    const clicked = allAsSongs[index];

    if (clicked.source === "jiosaavn") {
      if (clicked.streamUrl) {
        clicked.audioUrl = clicked.streamUrl;
      } else {
        toast.loading("Loading...", { id: "stream-loading" });
        try {
          const res = await axiosInstance.get(
            `/stream/stream-url/jiosaavn/${clicked.externalId?.replace("jiosaavn_", "")}`
          );
          if (res.data?.url) {
            clicked.audioUrl = res.data.url;
            clicked.streamUrl = res.data.url;
          } else {
            toast.dismiss("stream-loading");
            toast.error("Could not load this song");
            return;
          }
        } catch {
          toast.dismiss("stream-loading");
          toast.error("Failed to load stream");
          return;
        }
        toast.dismiss("stream-loading");
      }
    } else if (clicked.source === "youtube" && clicked.videoId) {
      toast.loading("Loading...", { id: "stream-loading" });
      try {
        const res = await axiosInstance.get(
          `/stream/stream-url/youtube/${clicked.videoId}`
        );
        if (res.data?.url) {
          clicked.audioUrl = res.data.url;
        } else {
          toast.dismiss("stream-loading");
          toast.error("Could not load this song");
          return;
        }
      } catch {
        toast.dismiss("stream-loading");
        toast.error("Failed to load stream");
        return;
      }
      toast.dismiss("stream-loading");
    }

    if (!clicked.audioUrl) {
      toast.error("No playable URL found");
      return;
    }

    addRecentlyPlayedFromSearch(clicked);
    initializeQueue([clicked], 0, true);
  };

  const handlePlayRecentSong = (index: number) => {
    const recentSong = recentlyPlayedFromSearch[index];
    const song: Song = {
      _id: recentSong._id,
      title: recentSong.title,
      artist: recentSong.artist,
      imageUrl: recentSong.imageUrl,
      audioUrl: recentSong.audioUrl,
      duration: recentSong.duration,
      albumId: null,
    };
    addRecentlyPlayedFromSearch(song);
    initializeQueue([song], 0, true);
  };

  const navigateToExternalAlbum = (album: ExternalAlbum) => {
    const id = album._id || album.externalId.replace("jiosaavn_album_", "");
    navigate(`/albums/external/jiosaavn/${id}`);
  };

  const navigateToExternalPlaylist = (playlist: ExternalPlaylist) => {
    const id =
      playlist._id || playlist.externalId.replace("jiosaavn_playlist_", "");
    navigate(`/playlists/external/jiosaavn/${id}`);
  };

  const navigateToExternalArtist = (artist: ExternalArtist) => {
    const id =
      artist._id || artist.externalId.replace("jiosaavn_artist_", "");
    navigate(`/artists/external/jiosaavn/${id}`);
  };

  return (
    <main className="h-full rounded-lg bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-900 overflow-hidden">
      <Topbar />

      {/* 
        FIX: Replaced ScrollArea with native scrollable div, 
        matching the HomePage pattern. ScrollArea was capturing 
        touch/pointer events and preventing horizontal scroll 
        on inner rail components.
      */}
      <div
        className="h-[calc(100vh-50px)] lg:h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden scrollbar-none"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
        onScroll={() => {
          if (document.activeElement === inputRef.current) {
            inputRef.current?.blur();
          }
        }}
      >
        <div className="px-4 sm:px-6">
          {/* Search Bar */}
          <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-gradient-to-b from-zinc-900/95 to-zinc-900/80 backdrop-blur-md">
            <div className="py-3 space-y-2">
              <div className="relative w-full">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400/90"
                  size={18}
                />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    searchMode === "library"
                      ? "Search your library..."
                      : "Search songs, albums, artists..."
                  }
                  className="w-full h-full bg-zinc-700/60 text-sm placeholder:text-zinc-400/90 text-white py-2.5 lg:py-2 pl-10 pr-10 rounded-full focus:outline-none"
                />
                {query.length > 0 && (
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      clearSearch();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-zinc-400 active:text-zinc-200 active:bg-zinc-600/50 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex bg-zinc-800/80 rounded-full p-0.5 gap-0.5">
                  <button
                    onClick={() => setSearchMode("online")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      searchMode === "online"
                        ? "bg-zinc-700 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-300"
                    )}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Discover
                  </button>
                  <button
                    onClick={() => {
                      setSearchMode("library");
                      clearExternalSearch();
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      searchMode === "library"
                        ? "bg-zinc-700 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-300"
                    )}
                  >
                    <Upload  className="w-3.5 h-3.5" />
                    Uploaded
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="mt-1">
            {/* ONLINE */}
              {searchMode === "online" && (
                <>
                  {/* Show cached results immediately even if debounce hasn't fired yet */}
                  {hasRichResults && (query.trim().length > 0 || hasQuery) && (
                    <RichSearchResults
                      results={searchAllResults!}
                      isTouchDevice={isTouchDevice}
                      onPlaySong={(index) =>
                        handlePlayExternalFromIndex(
                          searchAllResults!.songs,
                          index
                        )
                      }
                      onAlbumClick={navigateToExternalAlbum}
                      onPlaylistClick={navigateToExternalPlaylist}
                      onArtistClick={navigateToExternalArtist}
                    />
                  )}

                  {/* Only show spinner when actively searching AND we don't already have results to show */}
                  {isSearchingExternal && hasQuery && !hasRichResults && (
                    <div className="flex items-center justify-center gap-2 py-12 text-zinc-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Searching...</span>
                    </div>
                  )}

                  {!isSearchingExternal && hasQuery && !hasRichResults && (
                    <EmptyState
                      title="No results found"
                      subtitle={`Couldn't find anything for "${debouncedQuery}"`}
                    />
                  )}

                  {!hasQuery && query.trim().length === 0 && !hasRichResults && hasRecentSongs && (
                    <RecentlyPlayedSection
                      songs={recentlyPlayedFromSearch}
                      onPlay={handlePlayRecentSong}
                      onRemove={removeRecentlyPlayedFromSearch}
                      onClear={clearRecentlyPlayedFromSearch}
                    />
                  )}

                  {!hasQuery && query.trim().length === 0 && !hasRichResults && !hasRecentSongs && (
                    <EmptyState
                      title="Search for music"
                      subtitle="Find songs, albums, artists and playlists"
                      icon={<Music className="size-7 text-zinc-500" />}
                    />
                  )}
                </>
              )}

            {/* LIBRARY */}
            {searchMode === "library" && (
              <>
                {hasQuery && hasLocalResults ? (
                  <SearchResults songs={localResults} />
                ) : hasQuery ? (
                  <EmptyState
                    title="Not in your library"
                    subtitle={`Try searching online for "${debouncedQuery}"`}
                    action={
                      <button
                        onClick={() => setSearchMode("online")}
                        className="mt-3 flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-full transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                        Search Online
                      </button>
                    }
                  />
                ) : (
                  <EmptyState
                    title="Search your library"
                    subtitle="Find songs you've uploaded"
                    icon={<Library className="size-7 text-zinc-500" />}
                  />
                )}
              </>
            )}
          </div>
          <MobileOverlaySpacer />
        </div>
      </div>
    </main>
  );
};

// ═══════════════════════════════════════════════════════════
// RICH SEARCH RESULTS
// ═══════════════════════════════════════════════════════════

const RichSearchResults = ({
  results,
  isTouchDevice,
  onPlaySong,
  onAlbumClick,
  onPlaylistClick,
  onArtistClick,
}: {
  results: {
    songs: ExternalSong[];
    albums: ExternalAlbum[];
    playlists: ExternalPlaylist[];
    artists: ExternalArtist[];
  };
  isTouchDevice: boolean;
  onPlaySong: (index: number) => void;
  onAlbumClick: (album: ExternalAlbum) => void;
  onPlaylistClick: (playlist: ExternalPlaylist) => void;
  onArtistClick: (artist: ExternalArtist) => void;
}) => {
  return (
    <div className="space-y-6 pb-4">
      {/* Songs - Now as horizontal scrollable cards */}
      {results.songs.length > 0 && (
        <section>
          <SectionLabel icon={Music} label="Songs" />
          <ResponsiveRail isTouchDevice={isTouchDevice}>
            {results.songs.map((song, index) => {
              // ← ADD this conversion
              const songAsSong: Song = {
                _id: song.externalId,
                title: song.title,
                artist: song.artist,
                duration: song.duration,
                imageUrl: song.imageUrl,
                audioUrl: song.streamUrl || "",
                albumId: null,
                source: song.source as Song["source"],
                externalId: song.externalId,
                videoId: song.videoId,
                streamUrl: song.streamUrl,
                album: song.album,
              };
              return (
                <SongHorizontalCard
                  key={song.externalId}
                  song={song}
                  songAsSong={songAsSong}   // ← ADD this prop
                  onClick={() => onPlaySong(index)}
                  isTouchDevice={isTouchDevice}
                />
              );
            })}
          </ResponsiveRail>
        </section>
      )}

            {/* Artists */}
            {results.artists.length > 0 && (
        <section>
          <SectionLabel icon={User} label="Artists" />
          <ResponsiveRail isTouchDevice={isTouchDevice}>
            {results.artists.map((artist) => (
              <button
                key={artist.externalId}
                onClick={() => onArtistClick(artist)}
                className="flex flex-col items-center gap-2 w-[88px] flex-shrink-0 group"
              >
                <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden bg-zinc-800 ring-2 ring-transparent group-hover:ring-violet-500/40 group-active:ring-violet-500/40 transition-all shadow-lg">
                  <SmartImage
                    src={artist.imageUrl}
                    alt={artist.name}
                    fallback={<MusicPlaceholder iconSize="md" />}
                    imgClassName="object-cover"
                  />
                </div>
                <span className="text-[11px] text-zinc-300 text-center line-clamp-2 leading-tight font-medium w-full">
                  {artist.name}
                </span>
              </button>
            ))}
          </ResponsiveRail>
        </section>
      )}
  
      {/* Albums */}
      {results.albums.length > 0 && (
        <section>
          <SectionLabel icon={Disc3} label="Albums" />
          <ResponsiveRail isTouchDevice={isTouchDevice}>
            {results.albums.map((album) => (
              <button
                key={album.externalId}
                onClick={() => onAlbumClick(album)}
                className="flex flex-col gap-2 w-[130px] sm:w-[140px] flex-shrink-0 group text-left"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800 shadow-lg group-hover:shadow-xl transition-shadow">
                  <SmartImage
                    src={album.imageUrl}
                    alt={album.title}
                    fallback={<MusicPlaceholder iconSize="md" />}
                    imgClassName="object-cover"
                  />
                  {!isTouchDevice && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-2">
                      <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                        <Play
                          className="w-4 h-4 text-black ml-0.5"
                          fill="black"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-0.5">
                  <p className="text-xs text-white font-medium line-clamp-1">
                    {album.title}
                  </p>
                  <p className="text-[11px] text-zinc-500 line-clamp-1">
                    {album.artist}
                    {album.year ? ` · ${album.year}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </ResponsiveRail>
        </section>
      )}

      {/* Playlists */}
      {results.playlists.length > 0 && (
        <section>
          <SectionLabel icon={ListMusic} label="Playlists" />
          <ResponsiveRail isTouchDevice={isTouchDevice}>
            {results.playlists.map((playlist) => (
              <button
                key={playlist.externalId}
                onClick={() => onPlaylistClick(playlist)}
                className="flex flex-col gap-2 w-[130px] sm:w-[140px] flex-shrink-0 group text-left"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800 shadow-lg group-hover:shadow-xl transition-shadow">
                  <SmartImage
                    src={playlist.imageUrl}
                    alt={playlist.title}
                    fallback={<MusicPlaceholder iconSize="md" />}
                    imgClassName="object-cover"
                  />
                  {!isTouchDevice && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-2">
                      <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                        <Play
                          className="w-4 h-4 text-black ml-0.5"
                          fill="black"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-0.5">
                  <p className="text-xs text-white font-medium line-clamp-2 leading-tight">
                    {playlist.title}
                  </p>
                  {(playlist.songCount ?? 0) > 0 && (
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {playlist.songCount} songs
                    </p>
                  )}
                </div>
              </button>
            ))}
          </ResponsiveRail>
        </section>
      )}


          <section>
          {/* Also show a compact list view below for quick access */}
          {/* {results.songs.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2 px-0.5">
                <ListMusic className="w-3 h-3 text-zinc-600" />
                <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">
                  All Songs
                </span>
              </div>
              <ExternalResultsList
                results={results.songs}
                onPlay={onPlaySong}
              />
            </div>
          )} */}
        </section>
        </div>
       );
      };

const SectionLabel = ({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) => (
  <div className="flex items-center gap-2 mb-2.5 px-0.5">
    <Icon className="hidden" />
    <h3 className="text-lg font-semibold text-white">{label}</h3>
  </div>
);

// ═══════════════════════════════════════════════════════════
// LOCAL SEARCH + RECENT + EMPTY
// ═══════════════════════════════════════════════════════════

const SearchResults = ({ songs }: { songs: Song[] }) => {
  const { initializeQueue } = usePlayerStore();
  const { addRecentlyPlayedFromSearch } = usePreferencesStore();

  const handleRowClick = (index: number) => {
    addRecentlyPlayedFromSearch(songs[index]);
    initializeQueue(songs, index, true);
  };

  return (
    <div
      onClick={(e) => {
        const target = e.target as HTMLElement;
        const row = target.closest("[data-song-index]");
        if (row) {
          handleRowClick(
            parseInt(row.getAttribute("data-song-index") || "0")
          );
          e.stopPropagation();
        }
      }}
    >
      <SongsTable songs={songs} hideActions />
    </div>
  );
};

const RecentlyPlayedSection = ({
  songs,
  onPlay,
  onClear,
}: {
  songs: {
    _id: string;
    title: string;
    artist: string;
    imageUrl: string;
    audioUrl: string;
    duration: number;
    playedAt: number;
  }[];
  onPlay: (index: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) => {
  const songsAsSongType: Song[] = songs.map((s) => ({
    _id: s._id,
    title: s.title,
    artist: s.artist,
    imageUrl: s.imageUrl,
    audioUrl: s.audioUrl,
    duration: s.duration,
    albumId: null,
  }));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-medium text-zinc-200/50 tracking-wide">
          Recent Searches
        </h2>
        <button
          onClick={onClear}
          className="text-xs text-zinc-200/40 active:text-zinc-300 px-2 py-1 rounded-md active:bg-zinc-800"
        >
          Clear all
        </button>
      </div>
      <div className="flex flex-col divide-y divide-zinc-800/50">
        {songs.map((song, idx) => (
          <div
            key={song._id}
            onClick={() => onPlay(idx)}
            className="group flex items-center justify-between gap-3 px-2 py-3 active:bg-zinc-800/50 cursor-pointer rounded-lg"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
            {song.imageUrl ? (
                <img
                  src={song.imageUrl}
                  alt={song.title}
                  className="w-11 h-11 rounded-md object-cover flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-11 h-11 flex-shrink-0">
                  <MusicPlaceholder iconSize="sm" rounded="md" />
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="text-sm font-medium text-white line-clamp-1">
                  {song.title}
                </div>
                <div className="text-xs text-zinc-400 line-clamp-1">
                  {song.artist}
                </div>
              </div>
            </div>
            <div
              className="flex items-center justify-end flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <SongOptions song={songsAsSongType[idx]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const EmptyState = ({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center text-center py-20 text-zinc-400">
    <div className="relative bg-zinc-800/50 rounded-full mb-3 p-4">
      {icon || <Search className="size-7 text-zinc-500" />}
    </div>
    <h3 className="text-base font-medium mb-1 text-zinc-300">{title}</h3>
    <p className="text-sm text-zinc-500">{subtitle}</p>
    {action}
  </div>
);

export default SearchPage;