import PlaylistSkeleton from "@/components/skeletons/PlaylistSkeleton";
import { buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMusicStore } from "@/stores/useMusicStore";
import { SignedIn } from "@clerk/clerk-react";
import { HomeIcon, Library, MessageCircle, Search, Heart, Download, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useChatStore } from "@/stores/useChatStore";

const LAST_PAGE_KEY = 'vibra_last_page';

const LeftSidebar = () => {
  const { albums, fetchAlbums, isLoading } = useMusicStore();
  const { unreadMessagesByUser } = useChatStore();
  const location = useLocation();
  const [hoveredAlbum, setHoveredAlbum] = useState<string | null>(null);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  useEffect(() => {
    const currentPath = location.pathname;
    const cacheableRoutes = ['/', '/chat', '/search', '/favorites', '/downloads'];
    
    if (cacheableRoutes.includes(currentPath)) {
      localStorage.setItem(LAST_PAGE_KEY, currentPath);
    }
  }, [location.pathname]);

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
                  {/* {totalUnread > 0 && (
                    <span className="ml-auto bg-violet-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                      {totalUnread}
                    </span>
                  )} */}
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
                <Download className={cn("mr-2 size-5 transition-colors", isActive && "text-violet-400")} />
                <span className="hidden md:inline">Downloads</span>
              </>
            )}
          </NavLink>
        </div>
      </div>

      {/* ✅ Polished Library section */}
      <div className="flex-1 min-h-0 rounded-lg bg-zinc-900 p-3 flex flex-col">
        <div className="flex items-center justify-between mb-3 px-2 shrink-0">
          <div className="flex items-center text-white">
            <Library className="size-5 mr-2 text-violet-400" />
            <span className="hidden md:inline font-semibold">Playlists</span>
          </div>
          {!isLoading && albums.length > 0 && (
            <span className="hidden md:inline text-xs text-zinc-500">
              {albums.length} {albums.length === 1 ? 'playlist' : 'playlists'}
            </span>
          )}
        </div>

        <ScrollArea className="flex-1 h-full scrollarea-no-bar" type="hover">
          <div className="space-y-2 pr-1 pb-2">
            {isLoading ? (
              <PlaylistSkeleton />
            ) : albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Library className="size-10 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">No playlists yet</p>
              </div>
            ) : (
              albums.map((album) => (
                <Link
                  to={`/albums/${album._id}`}
                  key={album._id}
                  onMouseEnter={() => setHoveredAlbum(album._id)}
                  onMouseLeave={() => setHoveredAlbum(null)}
                  className="relative group block"
                >
                  <div className={cn(
                    "p-2 rounded-lg flex items-center gap-3 cursor-pointer transition-all duration-200",
                    "hover:bg-zinc-800/70 hover:shadow-lg hover:shadow-violet-500/5",
                    location.pathname === `/albums/${album._id}` && "bg-zinc-800/50 ring-1 ring-violet-500/20"
                  )}>
                    {/* Album Art with Overlay */}
                    <div className="relative shrink-0">
                      <img
                        src={album.imageUrl}
                        alt={album.title}
                        className="size-12 -ml-1 rounded-md object-cover ring-1 ring-white/5 transition-all duration-200 group-hover:ring-violet-500/30"
                      />
                      
                      {/* Gradient overlay on hover */}
                      <div className={cn(
                        "absolute inset-0 rounded-md bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-200",
                        hoveredAlbum === album._id && "opacity-100"
                      )} />
                      
                      {/* Play icon on hover */}
                      {hoveredAlbum === album._id && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-violet-600 rounded-full p-1.5 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200">
                            <Play className="size-3 text-white fill-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Album Info */}
                    <div className="flex-1 min-w-0 hidden md:block">
                      <p className={cn(
                        "font-medium truncate text-sm transition-colors",
                        hoveredAlbum === album._id ? "text-violet-300" : "text-white"
                      )}>
                        {album.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate flex items-center gap-1">
                        <span className="text-zinc-500">Playlist</span>
                        <span className="text-zinc-600">•</span>
                        <span>{album.artist}</span>
                      </p>
                    </div>

                    {/* Active indicator */}
                    {location.pathname === `/albums/${album._id}` && (
                      <div className="hidden md:block shrink-0">
                        <div className="w-1 h-8 bg-violet-500 rounded-full" />
                      </div>
                    )}
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