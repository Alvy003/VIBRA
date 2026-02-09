// src/pages/home/HomePage.tsx
import Topbar from "@/components/Topbar";
import { useMusicStore } from "@/stores/useMusicStore";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Sparkles, TrendingUp, Music2, Disc3, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Song, Album } from "@/types";
import { useSongContextMenu } from "@/hooks/useSongContextMenu";
import SongOptions from "../album/components/SongOptions";
import HomePageSkeleton from "./components/HomePageSkeleton.tsx";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import GeneratedAlbumCover from "@/components/GeneratedAlbumCover";
import { SignedIn, useUser } from "@clerk/clerk-react";
import { axiosInstance } from "@/lib/axios";

// ─── Intersection Observer hook for lazy sections ───
const useInView = (options?: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.unobserve(el); // Once visible, stop observing
      }
    }, { rootMargin: '200px 0px', ...options });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
};

// ─── Lazy Image with native loading="lazy" + fade ───
const LazyImage = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={cn(
        className,
        "transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0"
      )}
    />
  );
};

// Hero Background Component
const HeroBackground = ({ imageUrl, isLoaded }: { imageUrl: string; isLoaded: boolean }) => (
  <div className="absolute inset-0 overflow-hidden">
    <AnimatePresence mode="wait">
      <motion.div
        key={imageUrl}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: isLoaded ? 1 : 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute inset-0 scale-[1.01]"
      >
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      </motion.div>
    </AnimatePresence>

    <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/30 to-zinc-900" />
    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/70 to-transparent" />
    <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-zinc-900/30 via-transparent to-zinc-900/30" />
    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-900 via-zinc-900/95 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/90 to-transparent" />
    </div>
    <div
      className="absolute inset-0 opacity-40"
      style={{
        background: "radial-gradient(ellipse at center, transparent 20%, rgba(24,24,27,0.8) 100%)"
      }}
    />
  </div>
);

// Featured Song Card
const FeaturedSongPill = ({ song, onClick, isTouchDevice }: { isTouchDevice: boolean; song: Song; onClick: () => void }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1 }}
    whileTap={{ scale: 0.98 }}
    className={cn(
      "flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full pl-1 pr-4 py-1 transition-all border border-white/10 group",
      isTouchDevice ? "active:bg-white/20" : "hover:bg-white/20"
    )}
  >
    <img
      src={song.imageUrl}
      alt={song.title}
      className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20"
    />
    <div className="text-left">
      <p className="text-sm font-medium text-white line-clamp-1">{song.title}</p>
      <p className="text-xs text-white/60 line-clamp-1">{song.artist}</p>
    </div>
    <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center ml-2 transition-colors">
      <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
    </div>
  </motion.button>
);

// Quick Pick Card
const QuickPickCard = ({
  song,
  onClick,
  onContextMenu,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isTouchDevice,
}: {
  song: Song;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  isTouchDevice: boolean;
}) => (
  <motion.div
    whileTap={{ scale: 0.98 }}
    className="flex items-center gap-3 bg-zinc-800/60 hover:bg-zinc-800/90 active:bg-zinc-800/90 rounded-xl overflow-hidden cursor-pointer transition-all group border border-white/5"
    onClick={onClick}
    onContextMenu={onContextMenu}
    onTouchStart={onTouchStart}
    onTouchMove={onTouchMove}
    onTouchEnd={onTouchEnd}
  >
    <LazyImage
      src={song.imageUrl}
      alt={song.title}
      className="w-12 h-12 object-cover flex-shrink-0"
    />
    <div className="flex-1 min-w-0 pr-2">
      <p
        className={cn(
          "font-medium text-sm truncate transition-[max-width,color] duration-200 text-white",
          !isTouchDevice && "max-w-full group-hover:max-w-[calc(100%-2.5rem)]"
        )}
      >
        {song.title}
      </p>
      <p
        className={cn(
          "text-xs text-zinc-400 truncate transition-[max-width] duration-200",
          !isTouchDevice && "max-w-full group-hover:max-w-[calc(100%-2.5rem)]"
        )}
      >
        {song.artist}
      </p>
    </div>
    {!isTouchDevice && (
      <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-3">
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shadow-lg">
          <Play className="w-4 h-4 text-black ml-0.5" fill="black" />
        </div>
      </div>
    )}
  </motion.div>
);

// Horizontal Rail Component
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
    el.addEventListener('scroll', checkScrollability, { passive: true });
    const resizeObserver = new ResizeObserver(checkScrollability);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScrollability);
      resizeObserver.disconnect();
    };
  }, [checkScrollability]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
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
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-4 pb-2">
          {children}
        </div>
      </div>
    </div>
  );
};

// Mobile Horizontal Scroll Container
const MobileHorizontalScroll = ({ children }: { children: React.ReactNode }) => (
  <div
    className="overflow-x-auto scrollbar-none -mx-4 px-4"
    style={{
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
    }}
  >
    <div className="flex gap-4 pb-2 w-max">
      {children}
    </div>
  </div>
);

// Pull-to-Refresh Indicator
const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  threshold,
}: {
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
}) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const isReady = pullDistance >= threshold;

  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
      style={{
        height: isRefreshing ? 52 : Math.min(pullDistance * 0.55, 52),
      }}
    >
      {isRefreshing ? (
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-[18px] h-[18px] text-violet-400 animate-spin" />
          <span className="text-[13px] text-zinc-400 font-medium">Refreshing</span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ rotate: isReady ? 180 : progress * 180 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <svg
              className={cn(
                "w-[18px] h-[18px] transition-colors duration-200",
                isReady ? "text-violet-400" : "text-zinc-500"
              )}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="7 13 12 18 17 13" />
              <line x1="12" y1="6" x2="12" y2="18" />
            </svg>
          </motion.div>
          <span
            className={cn(
              "text-[13px] font-medium transition-colors duration-200",
              isReady ? "text-violet-400" : "text-zinc-500"
            )}
          >
            {isReady ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      )}
    </div>
  );
};

// Album Card
const AlbumCard = ({
  album,
  isTouchDevice,
}: {
  album: Album;
  isTouchDevice: boolean;
}) => {
  const hasCustomImage = Boolean(album.imageUrl);

  return (
    <Link to={`/albums/${album._id}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="group cursor-pointer"
      >
        <div className="relative aspect-square rounded-lg overflow-hidden shadow-lg shadow-black/40 group-hover:shadow-xl group-hover:shadow-black/50 transition-shadow duration-300 mb-3">
          {hasCustomImage ? (
            <LazyImage
              src={album.imageUrl!}
              alt={album.title}
              className="w-full h-full object-cover transition-transform duration-500"
            />
          ) : (
            <GeneratedAlbumCover
              title={album.title}
              previewImages={album.previewImages}
              className="w-full h-full"
              size="lg"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {!isTouchDevice && (
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
              <div className="w-11 h-11 rounded-full bg-violet-600 flex items-center justify-center shadow-xl shadow-black/40 transition-all duration-200">
                <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
              </div>
            </div>
          )}
        </div>
        <div className="space-y-0.5 px-0.5">
          <h3 className="font-semibold text-[15px] text-white truncate leading-tight">
            {album.title}
          </h3>
          <p className="text-sm text-zinc-400 truncate group-hover:text-zinc-300 transition-colors">
            {album.artist}
          </p>
        </div>
      </motion.div>
    </Link>
  );
};

// Song Card
const SongCard = ({
  song,
  onClick,
  onContextMenu,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isTouchDevice,
}: {
  song: Song;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  isTouchDevice: boolean;
}) => (
  <motion.div
    whileHover={{ scale: 1 }}
    whileTap={{ scale: 0.98 }}
    className="group cursor-pointer"
    onClick={onClick}
    onContextMenu={onContextMenu}
    onTouchStart={onTouchStart}
    onTouchMove={onTouchMove}
    onTouchEnd={onTouchEnd}
  >
    <div className="relative aspect-square rounded-lg overflow-hidden shadow-lg shadow-black/40 group-hover:shadow-xl group-hover:shadow-black/50 transition-shadow duration-300 mb-3 bg-zinc-800">
      <LazyImage
        src={song.imageUrl}
        alt={song.title}
        className="w-full h-full object-cover transition-transform duration-300"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      {!isTouchDevice && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
          <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shadow-xl">
            <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
          </div>
        </div>
      )}
    </div>
    <h3 className="font-semibold text-sm truncate text-white">{song.title}</h3>
    <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
  </motion.div>
);

// Section Header
const SectionHeader = ({
  icon: Icon,
  title,
  gradient,
  seeAllLink,
}: {
  icon: React.ElementType;
  title: string;
  showAll?: boolean;
  gradient?: string;
  seeAllLink?: string;
}) => (
  <div className="flex items-center justify-between mb-3 md:mb-4">
    <div className="flex items-center gap-2">
      <div className="hidden md:block">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            gradient || "bg-violet-500/20"
          )}
        >
          <Icon className="w-4 h-4 text-violet-400" />
        </div>
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-white/95">{title}</h2>
    </div>
    {seeAllLink && (
      <Link
        to={seeAllLink}
        className="text-sm text-zinc-400 hover:text-white transition-colors"
      >
        See all
      </Link>
    )}
  </div>
);

// ─── Lazy Section wrapper ───
// Only renders children once it scrolls into view (with 200px lookahead)
const LazySection = ({
  children,
  className,
  fallbackHeight = 280,
}: {
  children: React.ReactNode;
  className?: string;
  fallbackHeight?: number;
}) => {
  const { ref, isInView } = useInView();

  return (
    <div ref={ref} className={className}>
      {isInView ? (
        children
      ) : (
        <div style={{ height: fallbackHeight }} className="animate-pulse bg-zinc-800/20 rounded-xl" />
      )}
    </div>
  );
};

const HomePage = () => {
  const {
    fetchFeaturedSongs,
    fetchMadeForYouSongs,
    fetchTrendingSongs,
    fetchAlbums,
    madeForYouSongs,
    featuredSongs,
    trendingSongs,
    albums,
  } = useMusicStore();

  const randomAlbums = useMemo(() => {
    if (!albums.length) return [];
    const sessionSeed = sessionStorage.getItem('albumShuffleSeed') || Date.now().toString();
    if (!sessionStorage.getItem('albumShuffleSeed')) {
      sessionStorage.setItem('albumShuffleSeed', sessionSeed);
    }
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    const copy = [...albums];
    let seed = parseInt(sessionSeed);
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seed++) * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [albums]);

  const { initializeQueue, currentSong, playSong } = usePlayerStore();
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const heroThreshold = 280;
  const isTouchDevice = useIsTouchDevice();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const { isSignedIn, isLoaded } = useUser();
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef<number | null>(null);
  const isPulling = useRef(false);
  const PULL_THRESHOLD = 80;

  const {
    contextSong,
    contextMenu,
    showOptions,
    openContextMenu,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    closeContextMenu,
  } = useSongContextMenu();

  const isInitialLoading =
    featuredSongs.length === 0 &&
    madeForYouSongs.length === 0 &&
    trendingSongs.length === 0 &&
    albums.length === 0;

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    const scrollTop = target.scrollTop;
    setIsScrolled(scrollTop > heroThreshold);
  }, [heroThreshold]);

  const refreshContent = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
  
    try {
      sessionStorage.removeItem('albumShuffleSeed');
  
      await Promise.all([
        fetchFeaturedSongs(true),
        fetchMadeForYouSongs(true),
        fetchTrendingSongs(true),
        fetchAlbums(true),
        ...(isSignedIn ? [
          axiosInstance.get("/history/recently-played?limit=12").then(({ data }) => {
            setRecentlyPlayed(data);
          }).catch(() => {})
        ] : []),
      ]);
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 400);
    }
  }, [isRefreshing, fetchFeaturedSongs, fetchMadeForYouSongs, fetchTrendingSongs, fetchAlbums, isSignedIn]);

  // Pull-to-refresh (touch only)
const handlePullStart = useCallback((e: TouchEvent) => {
  const container = mobileScrollRef.current;
  if (!container || container.scrollTop > 5 || isRefreshing) return;
  pullStartY.current = e.touches[0].clientY;
  isPulling.current = false;
}, [isRefreshing]);

const handlePullMove = useCallback((e: TouchEvent) => {
  if (pullStartY.current === null || isRefreshing) return;
  const container = mobileScrollRef.current;
  if (!container || container.scrollTop > 5) {
    pullStartY.current = null;
    setPullDistance(0);
    return;
  }

  const diff = e.touches[0].clientY - pullStartY.current;

  if (diff > 10) {
    isPulling.current = true;
    const resistance = Math.max(0.3, 1 - diff / 400);
    setPullDistance(diff * resistance);
  } else if (diff < 0) {
    // Scrolling up, cancel pull
    isPulling.current = false;
    setPullDistance(0);
  }
}, [isRefreshing]);

const handlePullEnd = useCallback(() => {
  if (pullStartY.current === null) return;

  if (isPulling.current && pullDistance >= PULL_THRESHOLD && !isRefreshing) {
    refreshContent();
  } else {
    setPullDistance(0);
  }

  pullStartY.current = null;
  isPulling.current = false;
}, [pullDistance, isRefreshing, refreshContent]);

useEffect(() => {
  const container = mobileScrollRef.current;
  if (!container || !isTouchDevice) return;

  container.addEventListener('touchstart', handlePullStart, { passive: true });
  container.addEventListener('touchmove', handlePullMove, { passive: true });
  container.addEventListener('touchend', handlePullEnd, { passive: true });

  return () => {
    container.removeEventListener('touchstart', handlePullStart);
    container.removeEventListener('touchmove', handlePullMove);
    container.removeEventListener('touchend', handlePullEnd);
  };
}, [isTouchDevice, handlePullStart, handlePullMove, handlePullEnd]);

  useEffect(() => {
    const container = mobileScrollRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndSwipe = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && featuredSongs.length > 1) {
      setHeroImageLoaded(false);
      setHeroIndex((prev) => (prev + 1) % featuredSongs.length);
    }
    if (isRightSwipe && featuredSongs.length > 1) {
      setHeroImageLoaded(false);
      setHeroIndex((prev) => (prev - 1 + featuredSongs.length) % featuredSongs.length);
    }
  };

  const heroSong = useMemo(() => {
    if (featuredSongs.length > 0) {
      return featuredSongs[heroIndex % featuredSongs.length];
    }
    return null;
  }, [featuredSongs, heroIndex]);

  useEffect(() => {
    if (featuredSongs.length <= 1) return;
    const interval = setInterval(() => {
      setHeroImageLoaded(false);
      setHeroIndex((prev) => (prev + 1) % featuredSongs.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [featuredSongs.length]);

  useEffect(() => {
    if (heroSong?.imageUrl) {
      const img = new Image();
      img.onload = () => setHeroImageLoaded(true);
      img.src = heroSong.imageUrl;
    }
  }, [heroSong?.imageUrl]);

  useEffect(() => {
    if (!currentSong && madeForYouSongs.length && featuredSongs.length && trendingSongs.length) {
      const allSongs = [...featuredSongs, ...madeForYouSongs, ...trendingSongs];
      initializeQueue(allSongs);
    }
  }, [initializeQueue, currentSong, madeForYouSongs, featuredSongs, trendingSongs]);

  useEffect(() => {
    fetchFeaturedSongs();
    fetchMadeForYouSongs();
    fetchTrendingSongs();
    fetchAlbums();
  }, [fetchFeaturedSongs, fetchMadeForYouSongs, fetchTrendingSongs, fetchAlbums]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const fetchHistory = async () => {
        try {
          const { data } = await axiosInstance.get("/history/recently-played?limit=12");
          setRecentlyPlayed(data);
        } catch (error) {
          console.error("Failed to fetch history:", error);
        }
      };
      fetchHistory();
    }
  }, [isLoaded, isSignedIn]);

  const renderPageContent = () => {
    if (isInitialLoading) {
      return <HomePageSkeleton />;
    }
    return renderContent();
  };

  const renderContent = () => (
    <div className="relative">
      {/* Pull-to-Refresh (touch only) */}
      {isTouchDevice && (pullDistance > 0 || isRefreshing) && (
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          threshold={PULL_THRESHOLD}
        />
      )}

      {/* Hero Section */}
      {heroSong && (
        <div
          className="relative h-[clamp(220px,35vh,360px)] sm:h-[clamp(260px,38vh,380px)]"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndSwipe}
        >
          <HeroBackground
            imageUrl={heroSong.imageUrl}
            isLoaded={heroImageLoaded}
          />
          <div className="relative z-10 h-full flex flex-col justify-end px-4 sm:px-6 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <FeaturedSongPill
                song={heroSong}
                onClick={() => playSong(heroSong)}
                isTouchDevice={isTouchDevice}
              />
            </motion.div>
            {featuredSongs.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-1.5 mt-4"
              >
                {featuredSongs.slice(0, 5).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setHeroImageLoaded(false);
                      setHeroIndex(idx);
                    }}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      idx === heroIndex % 5
                        ? "w-6 bg-white/90"
                        : "w-1.5 bg-white/30 active:bg-white/50"
                    )}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Content Sections */}
      <div className="px-4 sm:px-6 pb-6 space-y-8 bg-zinc-900 relative z-10 -mt-8">
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-zinc-900 -translate-y-full pointer-events-none" />

        {/* Quick Picks - Always visible (above the fold) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-0 md:pt-2"
        >
          <SectionHeader
            icon={Sparkles}
            title="Quick Picks"
            gradient="bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {featuredSongs.slice(0, 6).map((song) => (
              <QuickPickCard
                key={song._id}
                song={song}
                onClick={() => playSong(song)}
                onContextMenu={(e) => openContextMenu(e, song)}
                onTouchStart={(e) => handleTouchStart(e, song)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                isTouchDevice={isTouchDevice}
              />
            ))}
          </div>
        </motion.section>

        {/* Recently Played - Desktop Only (Lazy) */}
        <SignedIn>
          {recentlyPlayed.length > 0 && (
            <LazySection fallbackHeight={260}>
              <section className="hidden md:block">
                <SectionHeader
                  icon={Clock}
                  title="Recently Played"
                  gradient="bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
                  seeAllLink="/library/recently-played"
                />
                <HorizontalRail isTouchDevice={isTouchDevice}>
                  {recentlyPlayed.slice(0, 12).map((song, index) => (
                    <div key={`${song._id}-${index}`} className="w-36 lg:w-40 xl:w-44 flex-shrink-0">
                      <SongCard
                        song={song}
                        onClick={() => playSong(song)}
                        onContextMenu={(e) => openContextMenu(e, song)}
                        onTouchStart={(e) => handleTouchStart(e, song)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        isTouchDevice={isTouchDevice}
                      />
                    </div>
                  ))}
                </HorizontalRail>
              </section>
            </LazySection>
          )}
        </SignedIn>

        {/* Albums (Lazy) */}
        {albums.length > 0 && (
          <LazySection fallbackHeight={280}>
            <section>
              <SectionHeader
                icon={Disc3}
                title="Albums"
                showAll
                gradient="bg-gradient-to-br from-purple-500/20 to-indigo-500/20"
              />
              {/* Mobile: Touch scroll */}
              <div className="md:hidden">
                <MobileHorizontalScroll>
                  {randomAlbums.slice(0, 10).map((album) => (
                    <div key={album._id} className="w-36 flex-shrink-0">
                      <AlbumCard album={album} isTouchDevice={isTouchDevice} />
                    </div>
                  ))}
                </MobileHorizontalScroll>
              </div>
              {/* Desktop: Rail with arrows */}
              <div className="hidden md:block">
                <HorizontalRail isTouchDevice={isTouchDevice}>
                  {randomAlbums.slice(0, 12).map((album) => (
                    <div key={album._id} className="w-36 lg:w-40 xl:w-44 flex-shrink-0">
                      <AlbumCard album={album} isTouchDevice={isTouchDevice} />
                    </div>
                  ))}
                </HorizontalRail>
              </div>
            </section>
          </LazySection>
        )}

        {/* Made For You (Lazy) */}
        <LazySection fallbackHeight={280}>
          <section>
            <SectionHeader
              icon={Music2}
              title="Made For You"
              showAll
              gradient="bg-gradient-to-br from-emerald-500/20 to-teal-500/20"
            />
            {/* Mobile */}
            <div className="md:hidden">
              <MobileHorizontalScroll>
                {madeForYouSongs.slice(0, 10).map((song) => (
                  <div key={song._id} className="w-36 flex-shrink-0">
                    <SongCard
                      song={song}
                      onClick={() => playSong(song)}
                      onContextMenu={(e) => openContextMenu(e, song)}
                      onTouchStart={(e) => handleTouchStart(e, song)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      isTouchDevice={isTouchDevice}
                    />
                  </div>
                ))}
              </MobileHorizontalScroll>
            </div>
            {/* Desktop */}
            <div className="hidden md:block">
              <HorizontalRail isTouchDevice={isTouchDevice}>
                {madeForYouSongs.slice(0, 12).map((song) => (
                  <div key={song._id} className="w-36 lg:w-40 xl:w-44 flex-shrink-0">
                    <SongCard
                      song={song}
                      onClick={() => playSong(song)}
                      onContextMenu={(e) => openContextMenu(e, song)}
                      onTouchStart={(e) => handleTouchStart(e, song)}
                      onTouchMove={onTouchMove}
                      onTouchEnd={handleTouchEnd}
                      isTouchDevice={isTouchDevice}
                    />
                  </div>
                ))}
              </HorizontalRail>
            </div>
          </section>
        </LazySection>

        {/* Trending (Lazy) */}
        <LazySection fallbackHeight={280}>
          <section>
            <SectionHeader
              icon={TrendingUp}
              title="Trending Now"
              showAll
              gradient="bg-gradient-to-br from-orange-500/20 to-red-500/20"
            />
            {/* Mobile */}
            <div className="md:hidden">
              <MobileHorizontalScroll>
                {trendingSongs.slice(0, 10).map((song) => (
                  <div key={song._id} className="w-36 flex-shrink-0">
                    <SongCard
                      song={song}
                      onClick={() => playSong(song)}
                      onContextMenu={(e) => openContextMenu(e, song)}
                      onTouchStart={(e) => handleTouchStart(e, song)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      isTouchDevice={isTouchDevice}
                    />
                  </div>
                ))}
              </MobileHorizontalScroll>
            </div>
            {/* Desktop */}
            <div className="hidden md:block">
              <HorizontalRail isTouchDevice={isTouchDevice}>
                {trendingSongs.slice(0, 12).map((song) => (
                  <div key={song._id} className="w-36 lg:w-40 xl:w-44 flex-shrink-0">
                    <SongCard
                      song={song}
                      onClick={() => playSong(song)}
                      onContextMenu={(e) => openContextMenu(e, song)}
                      onTouchStart={(e) => handleTouchStart(e, song)}
                      onTouchMove={onTouchMove}
                      onTouchEnd={handleTouchEnd}
                      isTouchDevice={isTouchDevice}
                    />
                  </div>
                ))}
              </HorizontalRail>
            </div>
          </section>
        </LazySection>

        {/* Bottom spacer for mobile nav */}
        <div className="h-20 md:h-0" />
      </div>
    </div>
  );

  return (
    <main className="h-full bg-zinc-900 rounded-lg overflow-hidden relative">
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-zinc-900 shadow-lg shadow-black/20"
            : "bg-transparent"
        )}
      >
        <Topbar className="bg-transparent backdrop-blur-none" />
      </div>

      {/* Mobile */}
      <div
        ref={mobileScrollRef}
        className="md:hidden h-full overflow-y-auto overscroll-y-contain scrollbar-none"
      >
        {renderPageContent()}
      </div>

      {/* Desktop */}
      <div
        ref={desktopScrollRef}
        className="hidden md:block h-full overflow-y-auto overflow-x-hidden scrollbar-none"
        onScroll={(e) => {
          setIsScrolled(e.currentTarget.scrollTop > heroThreshold);
        }}
      >
        {renderPageContent()}
      </div>

      {/* Song Options */}
      {showOptions && contextSong && (
        <SongOptions
          song={contextSong}
          forceOpen={true}
          onClose={closeContextMenu}
          inlineTrigger={false}
          triggerPosition={contextMenu || undefined}
        />
      )}
    </main>
  );
};

export default HomePage;