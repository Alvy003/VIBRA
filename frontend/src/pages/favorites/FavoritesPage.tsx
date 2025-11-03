import { useUser } from "@clerk/clerk-react";
import Topbar from "@/components/Topbar";
import { useEffect } from "react";
import { useMusicStore } from "@/stores/useMusicStore";
import SongsTable from "../admin/components/SongsTable";
import { ScrollArea } from "@/components/ui/scroll-area";

const FavoritesPage = () => {
  const { isSignedIn, isLoaded } = useUser();
  const { likedSongs, fetchLikedSongs } = useMusicStore();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchLikedSongs();
    }
  }, [isLoaded, isSignedIn, fetchLikedSongs]);

  const hasFavourites = likedSongs && likedSongs.length > 0;

  return (
    <main className="h-full rounded-md overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-900">
      <Topbar />
      <ScrollArea className="h-[calc(100vh-145px)] lg:h-[calc(100vh-180px)]">
        <div className="px-4 sm:px-6">
          {/* Sticky title with built-in breathing room */}
          <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-gradient-to-b from-zinc-900/70 to-transparent backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60">
            <h1 className="text-2xl sm:text-3xl font-bold py-3">Favourites</h1>
          </div>

          {/* Persistent gap below the sticky header */}
          <div className="mt-2">
            {hasFavourites ? (
              <SongsTable songs={likedSongs} hideActions />
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 text-zinc-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-16 h-16 mb-4 text-violet-500 animate-pulse"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 
                    4.42 3 7.5 3c1.74 0 3.41.81 4.5 
                    2.09C13.09 3.81 14.76 3 16.5 
                    3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 
                    6.86-8.55 11.54L12 21.35z"
                  />
                </svg>
                <p className="text-lg font-medium">No favourites yet</p>
                <p className="mt-2 text-sm text-zinc-500">Like songs to see them appear here.</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </main>
  );
};

export default FavoritesPage;