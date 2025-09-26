// src/components/admin/PlaylistsTabContent.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListMusic } from "lucide-react";
import AddPlaylistDialog from "./AddPlaylistDialog";
import PlaylistsTable from "./PlaylistsTable";
import { usePlaylistStore } from "@/stores/usePlaylistStore";
import { useEffect } from "react";

const PlaylistsTabContent = () => {
  const { fetchPlaylists, loading } = usePlaylistStore();

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  return (
    <Card className="bg-zinc-800/50 border-zinc-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListMusic className="h-5 w-5 text-violet-500" />
              Playlists
            </CardTitle>
            <CardDescription>Manage your playlists</CardDescription>
          </div>
          <AddPlaylistDialog />
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-zinc-400">Loading playlists...</p>
        ) : (
          <PlaylistsTable />
        )}
      </CardContent>
    </Card>
  );
};

export default PlaylistsTabContent;
