import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlaylistStore } from "@/stores/usePlaylistStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Clock, Pause, Play, Pencil, ListMusic, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatDuration } from "@/pages/album/AlbumPage";
import { useUser } from "@clerk/clerk-react";
import SongOptions from "@/pages/album/components/SongOptions";
import { Song } from "@/types";
import EditPlaylistDialog from "@/components/EditPlaylistDialog";

// Mosaic Cover Component
const PlaylistCover = ({ songs, imageUrl }: { songs: Song[]; imageUrl?: string }) => {
  if (imageUrl) {
    return <img src={imageUrl} loading="lazy" alt="Playlist" className="w-full h-full object-cover rounded" />;
  }

  const covers = songs.slice(0, 4).map((s) => s.imageUrl);

  if (covers.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 flex items-center justify-center rounded">
        <ListMusic className="w-16 h-16 text-violet-400/50" />
      </div>
    );
  }

  if (covers.length < 4) {
    return <img src={covers[0]} loading="lazy" alt="Playlist" className="w-full h-full object-cover rounded" />;
  }

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 rounded overflow-hidden">
      {covers.map((cover, i) => (
        <img key={i} src={cover} loading="lazy" alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
};

const PlaylistPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { fetchPlaylistById, currentPlaylist, isLoading } = usePlaylistStore(); //, removeSongFromPlaylist
  const { currentSong, isPlaying, playAlbum, togglePlay } = usePlayerStore();

  useEffect(() => {
    if (id) fetchPlaylistById(id);
  }, [fetchPlaylistById, id]);

//   const handleRemoveSong = async (e: React.MouseEvent, songId: string) => {
//     e.stopPropagation();
//     if (!id) return;
//     await removeSongFromPlaylist(id, songId);
//   };

  const handlePlayPlaylist = () => {
    if (!currentPlaylist || currentPlaylist.songs.length === 0) return;
    const isCurrentPlaylistPlaying = currentPlaylist.songs.some((song) => song._id === currentSong?._id);
    if (isCurrentPlaylistPlaying) togglePlay();
    else playAlbum(currentPlaylist.songs, 0);
  };

  const handlePlaySong = (index: number) => {
    if (!currentPlaylist) return;
    playAlbum(currentPlaylist.songs, index);
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full text-violet-500">
        <Loader className="w-5 h-5 animate-spin" />
      </div>
    );
  if (!currentPlaylist) return <div className="flex items-center justify-center h-full text-zinc-500">Playlist not found</div>;

  const isOwner = user?.id === currentPlaylist.userId;

  return (
    <div className="h-full">
      <ScrollArea className="h-full rounded-md">
        <div className="relative min-h-full pb-14 sm:pb-1">
          {/* Gradient - Violet/Fuchsia for playlists */}
          <div className="absolute inset-0 bg-gradient-to-b from-violet-900/60 via-fuchsia-900/30 to-zinc-900 pointer-events-none" aria-hidden="true" />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row p-6 gap-6 pb-8">
              {/* Cover */}
              <div className="w-[240px] h-[240px] mx-auto md:mx-0 md:w-[180px] md:h-[180px] sm:w-[150px] sm:h-[150px] shadow-2xl rounded-lg overflow-hidden">
                <PlaylistCover songs={currentPlaylist.songs} imageUrl={currentPlaylist.imageUrl} />
              </div>

              <div className="flex flex-col justify-end md:ml-4 text-center md:text-left flex-1">
                <p className="text-sm font-medium uppercase tracking-wider text-violet-400">Playlist</p>
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold my-3">{currentPlaylist.name}</h1>
                {currentPlaylist.description && <p className="text-sm text-zinc-400 mb-2 max-w-md">{currentPlaylist.description}</p>}
                <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-zinc-300">
                  <span className="font-medium text-white">{isOwner ? "You" : "User"}</span>
                  <span>•</span>
                  <span>{currentPlaylist.songs.length} songs</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-6 pb-4 flex items-center justify-center md:justify-start gap-4">
              <Button
                onClick={handlePlayPlaylist}
                size="icon"
                disabled={currentPlaylist.songs.length === 0}
                className="w-14 h-14 rounded-full ml-12 sm:ml-0 bg-violet-500 hover:bg-violet-400 hover:scale-105 transition-all disabled:opacity-50"
              >
                {isPlaying && currentPlaylist.songs.some((song) => song._id === currentSong?._id) ? (
                  <Pause className="h-7 w-7 text-black" />
                ) : (
                  <Play className="h-7 w-7 text-black pl-1" />
                )}
              </Button>

              {isOwner && (
                <Button variant="ghost" size="icon" onClick={() => setEditDialogOpen(true)} className="w-10 h-10 rounded-full hover:bg-white/10">
                  <Pencil className="h-5 w-5 text-zinc-400" />
                </Button>
              )}
            </div>

            {/* Songs List */}
            <div className="bg-black/20 backdrop-blur-sm">
              <div className="grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_3fr_1.6fr_1fr_auto] gap-4 px-10 py-2 text-sm text-zinc-400 border-b border-white/5">
                <div>#</div>
                <div>Title</div>
                <div className="hidden md:block">Date Added</div>
                <div className="hidden md:block"><Clock className="h-4 w-4" /></div>
                <div></div>
              </div>

              <div className="px-5">
                <div className="space-y-2 py-4">
                  {currentPlaylist.songs.length === 0 && (
                    <div className="text-center text-zinc-500 py-10">
                      <ListMusic className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>This playlist is empty</p>
                      <p className="text-sm mt-1">Add songs using the menu on any song</p>
                    </div>
                  )}

                  {currentPlaylist.songs.map((song: Song, index: number) => {
                    const isCurrentSong = currentSong?._id === song._id;
                    return (
                      <div
                        key={`${song._id}-${index}`}
                        onClick={() => handlePlaySong(index)}
                        className="group cursor-pointer rounded-md hover:bg-white/5 px-4 py-2 text-sm text-zinc-400 grid grid-cols-[16px_1fr_auto] md:grid-cols-[16px_4fr_2fr_1fr_auto] gap-4"
                      >
                        <div className="flex items-center justify-center">
                          {isCurrentSong && isPlaying ? (
                            <div className="size-4 text-violet-500 animate-pulse">♫</div>
                          ) : (
                            <span className="group-hover:hidden">{index + 1}</span>
                          )}
                          {!isCurrentSong && <Play className="h-4 w-4 hidden group-hover:block text-white" />}
                        </div>

                        <div className="flex items-center gap-3 overflow-hidden">
                          <img src={song.imageUrl} alt={song.title} loading="lazy" className="size-10 shrink-0 rounded" />
                          <div className="flex flex-col grow">
                            <span className={`font-medium truncate ${isCurrentSong ? "text-violet-400" : "text-white"}`}>{song.title}</span>
                            <span className="text-xs text-zinc-400 truncate">{song.artist}</span>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center">{song.createdAt?.split("T")[0] || "-"}</div>
                        <div className="hidden md:flex items-center">{formatDuration(song.duration)}</div>

                        <div className="flex items-center justify-end">
                          <SongOptions song={song} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      {currentPlaylist && (
        <EditPlaylistDialog isOpen={editDialogOpen} onClose={() => setEditDialogOpen(false)} playlist={currentPlaylist} onDelete={() => navigate("/")} />
      )}
    </div>
  );
};

export default PlaylistPage;