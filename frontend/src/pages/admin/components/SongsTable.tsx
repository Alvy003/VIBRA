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
import { Trash2, Play } from "lucide-react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import SongOptions from "../../album/components/SongOptions";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface SongsTableProps {
  songs?: any[];
  hideActions?: boolean;
}

const SongsTable = ({ songs: overrideSongs, hideActions = false }: SongsTableProps) => {
  const { songs, isLoading, error, deleteSong } = useMusicStore();
  const { initializeQueue, currentSong, isPlaying } = usePlayerStore();
  const isMobile = useMediaQuery("(max-width: 768px)");

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

  // ✅ MOBILE VERSION (like album page layout)
  if (isMobile) {
    return (
      <div className="flex flex-col divide-y">
        {renderSongs.map((song, idx) => (
          <div
            key={song._id}
            onClick={() => initializeQueue(renderSongs, idx, true)}
            className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer"
          >
            {/* Left side: image + title + artist */}
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={song.imageUrl}
                alt={song.title}
                className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                loading="lazy"
              />
              <div className="flex flex-col min-w-0">
                <div className="text-sm font-medium text-white max-w-[130px] truncate">
                  {song.title}
                </div>
                <div className="text-xs text-zinc-400 max-w-[130px] truncate">{song.artist}</div>
              </div>
            </div>

            {/* Right side: song options */}
            <div
              className="flex items-center justify-end flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <SongOptions song={song} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ✅ DESKTOP VERSION (table layout stays as is)
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-zinc-800/50">
          <TableHead className="w-[40px] text-center">#</TableHead>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Artist</TableHead>
          <TableHead className="text-right w-[80px]"></TableHead>
          {!hideActions && (
            <TableHead className="hidden sm:table-cell text-right">Actions</TableHead>
          )}
        </TableRow>
      </TableHeader>

      <TableBody>
        {renderSongs.map((song, idx) => (
          <TableRow
          key={song._id}
          className="group hover:bg-zinc-800/50 cursor-pointer" // group for hover
          onClick={() => initializeQueue(renderSongs, idx, true)}
        >
          {/* NEW: index / play / current icon */}
          <TableCell className="w-[50px] text-center">
            <div className="relative flex items-center justify-center text-1xs text-zinc-400 tabular-nums">
              {currentSong?._id === song._id && isPlaying ? (
                <span className="text-violet-400">♫</span>
              ) : (
                <>
                  <span className="group-hover:opacity-0 transition-opacity">{idx + 1}</span>
                  <Play className="absolute h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-zinc-200" />
                </>
              )}
            </div>
          </TableCell>
        
          <TableCell>
            <img src={song.imageUrl} alt={song.title} loading="lazy" className=" max-w-[40px] max-h-[50px] rounded object-cover" />
          </TableCell>
        
          <TableCell className="font-medium max-w-[200px] truncate">{song.title}</TableCell>
        
          <TableCell className="max-w-[200px] truncate text-zinc-400">{song.artist}</TableCell>
        
          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
            <SongOptions song={song} />
          </TableCell>
        
          {!hideActions && (
            <TableCell className="hidden sm:table-cell text-right">
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSong(song._id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </TableCell>
          )}
        </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default SongsTable;
