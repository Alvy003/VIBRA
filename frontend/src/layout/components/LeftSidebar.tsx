// src/layout/components/LeftSidebar.tsx
import PlaylistSkeleton from "@/components/skeletons/PlaylistSkeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlaylistStore } from "@/stores/usePlaylistStore";
import { useUIStore } from "@/stores/useUIStore";
import { SignedIn, useUser } from "@clerk/clerk-react";
import { 
  HomeIcon, Library, MessageCircle, Search, Heart, Download, 
  ListMusic, Disc3, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useChatStore } from "@/stores/useChatStore";
import { CreatePlaylistDialog } from "../../components/CreatePlaylistDialog";
import { Song } from "@/types";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";

const LibraryEmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center justify-center text-zinc-400 py-10 px-4 text-center">
    <div className="relative bg-zinc-800/50 rounded-full mb-2 p-4">
      <Icon className="size-6 text-zinc-400" />
    </div>

    <h3 className="text-sm font-medium mb-1 text-zinc-300">
      {title}
    </h3>

    <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px]">
      {description}
    </p>
  </div>
);

type LibraryFilter = "all" | "playlists" | "albums";

// Mosaic Thumbnail
const MosaicThumbnail = ({ 
  previewImages,
  songs,
  imageUrl,
  name,
  type
}: { 
  previewImages?: string[];
  songs?: Song[];
  imageUrl?: string | null;
  name: string;
  type: 'playlist' | 'album';
}) => {

  const Icon = type === 'playlist' ? ListMusic : Disc3;
  
  if (imageUrl) {
    return (
      <div className="size-10 rounded-sm overflow-hidden flex-shrink-0">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  const covers =
  previewImages?.length
    ? previewImages.slice(0, 4)
    : (songs || []).map(s => s.imageUrl).filter(Boolean).slice(0, 4);


  if (covers.length === 0) {
    const gradientClass = type === 'playlist' 
      ? 'from-violet-600/30 to-fuchsia-600/30' 
      : 'from-violet-500/30 to-purple-600/30';
    
    return (
      <div className={cn("size-10 rounded-sm flex-shrink-0 bg-gradient-to-br flex items-center justify-center", gradientClass)}>
        <Icon className="size-5 text-violet-400/70" />
      </div>
    );
  }

  if (covers.length < 4) {
    return (
      <div className="size-10 rounded-sm overflow-hidden flex-shrink-0">
        <img src={covers[0]} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="size-10 rounded-sm overflow-hidden flex-shrink-0">
      <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px bg-zinc-800">
        {covers.slice(0, 4).map((cover, i) => (
          <img key={i} src={cover} alt="" className="w-full h-full object-cover" />
        ))}
      </div>
    </div>
  );
};

// Filter Chip
const FilterChip = ({ 
  label, 
  isActive, 
  onClick,
  count
}: { 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap",
      "flex items-center gap-1.5",
      isActive
        ? "bg-white text-black shadow-sm"
        : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 hover:text-white"
    )}
  >
    {label}
    {count !== undefined && count > 0 && (
      <span className={cn(
        "text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
        isActive ? "bg-black/10 text-black/70" : "bg-zinc-700 text-zinc-400"
      )}>
        {count}
      </span>
    )}
  </button>
);

const LeftSidebar = () => {
  const { albums, fetchAlbums, likedSongs, fetchLikedSongs, isLoading: isAlbumLoading } = useMusicStore();
  const { playlists, fetchUserPlaylists, isLoading: isPlaylistLoading } = usePlaylistStore();
  const { unreadMessagesByUser } = useChatStore();
  const { updateAvailable } = useAppUpdate(true);
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();
  
  const { isLeftSidebarCollapsed, toggleLeftSidebar } = useUIStore();
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");
  const [isHovered, setIsHovered] = useState(false);
  const isTouch = useIsTouchDevice();

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchUserPlaylists();
      fetchLikedSongs();
    }
  }, [fetchUserPlaylists, fetchLikedSongs, isLoaded, isSignedIn]);

  const totalUnread = useMemo(
    () => Object.values(unreadMessagesByUser || {}).reduce((a, b) => a + b, 0),
    [unreadMessagesByUser]
  );

  const showPlaylists = libraryFilter === "all" || libraryFilter === "playlists";
  const showAlbums = libraryFilter === "all" || libraryFilter === "albums";
  const isLoading = isAlbumLoading || isPlaylistLoading;

  // Collapsed Nav Item
  const CollapsedNavItem = ({ to, icon: Icon, label, badge, end }: { 
    to: string; 
    icon: typeof HomeIcon; 
    label: string; 
    badge?: boolean;
    end?: boolean;
  }) => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div>
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center size-10 rounded-lg transition-colors",
                "text-zinc-400 hover:text-white hover:bg-zinc-800/60",
                isActive && "bg-zinc-800/60 text-white"
              )
            }
          >
            {({ isActive }) => (
              <Icon 
                className={cn(
                  "size-4 flex-shrink-0",
                  isActive && "text-white",
                  badge && !isActive && "text-violet-400",
                  !isActive && !badge && "text-zinc-400 hover:text-white/95"
                )} 
              />
            )}
          </NavLink>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className="bg-zinc-900 text-white border-zinc-800">
        {label}
      </TooltipContent>
    </Tooltip>
  );

  // Collapsed Library Item
  const CollapsedLibraryItem = ({ to, imageComponent, title, subtitle, isActive }: {
    to: string;
    imageComponent: React.ReactNode;
    title: string;
    subtitle: string;
    isActive: boolean;
  }) => (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link to={to} className="block">
          <div className={cn(
            "flex items-center justify-center p-1 rounded-lg transition-colors",
            "hover:bg-zinc-800/70",
            isActive && "bg-zinc-800/50"
          )}>
            {imageComponent}
          </div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12} className="bg-zinc-900 text-white border-zinc-800">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-zinc-400">{subtitle}</p>
      </TooltipContent>
    </Tooltip>
  );

  // COLLAPSED SIDEBAR
  if (isLeftSidebarCollapsed) {
    return (
      <TooltipProvider>
        <div 
          className="h-full flex flex-col gap-2"
          onMouseEnter={() => !isTouch && setIsHovered(true)}
          onMouseLeave={() => !isTouch && setIsHovered(false)}
        >
          {/* Navigation */}
          <div className="rounded-lg bg-zinc-900 p-0 py-3 flex flex-col items-center">
            <CollapsedNavItem to="/" icon={HomeIcon} label="Home" end />
            <SignedIn>
              <CollapsedNavItem to="/chat" icon={MessageCircle} label="Messages" badge={totalUnread > 0} />
            </SignedIn>
            <CollapsedNavItem to="/search" icon={Search} label="Search" />
            <CollapsedNavItem to="/downloads" icon={Download} label="Downloads" badge={updateAvailable} />
          </div>

          {/* Library */}
          <div className="flex-1 min-h-0 rounded-lg bg-zinc-900 p-3 flex flex-col">
            {/* Library Header with Toggle */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleLeftSidebar}
                  className="flex items-center justify-center size-10 pl-2 rounded-lg hover:bg-zinc-800/60 transition-colors mb-2"
                >
                  {isTouch || isHovered ? (
                    <PanelLeftOpen className="size-5 text-zinc-400 hover:text-white transition-colors" />
                  ) : (
                    <Library className="size-5 text-zinc-400" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="bg-zinc-900 text-white border-zinc-800">
                Expand sidebar
              </TooltipContent>
            </Tooltip>

            {/* Create Playlist */}
            <SignedIn>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center mb-2">
                    <div className="size-10 rounded-sm bg-zinc-800/80 hover:bg-zinc-800/60 transition-colors flex items-center justify-center">
                      <CreatePlaylistDialog />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="bg-zinc-900 text-white border-zinc-800">
                  Create playlist
                </TooltipContent>
              </Tooltip>
            </SignedIn>

            {/* Library Items */}
            <ScrollArea className="flex-1" type="hover">
              <div className="space-y-1 flex flex-col items-center">
                {/* Liked Songs - Collapsed */}
                <SignedIn>
                  <CollapsedLibraryItem
                    to="/favorites"
                    imageComponent={
                      <div className="size-10 rounded-sm bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center">
                        <Heart className="size-5 text-white" fill="white" />
                      </div>
                    }
                    title="Liked Songs"
                    subtitle={`Playlist • ${likedSongs?.length || 0} songs`}
                    isActive={location.pathname === "/favorites"}
                  />
                </SignedIn>

                <SignedIn>
                  {playlists.map((playlist) => (
                    <CollapsedLibraryItem
                      key={playlist._id}
                      to={`/playlists/${playlist._id}`}
                      imageComponent={
                        <MosaicThumbnail 
                          songs={playlist.songs} 
                          imageUrl={playlist.imageUrl}
                          name={playlist.name}
                          type="playlist"
                        />
                      }
                      title={playlist.name}
                      subtitle={`Playlist • ${playlist.songs?.length || 0} songs`}
                      isActive={location.pathname === `/playlists/${playlist._id}`}
                    />
                  ))}
                </SignedIn>

                {albums.map((album) => (
                  <CollapsedLibraryItem
                    key={album._id}
                    to={`/albums/${album._id}`}
                    imageComponent={
                      <MosaicThumbnail 
                        previewImages={album.previewImages}
                        imageUrl={album.imageUrl}
                        name={album.title}
                        type="album"
                      />
                    }
                    title={album.title}
                    subtitle={`Album • ${album.artist}`}
                    isActive={location.pathname === `/albums/${album._id}`}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // EXPANDED SIDEBAR
  return (
    <TooltipProvider>
      <div 
        className="h-full min-h-0 flex flex-col gap-2"
        onMouseEnter={() => !isTouch && setIsHovered(true)}
        onMouseLeave={() => !isTouch && setIsHovered(false)}
      >
        {/* Navigation menu */}
        <div className="rounded-lg bg-zinc-900 p-3">
          <div className="space-y-0.5">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors",
                  "text-zinc-400 hover:text-white/90 hover:bg-zinc-800/60",
                  isActive && "bg-zinc-800/60 text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <HomeIcon className={cn("size-4", isActive && "text-white")} />
                  <span className="font-medium text-sm">Home</span>
                </>
              )}
            </NavLink>

            <SignedIn>
              <NavLink
                to="/chat"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors",
                    "text-zinc-400 hover:text-white/90 hover:bg-zinc-800/60",
                    isActive && "bg-zinc-800/60 text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <MessageCircle className={cn(
                      "size-4",
                      isActive ? "text-white" : totalUnread > 0 ? "text-violet-400" : ""
                    )} />
                    <span className="font-medium text-sm">Messages</span>
                  </>
                )}
              </NavLink>
            </SignedIn>

            <NavLink
              to="/search"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors",
                  "text-zinc-400 hover:text-white/90 hover:bg-zinc-800/60",
                  isActive && "bg-zinc-800/60 text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Search className={cn("size-4", isActive && "text-white")} />
                  <span className="font-medium text-sm">Search</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/downloads"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors",
                  "text-zinc-400 hover:text-white/90 hover:bg-zinc-800/60",
                  isActive && "bg-zinc-800/60 text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Download className={cn(
                    "size-4",
                    isActive ? "text-white" : updateAvailable ? "text-violet-400" : ""
                  )} />
                  <span className="font-medium text-sm">Downloads</span>
                </>
              )}
            </NavLink>
          </div>
        </div>

        {/* Library section */}
        <div className="flex-1 min-h-0 rounded-lg bg-zinc-900 py-3 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 mb-3">
            <button
              onClick={toggleLeftSidebar}
              className="flex items-center gap-3 group"
            >
              {isTouch || isHovered ? (
                <PanelLeftClose className="size-5 text-zinc-400 group-hover:text-white transition-colors" />
              ) : (
                <Library className="size-5 text-zinc-400" />
              )}
              <span className="font-semibold text-sm text-zinc-200">Your Library</span>
            </button>
            <SignedIn>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className="rounded-full bg-zinc-800/60 hover:bg-zinc-800/60 transition-colors p-0.5">
                    <CreatePlaylistDialog />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-zinc-900 text-white border-zinc-800">
                  Create playlist
                </TooltipContent>
              </Tooltip>
            </SignedIn>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 px-3 mb-3 overflow-x-auto scrollbar-none">
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
                count={playlists.length + 1} // +1 for Liked Songs
              />
            </SignedIn>
            <FilterChip
              label="Albums"
              isActive={libraryFilter === "albums"}
              onClick={() => setLibraryFilter("albums")}
              count={albums.length}
            />
          </div>

          {/* Library Items */}
          <ScrollArea className="flex-1 px-2" type="hover">
            <div className="space-y-0.5">
              {/* Liked Songs - Always at top when showing playlists */}
              <SignedIn>
                {showPlaylists && (
                  <>
                    {libraryFilter === "all" && (
                      <div className="px-2 pt-1 pb-2">
                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                          Playlists
                        </p>
                      </div>
                    )}
                    
                    {/* Liked Songs Card */}
                    <Link to="/favorites" className="block">
                      <div className={cn(
                        "flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors",
                        "hover:bg-zinc-800/70",
                        location.pathname === "/favorites" && "bg-zinc-800/60"
                      )}>
                        <div className="size-10 rounded-sm bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center flex-shrink-0">
                          <Heart className="size-5 text-white" fill="white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-normal truncate text-sm text-white">
                            Liked Songs
                          </p>
                          <p className="text-xs text-zinc-400/90 truncate">
                            Playlist • {likedSongs?.length || 0} songs
                          </p>
                        </div>
                      </div>
                    </Link>

                    {/* User Playlists */}
                    {playlists.map((playlist) => (
                      <Link
                        key={playlist._id}
                        to={`/playlists/${playlist._id}`}
                        className="block"
                      >
                        <div className={cn(
                          "flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors",
                          "hover:bg-zinc-800/70",
                          location.pathname === `/playlists/${playlist._id}` && "bg-zinc-800/60"
                        )}>
                          <MosaicThumbnail 
                            songs={playlist.songs} 
                            imageUrl={playlist.imageUrl}
                            name={playlist.name}
                            type="playlist"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-normal truncate text-sm text-white">
                              {playlist.name}
                            </p>
                            <p className="text-xs text-zinc-400/90 truncate">
                              Playlist • {playlist.songs?.length || 0} songs
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </SignedIn>

              {/* Separator */}
              {libraryFilter === "all" && (showPlaylists && (playlists.length > 0 || isSignedIn)) && albums.length > 0 && (
                <div className="h-px bg-zinc-800/50 mx-2 my-2" />
              )}

              {/* Albums */}
              {showAlbums && (
                <>
                  {libraryFilter === "all" && albums.length > 0 && (
                    <div className="px-2 pt-1 pb-2">
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Albums
                      </p>
                    </div>
                  )}

                  {isLoading ? (
                    <PlaylistSkeleton />
                  ) : (
                    albums.map((album) => (
                      <Link
                        key={album._id}
                        to={`/albums/${album._id}`}
                        className="block"
                      >
                        <div className={cn(
                          "flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors",
                          "hover:bg-zinc-800/70",
                          location.pathname === `/albums/${album._id}` && "bg-zinc-800/60"
                        )}>
                          <MosaicThumbnail 
                            previewImages={album.previewImages}
                            imageUrl={album.imageUrl}
                            name={album.title}
                            type="album"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-normal truncate text-sm text-white">
                              {album.title}
                            </p>
                            <p className="text-xs text-zinc-400/90 truncate">
                              Album • {album.artist}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </>
              )}

              {/* Empty states */}
              {libraryFilter === "playlists" && playlists.length === 0 && !isLoading && (
                <LibraryEmptyState
                  icon={ListMusic}
                  title="No playlists yet"
                  description="Create your first playlist"
                />
              )}

              {libraryFilter === "albums" && albums.length === 0 && !isLoading && (
                <LibraryEmptyState
                  icon={Disc3}
                  title="No albums available"
                  description="Albums will appear here"
                />
              )}

            </div>
          </ScrollArea>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default LeftSidebar;