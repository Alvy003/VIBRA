// src/pages/admin/AdminPage.tsx
import { useAuthStore } from "@/stores/useAuthStore";
import Header from "./components/Header";
import DashboardStats from "./components/DashboardStats";
import { Album, Music, ListMusic } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SongsTabContent from "./components/SongsTabContent";
import AlbumsTabContent from "./components/AlbumsTabContent";
import { useEffect } from "react";
import { useMusicStore } from "@/stores/useMusicStore";
import { ScrollArea } from "@/components/ui/scroll-area";

const AdminPage = () => {
  const { isAdmin } = useAuthStore();
  const { fetchAlbums, fetchSongs, fetchStats } = useMusicStore();

  useEffect(() => {
    fetchAlbums();
    fetchSongs();
    fetchStats();
  }, [fetchAlbums, fetchSongs, fetchStats]);

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-900">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
          <p className="text-zinc-400">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-gradient-to-b from-zinc-900 via-zinc-900 to-black text-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <Header />
          <DashboardStats />

          <Tabs defaultValue="songs" className="space-y-4">
            <TabsList className="bg-zinc-800/60 border border-zinc-700/50 p-1 h-auto">
              <TabsTrigger
                value="songs"
                className="data-[state=active]:bg-violet-600 data-[state=active]:text-black px-4 py-2 text-sm font-medium transition-all"
              >
                <Music className="mr-2 size-4" />
                Songs
              </TabsTrigger>
              <TabsTrigger
                value="albums"
                className="data-[state=active]:bg-violet-600 data-[state=active]:text-black px-4 py-2 text-sm font-medium transition-all"
              >
                <Album className="mr-2 size-4" />
                Albums
              </TabsTrigger>
              <TabsTrigger
                value="playlists"
                disabled
                className="data-[state=active]:bg-violet-600 data-[state=active]:text-black px-4 py-2 text-sm font-medium opacity-50 cursor-not-allowed"
              >
                <ListMusic className="mr-2 size-4" />
                Playlists
              </TabsTrigger>
            </TabsList>

            <TabsContent value="songs" className="mt-4">
              <SongsTabContent />
            </TabsContent>
            <TabsContent value="albums" className="mt-4">
              <AlbumsTabContent />
            </TabsContent>
            <TabsContent value="playlists">
              {/* Coming soon */}
            </TabsContent>
          </Tabs>

          {/* Bottom spacer */}
          <div className="h-8" />
        </div>
      </div>
    </ScrollArea>
  );
};

export default AdminPage;