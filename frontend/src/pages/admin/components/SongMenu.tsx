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
  import { useMusicStore } from "@/stores/useMusicStore";
  import { Song } from "@/types";
  import { useEffect } from "react";
  import toast from "react-hot-toast";
  
  interface SongMenuProps {
    song: Song;
  }
  
  const SongMenu = ({ song }: SongMenuProps) => {
    const { albums, fetchAlbums, patchAlbumSongs } = useMusicStore();
  
    useEffect(() => {
      fetchAlbums();
    }, [ fetchAlbums]);
  

  
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
  