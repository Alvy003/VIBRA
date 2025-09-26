import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMusicStore } from "@/stores/useMusicStore";
import { Trash2 } from "lucide-react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import LikeButton from "@/pages/home/components/LikeButton";

interface SongsTableProps {
  songs?: any[]; // if provided, override store songs (e.g. Favorites)
  hideActions?: boolean; // optional flag to hide delete button (for user-facing lists)
}

const SongsTable = ({ songs: overrideSongs, hideActions = false }: SongsTableProps) => {
  const { songs, isLoading, error, deleteSong } = useMusicStore();
  const { initializeQueue } = usePlayerStore();

  // decide which songs to render
  const renderSongs = overrideSongs ?? songs;

  if (isLoading && !overrideSongs) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-zinc-400">Loading songs...</div>
      </div>
    );
  }

  if (error && !overrideSongs) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-zinc-800/50">
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Artist</TableHead>
          <TableHead className="text-right"></TableHead>
          {!hideActions && (
            <TableHead className="hidden sm:table-cell text-right">Actions</TableHead>
          )}
        </TableRow>
      </TableHeader>

      <TableBody>
        {renderSongs.map((song, idx) => (
          <TableRow
            key={song._id}
            className="hover:bg-zinc-800/50 cursor-pointer"
            onClick={() => initializeQueue(renderSongs, idx, true)} // autoplay requested
          >
            <TableCell>
              <img
                src={song.imageUrl}
                alt={song.title}
                className="size-10 rounded object-cover"
              />
            </TableCell>

            <TableCell className="font-medium max-w-[120px] sm:max-w-[200px] truncate">
  {song.title}
</TableCell>
<TableCell className="max-w-[100px] sm:max-w-[160px] truncate text-zinc-400">
  {song.artist}
</TableCell>


            {/* Like button cell */}
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <LikeButton songId={song._id} />
              </div>
            </TableCell>

            {!hideActions && (
              <TableCell className="hidden sm:table-cell text-right">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent play on delete click
                      deleteSong(song._id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default SongsTable;
