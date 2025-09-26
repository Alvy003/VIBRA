// src/pages/admin/components/SongMenu.tsx
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { MoreHorizontal } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { usePlaylistStore } from "@/stores/usePlaylistStore";
  import { useMusicStore } from "@/stores/useMusicStore";
  import { Song } from "@/types";
  import { useEffect } from "react";
  import toast from "react-hot-toast";
  
  interface SongMenuProps {
    song: Song;
  }
  
  const SongMenu = ({ song }: SongMenuProps) => {
    const { playlists, fetchPlaylists, patchPlaylistSongs } = usePlaylistStore();
    const { albums, fetchAlbums, patchAlbumSongs } = useMusicStore();
  
    useEffect(() => {
      fetchPlaylists();
      fetchAlbums();
    }, [fetchPlaylists, fetchAlbums]);
  
    const handleTogglePlaylist = async (playlistId: string, checked: boolean) => {
      try {
        await patchPlaylistSongs(playlistId, {
          op: checked ? "add" : "remove",
          songId: song._id,
        });
        toast.success(`Song ${checked ? "added to" : "removed from"} playlist`);
      } catch {
        toast.error("Failed to update playlist");
      }
    };
  
    const handleToggleAlbum = async (albumId: string, checked: boolean) => {
      try {
        await patchAlbumSongs(albumId, {
          op: checked ? "add" : "remove",
          songId: song._id,
        });
        toast.success(`Song ${checked ? "added to" : "removed from"} album`);
      } catch {
        toast.error("Failed to update album");
      }
    };
  
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
          <DropdownMenuLabel>Manage Song</DropdownMenuLabel>
          <DropdownMenuSeparator />
  
          <DropdownMenuLabel>Playlists</DropdownMenuLabel>
          {playlists.map((pl) => {
            const isInPlaylist = pl.songs.some((s) => s._id === song._id);
            return (
              <DropdownMenuCheckboxItem
                key={pl._id}
                checked={isInPlaylist}
                onCheckedChange={(checked) =>
                  handleTogglePlaylist(pl._id, checked)
                }
              >
                {pl.name}
              </DropdownMenuCheckboxItem>
            );
          })}
  
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Albums</DropdownMenuLabel>
          {albums.map((al) => {
            const isInAlbum = al.songs.some((s) => s._id === song._id);
            return (
              <DropdownMenuCheckboxItem
                key={al._id}
                checked={isInAlbum}
                onCheckedChange={(checked) =>
                  handleToggleAlbum(al._id, checked)
                }
              >
                {al.title}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
  
  export default SongMenu;
  