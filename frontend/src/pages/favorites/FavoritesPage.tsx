// src/pages/favorites/FavoritesPage.tsx
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

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-800 to-zinc-900">
      <Topbar />
      <ScrollArea className="h-[calc(100vh-155px)]">
        <div className="p-4 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">Favourites</h1>
          <SongsTable songs={likedSongs} hideActions />
        </div>
      </ScrollArea>
    </main>
  );
};

export default FavoritesPage;
