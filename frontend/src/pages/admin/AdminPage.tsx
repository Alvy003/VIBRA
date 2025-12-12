import { useAuthStore } from "@/stores/useAuthStore";
import Header from "./components/Header";
import DashboardStats from "./components/DashboardStats";
import { Album, Music, ListMusic } from "lucide-react"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SongsTabContent from "./components/SongsTabContent";
import AlbumsTabContent from "./components/AlbumsTabContent";
// import PlaylistsTabContent from "./components/PlaylistsTabContent";
import { useEffect } from "react";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlaylistStore } from "@/stores/usePlaylistStore"; 

const AdminPage = () => {
  const { isAdmin } = useAuthStore();

  const { fetchAlbums, fetchSongs, fetchStats } = useMusicStore();
  const { fetchAllPlaylists  } = usePlaylistStore(); 

  useEffect(() => {
    fetchAlbums();
    fetchSongs();
    fetchStats();
    fetchAllPlaylists(); 
  }, [fetchAlbums, fetchSongs, fetchStats, fetchAllPlaylists]);

  if (!isAdmin) return <div>Unauthorized</div>;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900
   to-black text-zinc-100 p-8"
    >
      <Header />

      <DashboardStats />

      <Tabs defaultValue="songs" className="space-y-6">
        <TabsList className="p-1 bg-zinc-800/50">
          <TabsTrigger value="songs" className="data-[state=active]:bg-zinc-700">
            <Music className="mr-2 size-4" />
            Songs
          </TabsTrigger>
          <TabsTrigger value="albums" className="data-[state=active]:bg-zinc-700">
            <Album className="mr-2 size-4" />
            Albums
          </TabsTrigger>
          <TabsTrigger value="playlists" disabled className="data-[state=active]:bg-zinc-700">
            <ListMusic className="mr-2 size-4" />
            Playlists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="songs">
          <SongsTabContent />
        </TabsContent>
        <TabsContent value="albums">
          <AlbumsTabContent />
        </TabsContent>
        <TabsContent value="playlists">
          {/* <PlaylistsTabContent /> */}
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default AdminPage;
