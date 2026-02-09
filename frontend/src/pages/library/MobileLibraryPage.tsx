// src/pages/library/MobileLibraryPage.tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlaylistStore } from "@/stores/usePlaylistStore";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, ListMusic, Disc3, Library, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreatePlaylistDialog } from "@/components/CreatePlaylistDialog";
import { AnimatePresence, motion } from "framer-motion";
import { Song } from "@/types";
import Topbar from "@/components/Topbar";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import MobileSubHeader from "@/components/MobileSubHeader";
import MobileLibraryPageSkeleton from "./components/MobileLibraryPageSkeleton";

type LibraryFilter = "all" | "playlists" | "albums";

// Filter Chip Component
const FilterChip = ({
  label,
  isActive,
  onClick,
  count,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
      "flex items-center gap-1.5",
      isActive
        ? "bg-white text-black"
        : "bg-zinc-800 text-zinc-300 active:bg-zinc-700"
    )}
  >
    {label}
    {count !== undefined && count > 0 && (
      <span
        className={cn(
          "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
          isActive ? "bg-black/10 text-black/70" : "bg-zinc-700 text-zinc-400"
        )}
      >
        {count}
      </span>
    )}
  </button>
);

// Mosaic Thumbnail Component
const MosaicThumbnail = ({
  previewImages,
  songs,
  imageUrl,
  name,
  type,
}: {
  previewImages?: string[];
  songs?: Song[];
  imageUrl?: string | null;
  name: string;
  type: "playlist" | "album";
}) => {
  const Icon = type === "playlist" ? ListMusic : Disc3;

  if (imageUrl) {
    return (
      <div className="size-12 rounded-md overflow-hidden bg-zinc-800">
        <img src={imageUrl} alt={name} loading="lazy" className="w-full h-full object-cover" />
      </div>
    );
  }

  const covers =
    previewImages?.length
      ? previewImages.slice(0, 4)
      : (songs || []).map((s) => s.imageUrl).filter(Boolean).slice(0, 4);

  if (covers.length === 0) {
    const gradientClass =
      type === "playlist"
        ? "from-violet-600/30 to-fuchsia-600/30"
        : "from-violet-500/30 to-purple-600/30";

    return (
      <div
        className={cn(
          "size-12 rounded-md flex items-center justify-center bg-gradient-to-br",
          gradientClass
        )}
      >
        <Icon className="size-6 text-violet-400/70" />
      </div>
    );
  }

  if (covers.length < 4) {
    return (
      <div className="size-12 rounded-md overflow-hidden bg-zinc-800">
        <img
          src={covers[0]}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="size-12 rounded-md overflow-hidden bg-zinc-800">
      <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 bg-zinc-800">
        {covers.slice(0, 4).map((cover, i) => (
          <img key={i} src={cover} alt="" loading="lazy" className="w-full h-full object-cover" />
        ))}
      </div>
    </div>
  );
};

// Section Header Component
const SectionHeader = ({
  title,
  count,
  showSeeAll = false,
  seeAllLink,
}: {
  title: string;
  count?: number;
  showSeeAll?: boolean;
  seeAllLink?: string;
}) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
        {title}
      </h2>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-zinc-600">{count}</span>
      )}
    </div>
    {showSeeAll && seeAllLink && (
      <Link
        to={seeAllLink}
        className="flex items-center gap-0.5 text-zinc-400/60 active:text-zinc-300 transition-colors"
      >
        <span className="text-xs">See all</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    )}
  </div>
);

// Empty State Component
const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionLink,
}: {
  icon: typeof ListMusic;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div className="relative bg-zinc-800/50 rounded-full mb-1 p-4">
      <Icon className="size-7 text-zinc-400" />
    </div>
    <h3 className="text-lg font-medium mb-1 text-zinc-300">{title}</h3>
    <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
    {actionLabel && actionLink && (
      <Link
        to={actionLink}
        className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full active:bg-zinc-200 transition-colors"
      >
        {actionLabel}
      </Link>
    )}
  </div>
);

const MobileLibraryPage = () => {
  const {
    albums,
    fetchAlbums,
    likedSongs,
    fetchLikedSongs,
    isLoading: isAlbumLoading,
  } = useMusicStore();
  const {
    playlists,
    fetchUserPlaylists,
    isLoading: isPlaylistLoading,
  } = usePlaylistStore();
  const { isSignedIn, isLoaded } = useUser();
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");

  // Track if we've done the initial load
  const hasInitiallyLoadedRef = useRef(false);
  const [showSkeleton, setShowSkeleton] = useState(
    !hasInitiallyLoadedRef.current
  );

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchUserPlaylists();
      fetchLikedSongs();
    }
  }, [fetchUserPlaylists, fetchLikedSongs, isLoaded, isSignedIn]);

  // Only show skeleton on first load, not on subsequent visits
  useEffect(() => {
    if (isLoaded && !isPlaylistLoading && !isAlbumLoading) {
      hasInitiallyLoadedRef.current = true;
      setShowSkeleton(false);
    }
  }, [isLoaded, isPlaylistLoading, isAlbumLoading]);

  const showPlaylistsSection =
    libraryFilter === "playlists" ||
    (libraryFilter === "all" && (playlists.length > 0 || isSignedIn));

  const showAlbumsSection =
    libraryFilter === "albums" || (libraryFilter === "all" && albums.length > 0);

  // Show skeleton only on first load when there's no cached data
  const shouldShowSkeleton =
    showSkeleton &&
    !hasInitiallyLoadedRef.current &&
    (!isLoaded || (isSignedIn && (isPlaylistLoading || isAlbumLoading))) &&
    albums.length === 0 &&
    playlists.length === 0;

  if (shouldShowSkeleton) {
    return <MobileLibraryPageSkeleton />;
  }

  return (
    <main className="h-full bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-900 rounded-lg overflow-hidden">
      <Topbar />

      <ScrollArea className="h-[calc(100vh-45px)] lg:h-[calc(100vh-180px)]">
        {/* Library Header with Recent & Create Playlist Buttons */}
        <MobileSubHeader
          title="Your Library"
          className="ml-1"
          rightSlot={
            <SignedIn>
              <div className="flex items-center gap-2 pr-2">
                {/* Recent Button */}
                <Link
                  to="/library/recently-played"
                  className={cn(
                    "flex items-center justify-center size-9 rounded-full",
                    "bg-zinc-800/80 active:bg-zinc-700 transition-colors"
                  )}
                  aria-label="Recently played"
                >
                  <Clock className="size-[18px] text-zinc-300" />
                </Link>

                {/* Create Playlist Button */}
                <CreatePlaylistDialog />
              </div>
            </SignedIn>
          }
        />

        <div className="px-4 pb-4 space-y-5">
          {/* Filter Chips */}
          <div
            className="sticky top-11 z-10 backdrop-blur
                flex items-center gap-2 overflow-x-auto scrollbar-none
                -mx-4 px-4 py-2"
          >
            <FilterChip
              label="All"
              isActive={libraryFilter === "all"}
              onClick={() => setLibraryFilter("all")}
            />
            <SignedIn>
              <FilterChip
                label="Playlists"
                isActive={libraryFilter === "playlists"}
                onClick={() => setLibraryFilter("playlists")}
                count={playlists.length + (likedSongs?.length > 0 ? 1 : 0)}
              />
            </SignedIn>
            <FilterChip
              label="Albums"
              isActive={libraryFilter === "albums"}
              onClick={() => setLibraryFilter("albums")}
              count={albums.length}
            />
          </div>

          {/* Playlists Section (including Liked Songs) */}
          <SignedIn>
            <AnimatePresence>
              {showPlaylistsSection && (
                <motion.section
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1"
                >
                  {(libraryFilter === "all" || libraryFilter === "playlists") && (
                    <SectionHeader title="Playlists" />
                  )}

                  {isPlaylistLoading && playlists.length === 0 ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2 animate-pulse"
                        >
                          <div className="size-12 bg-zinc-800 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-zinc-800 rounded w-3/4" />
                            <div className="h-3 bg-zinc-800 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {/* Liked Songs - Always first in playlists */}
                      <div>
                        <Link
                          to="/favorites"
                          className="flex items-center gap-3 p-2 -mx-2 rounded-xl active:bg-white/5 transition-colors"
                        >
                          <div className="size-12 rounded-md bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shrink-0">
                            <Heart className="size-6 text-white" fill="white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-white line-clamp-1">
                              Liked Songs
                            </p>
                            <p className="text-xs text-zinc-400 line-clamp-1">
                              Playlist • {likedSongs?.length || 0} songs
                            </p>
                          </div>
                        </Link>
                      </div>

                      {/* User Playlists */}
                      {playlists.length === 0 && libraryFilter === "playlists" ? (
                        <div className="pt-4">
                          <EmptyState
                            icon={ListMusic}
                            title="No playlists yet"
                            description="Create your first playlist to organize your favorite songs"
                          />
                        </div>
                      ) : (
                        playlists.map((playlist) => (
                          <div key={playlist._id}>
                            <Link
                              to={`/playlists/${playlist._id}`}
                              className="flex items-center gap-3 p-2 -mx-2 rounded-xl active:bg-white/5 transition-colors"
                            >
                              <MosaicThumbnail
                                songs={playlist.songs}
                                imageUrl={playlist.imageUrl}
                                name={playlist.name}
                                type="playlist"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-white line-clamp-1">
                                  {playlist.name}
                                </p>
                                <p className="text-xs text-zinc-400 line-clamp-1">
                                  Playlist • {playlist.songs?.length || 0} songs
                                </p>
                              </div>
                            </Link>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </SignedIn>

          {/* Albums Section */}
          <AnimatePresence>
            {showAlbumsSection && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                {(libraryFilter === "all" || albums.length > 0) && (
                  <SectionHeader title="Albums" />
                )}

                {isAlbumLoading && albums.length === 0 ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 animate-pulse"
                      >
                        <div className="size-12 bg-zinc-800 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-zinc-800 rounded w-3/4" />
                          <div className="h-3 bg-zinc-800 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : albums.length === 0 ? (
                  libraryFilter === "albums" ? (
                    <EmptyState
                      icon={Disc3}
                      title="No albums yet"
                      description="Discover new music and albums will appear here"
                      actionLabel="Explore"
                      actionLink="/search"
                    />
                  ) : null
                ) : (
                  <div className="space-y-0.5">
                    {albums.map((album) => (
                      <div key={album._id}>
                        <Link
                          to={`/albums/${album._id}`}
                          className="flex items-center gap-3 p-2 -mx-2 rounded-xl active:bg-white/5 transition-colors"
                        >
                          <MosaicThumbnail
                            previewImages={album.previewImages}
                            imageUrl={album.imageUrl}
                            name={album.title}
                            type="album"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-white line-clamp-1">
                              {album.title}
                            </p>
                            <p className="text-xs text-zinc-400 line-clamp-1">
                              Album • {album.artist}
                            </p>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* Sign in prompt */}
          <SignedOut>
            <EmptyState
              icon={Library}
              title="Sign in to see your library"
              description="Create playlists, like songs, and access your listening history"
            />
          </SignedOut>

          <MobileOverlaySpacer />
        </div>
      </ScrollArea>
    </main>
  );
};

export default MobileLibraryPage;