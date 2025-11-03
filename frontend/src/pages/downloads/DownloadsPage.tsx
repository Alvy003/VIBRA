import { useEffect, useState } from "react";
import { useDownloads } from "@/hooks/useDownloads";
import { useStorageInfo } from "@/hooks/useStorageInfo";
import { Button } from "@/components/ui/button";
import { Download, Play, Trash2, Pause, HardDrive } from "lucide-react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import Topbar from "@/components/Topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import clsx from "clsx";

const DownloadsPage = () => {
  const [offlineSongs, setOfflineSongs] = useState<any[]>([]);
  const { listDownloads, removeDownload } = useDownloads();
  const { storage, formatBytes } = useStorageInfo();
  const { initializeQueue, currentSong, isPlaying, togglePlay } = usePlayerStore();

  useEffect(() => {
    const fetchDownloads = async () => {
      const downloads = await listDownloads();
      setOfflineSongs(downloads);
    };
    fetchDownloads();
  }, [listDownloads]);

  const handlePlayPause = (song: any, idx: number) => {
    if (currentSong?._id === song._id) {
      togglePlay();
    } else {
      initializeQueue(offlineSongs, idx, true);
    }
  };

  const handleDelete = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await removeDownload(songId);
      setOfflineSongs((prev) => prev.filter((s) => s._id !== songId));
      
      if (currentSong?._id === songId) {
        usePlayerStore.getState().reset();
      }
    } catch (error) {
      console.error("Failed to delete download:", error);
    }
  };

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-800 to-zinc-900">
      <Topbar />
      <ScrollArea className="h-[calc(100vh-145px)] lg:h-[calc(100vh-180px)]">
        <div className="px-4 sm:px-6">
          <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 py-1 sm:px-6 bg-gradient-to-b from-zinc-900/70 to-transparent backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60">
            <h1 className="text-2xl sm:text-3xl font-bold py-3">Downloads</h1>
            
            {/* ✅ Storage Info */}
            {storage && (
              <div className="mb-4 bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-medium text-zinc-300">Storage</span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {formatBytes(storage.used)} of {formatBytes(storage.total)} used
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all duration-300",
                      storage.percentage > 90 ? "bg-red-500" :
                      storage.percentage > 70 ? "bg-yellow-500" :
                      "bg-violet-500"
                    )}
                    style={{ width: `${Math.min(storage.percentage, 100)}%` }}
                  />
                </div>
                
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-zinc-500">
                    {offlineSongs.length} {offlineSongs.length === 1 ? 'song' : 'songs'} downloaded
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatBytes(storage.available)} free
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-2">
            {offlineSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-zinc-400 py-20">
                <Download className="size-12 mb-4 animate-bounce text-violet-500" />
                <p className="text-lg font-medium">No downloads yet.</p>
                <p className="mt-2 text-sm text-zinc-500">Songs you download will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {offlineSongs.map((song, idx) => {
                  const isCurrent = currentSong?._id === song._id;
                  const isCurrentPlaying = isCurrent && isPlaying;
                  
                  return (
                    <div
                      key={song._id}
                      onClick={() => handlePlayPause(song, idx)}
                      className={clsx(
                        "flex items-center justify-between p-2 rounded-lg transition-all group cursor-pointer",
                        isCurrent ? "bg-zinc-800" : "hover:bg-zinc-800"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={song.imageUrl || "/placeholder.svg"}
                            alt={song.title}
                            className="size-12 rounded object-cover"
                          />
                          
                          {/* ✅ Mobile: Pulse animation overlay */}
                          {isCurrentPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded sm:hidden">
                              <div className="flex gap-0.5">
                                <div className="w-0.5 h-3 bg-violet-500 animate-pulse" style={{ animationDelay: '0ms' }} />
                                <div className="w-0.5 h-3 bg-violet-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                                <div className="w-0.5 h-3 bg-violet-500 animate-pulse" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-white font-medium truncate max-w-[135px] sm:max-w-[180px] md:max-w-[300px]">
                            {song.title}
                          </p>
                          <p className="text-zinc-400 text-sm truncate max-w-[120px] sm:max-w-[180px] md:max-w-[250px]">
                            {song.artist}
                          </p>
                          <p className="mt-0.5 text-[11px] text-violet-400/90">Offline</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* ✅ Desktop: Play button with pulse effect on icon */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hidden sm:block group-hover:opacity-100 opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPause(song, idx);
                          }}
                        >
                          {isCurrentPlaying ? (
                            <Pause className="size-5 text-violet-400 animate-pulse" />
                          ) : (
                            <Play className="size-5" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400 hover:text-red-500 hover:bg-red-400/10"
                          onClick={(e) => handleDelete(song._id, e)}
                        >
                          <Trash2 className="size-5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </main>
  );
};

export default DownloadsPage;