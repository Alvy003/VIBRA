// src/pages/library/RecentlyPlayedPage.tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { axiosInstance } from "@/lib/axios";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Song } from "@/types";
import { useEffect, useState } from "react";
import MobileSubHeader from "@/components/MobileSubHeader";
import Topbar from "@/components/Topbar";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import { Loader, Music } from "lucide-react";
import SongOptions from "@/pages/album/components/SongOptions";
import { cn } from "@/lib/utils";

const RecentlyPlayedPage = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const { playSong, currentSong, isPlaying } = usePlayerStore();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data } = await axiosInstance.get("/history/recently-played");
        setSongs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return (
    <main className="h-full bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-lg overflow-hidden">
      <Topbar />
      <ScrollArea className="h-[calc(100vh-55px)] md:h-[calc(100vh-180px)]">
        <MobileSubHeader title="Recently Played" showBack className="px-5 pb-1 md:px-10" />
        
        <div className="px-2 pb-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <Loader className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                <Music className="w-8 h-8 text-zinc-500" />
              </div>
              <p className="text-lg font-medium text-zinc-300">No recently played songs</p>
              <p className="text-sm text-zinc-500 mt-1">Songs you listen to will appear here</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {songs.map((song, index) => {
                const isCurrentSong = currentSong?._id === song._id;
                
                return (
                  <div
                    key={`${song._id}-${index}`}
                    onClick={() => playSong(song)}
                    className={cn(
                      "group cursor-pointer rounded-xl",
                      "grid grid-cols-[1fr_36px] gap-2 px-2 py-2.5",
                      "transition-all duration-200 ease-out",
                      "hover:bg-white/5 active:bg-white/10",
                      isCurrentSong && "bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={song.imageUrl}
                          alt={song.title}
                          className="size-12 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        {isCurrentSong && isPlaying && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <span className="text-violet-400 text-sm animate-pulse">♫</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium text-sm line-clamp-1 transition-colors duration-200",
                          isCurrentSong ? "text-violet-400" : "text-white"
                        )}>
                          {song.title}
                        </p>
                        <p className="text-xs text-zinc-400 line-clamp-1">
                          {song.artist}
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex items-center justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SongOptions song={song} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <MobileOverlaySpacer />
      </ScrollArea>
    </main>
  );
};

export default RecentlyPlayedPage;