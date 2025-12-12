import PlaylistSkeleton from "@/components/skeletons/PlaylistSkeleton";
import { buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlaylistStore } from "@/stores/usePlaylistStore";
import { SignedIn, useUser } from "@clerk/clerk-react";
import { HomeIcon, Library, MessageCircle, Search, Heart, Download, ListMusic, Disc3 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useChatStore } from "@/stores/useChatStore";
import { CreatePlaylistDialog } from "../../components/CreatePlaylistDialog";
import { Song } from "@/types";
import { useAppUpdate } from "@/hooks/useAppUpdate";

// Shared Mosaic Thumbnail Component
const MosaicThumbnail = ({ 
  songs, 
  imageUrl,
  name,
  type
}: { 
  songs?: Song[]; 
  imageUrl?: string;
  name: string;
  type: 'playlist' | 'album';
}) => {
  const Icon = type === 'playlist' ? ListMusic : Disc3;
  
  // If has custom image, use it
  if (imageUrl) {
    return (
      <div className="size-12 rounded-md ring-1 ring-white/5 overflow-hidden relative group/thumb">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-start p-1.5 md:opacity-0 md:group-hover/thumb:opacity-100 transition-opacity">
          <div className="bg-black/50 backdrop-blur-sm rounded p-0.5">
            <Icon className="size-3 text-white/80" />
          </div>
        </div>
      </div>
    );
  }

  const covers = (songs || []).slice(0, 4).map((s) => s.imageUrl).filter(Boolean);

  // No songs - show placeholder
  if (covers.length === 0) {
    const gradientClass = type === 'playlist' 
      ? 'from-violet-600/30 to-fuchsia-600/30' 
      : 'from-violet-500/30 to-purple-600/30';
    
    return (
      <div className={`size-12 rounded-md bg-gradient-to-br ${gradientClass} ring-1 ring-white/5 flex items-center justify-center`}>
        <Icon className="size-5 text-violet-400/70" />
      </div>
    );
  }

  // Less than 4 songs - show first cover
  if (covers.length < 4) {
    return (
      <div className="size-12 rounded-md ring-1 ring-white/5 overflow-hidden relative group/thumb">
        <img src={covers[0]} alt={name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-start p-1.5 md:opacity-0 md:group-hover/thumb:opacity-100 transition-opacity">
          <div className="bg-black/50 backdrop-blur-sm rounded p-0.5">
            <Icon className="size-3 text-white/80" />
          </div>
        </div>
      </div>
    );
  }

  // 4+ songs - show mosaic
  return (
    <div className="size-12 rounded-md ring-1 ring-white/5 overflow-hidden relative group/thumb">
      <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px bg-zinc-800">
        {covers.slice(0, 4).map((cover, i) => (
          <img key={i} src={cover} alt="" className="w-full h-full object-cover" />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-start p-1.5 md:opacity-0 md:group-hover/thumb:opacity-100 transition-opacity">
        <div className="bg-black/50 backdrop-blur-sm rounded p-0.5">
          <Icon className="size-3 text-white/80" />
        </div>
      </div>
    </div>
  );
};

const LeftSidebar = () => {
  const { albums, fetchAlbums, isLoading: isAlbumLoading } = useMusicStore();
  const { playlists, fetchUserPlaylists, isLoading: isPlaylistLoading } = usePlaylistStore();
  const { unreadMessagesByUser } = useChatStore();
  const { updateAvailable } = useAppUpdate(true);
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchUserPlaylists();
    }
  }, [fetchUserPlaylists, isLoaded, isSignedIn]);

  const totalUnread = useMemo(
    () => Object.values(unreadMessagesByUser || {}).reduce((a, b) => a + b, 0),
    [unreadMessagesByUser]
  );

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      buttonVariants({
        variant: "ghost",
        className:
          "w-full justify-start text-white lg:hover:bg-zinc-800 relative pl-3 transition-all duration-200",
      }),
      isActive && "bg-zinc-800/70 border-l-2 border-violet-500"
    );

  const isLoading = isAlbumLoading || isPlaylistLoading;

  return (
    <div className="h-full min-h-0 flex flex-col gap-2">
      {/* Navigation menu */}
      <div className="rounded-lg bg-zinc-900 p-4">
        <div className="space-y-2">
          <NavLink to="/" end className={navClass}>
            {({ isActive }) => (
              <>
                <HomeIcon className={cn("mr-2 size-5 transition-colors", isActive && "text-violet-400")} />
                <span className="hidden md:inline">Home</span>
              </>
            )}
          </NavLink>

          <SignedIn>
            <NavLink to="/chat" className={navClass}>
              {({ isActive }) => (
                <>
                  <MessageCircle
                    className={cn(
                      "mr-2 size-5 transition-colors",
                      isActive ? "text-violet-400" : totalUnread > 0 ? "text-violet-400 animate-pulse" : ""
                    )}
                  />
                  <span className="hidden md:inline">Messages</span>
                </>
              )}
            </NavLink>
          </SignedIn>

          <NavLink to="/search" className={navClass}>
            {({ isActive }) => (
              <>
                <Search className={cn("mr-2 size-5 transition-colors", isActive && "text-violet-400")} />
                <span className="hidden md:inline">Search</span>
              </>
            )}
          </NavLink>

          <SignedIn>
            <NavLink to="/favorites" className={navClass}>
              {({ isActive }) => (
                <>
                  <Heart className={cn("mr-2 size-5 transition-colors", isActive && "text-violet-400")} />
                  <span className="hidden md:inline">Favourites</span>
                </>
              )}
            </NavLink>
          </SignedIn>

          <NavLink to="/downloads" className={navClass}>
            {({ isActive }) => (
              <>
                <Download
                  className={cn(
                    "mr-2 size-5 transition-colors",
                    isActive ? "text-violet-400" : updateAvailable ? "text-violet-400 animate-pulse" : ""
                  )}
                />
                <span className="hidden md:inline">Downloads</span>
              </>
            )}
          </NavLink>
        </div>
      </div>

       {/* Library section */}
       <div className="flex-1 min-h-0 mb-12 sm:mb-0 rounded-lg bg-zinc-900 py-3 px-0 flex flex-col">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2 px-2 shrink-0">
          <div className="flex items-center ml-2 text-white">
            <Library className="size-5 mr-2 ml-2 sm:ml-0 text-violet-400" />
            <span className="hidden md:inline font-semibold">Library</span>
          </div>

          {/* Wide sidebar: circular + with subtle hover */}
          <SignedIn>
            <div className="hidden md:flex items-center justify-center">
              <div className="rounded-xl bg-zinc-800/80 transition-colors duration-150 p-0.5">
                <CreatePlaylistDialog />
              </div>
            </div>
          </SignedIn>
        </div>

        {/* Narrow sidebar: + aligned with list items, no hover change */}
        <SignedIn>
          <div className="md:hidden mb-3 px-2 ml-1 flex items-center">
            <div className="rounded-lg bg-zinc-800/90 p-2 mt-3">
              <CreatePlaylistDialog />
            </div>
          </div>
        </SignedIn>

        <ScrollArea className="flex-1 h-full scrollarea-no-bar" type="hover">
          <div className="space-y-1 pb-2">
            
            {/* User Playlists */}
            <SignedIn>
              {playlists.map((playlist) => (
                <Link
                  to={`/playlists/${playlist._id}`}
                  key={playlist._id}
                  className="relative md:group block"
                >
                  <div className={cn(
                    "p-2 rounded-lg flex items-center ml-1 gap-3 cursor-pointer transition-all duration-200",
                    "md:hover:bg-zinc-800/70",
                    location.pathname === `/playlists/${playlist._id}` && "bg-zinc-800/50 ring-1 ring-violet-500/20"
                  )}>
                    <div className="shrink-0">
                      <MosaicThumbnail 
                        songs={playlist.songs} 
                        imageUrl={playlist.imageUrl}
                        name={playlist.name}
                        type="playlist"
                      />
                    </div>
                    <div className="flex-1 min-w-0 hidden md:block">
                      <p className={cn(
                        "font-medium truncate text-sm", 
                        location.pathname === `/playlists/${playlist._id}` ? "text-violet-300" : "text-white"
                      )}>
                        {playlist.name}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        Playlist • {playlist.songs?.length || 0} songs
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </SignedIn>

            {/* Separator if both exist */}
            {playlists.length > 0 && albums.length > 0 && (
              <div className="h-px bg-zinc-800 mx-2 my-2" />
            )}

            {/* Admin Albums - Now with Mosaic */}
            {isLoading ? (
              <PlaylistSkeleton />
            ) : (
              albums.map((album) => (
                <Link
                  to={`/albums/${album._id}`}
                  key={album._id}
                  className="relative md:group block"
                >
                  <div className={cn(
                    "p-2 rounded-lg flex items-center ml-1 gap-3 cursor-pointer transition-all duration-200",
                    "md:hover:bg-zinc-800/70",
                    location.pathname === `/albums/${album._id}` && "bg-zinc-800/50 ring-1 ring-violet-500/20"
                  )}>
                    <div className="shrink-0">
                      {/* Use album.imageUrl if exists, otherwise create mosaic from songs */}
                      <MosaicThumbnail 
                        songs={album.songs} 
                        imageUrl={album.imageUrl}
                        name={album.title}
                        type="album"
                      />
                    </div>
                    <div className="flex-1 min-w-0 hidden md:block">
                      <p className={cn(
                        "font-medium truncate text-sm", 
                        location.pathname === `/albums/${album._id}` ? "text-violet-300" : "text-white"
                      )}>
                        {album.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        Album • {album.artist}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default LeftSidebar;