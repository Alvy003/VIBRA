import { useEffect, useState, useRef } from "react";
import { useDownloads } from "@/hooks/useDownloads";
import { useStorageInfo } from "@/hooks/useStorageInfo";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Play, 
  Trash2, 
  Pause, 
  HardDrive, 
  RefreshCw, 
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import Topbar from "@/components/Topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import clsx from "clsx";

const DownloadsPage = () => {
  const [offlineSongs, setOfflineSongs] = useState<any[]>([]);
  const [activeCard, setActiveCard] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { listDownloads, removeDownload } = useDownloads();
  const { storage, formatBytes } = useStorageInfo();
  const { initializeQueue, currentSong, isPlaying, togglePlay } = usePlayerStore();
  
  const {
    updateAvailable,
    isChecking,
    isUpdating,
    currentVersion,
    newVersion,
    checkForUpdate,
    applyUpdate,
  } = useAppUpdate(true);

  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        const downloads = await listDownloads();
        setOfflineSongs(downloads);
      } catch (error) {
        console.error("Failed to fetch downloads:", error);
        setOfflineSongs([]);
      }
    };
    fetchDownloads();
  }, [listDownloads]);

  // Handle scroll for dot indicator
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.firstElementChild?.clientWidth || 0;
      const gap = 12; // gap-3 = 12px
      const newActive = Math.round(scrollLeft / (cardWidth + gap));
      setActiveCard(Math.min(newActive, 1));
    }
  };

  const scrollToCard = (idx: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.firstElementChild?.clientWidth || 0;
      const gap = 12;
      container.scrollTo({
        left: idx * (cardWidth + gap),
        behavior: 'smooth'
      });
    }
  };

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
        <div className="px-2 sm:px-6">
          {/* Header */}
          <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 py-1 sm:px-6 bg-gradient-to-b from-zinc-900/90 to-transparent backdrop-blur-sm">
            <h1 className="text-2xl sm:text-3xl font-bold py-3 px-2">Downloads</h1>
          </div>

          {/* ========== MOBILE: Swipeable Cards ========== */}
          <div className="sm:hidden mb-4">
            {/* Scrollable Container */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Card 1: App Update */}
              <div 
                className={clsx(
                  "flex-shrink-0 snap-start rounded-2xl p-2 border backdrop-blur-sm",
                  updateAvailable 
                    ? "bg-gradient-to-br from-violet-600/20 via-violet-500/10 to-purple-600/20 border-violet-500/30" 
                    : "bg-zinc-800/80 border-zinc-700/50"
                )}
                style={{ width: 'calc(100% - 37px)', minWidth: 'calc(100% - 37px)' }}
              >
                {/* Icon + Title Row */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    updateAvailable 
                      ? "bg-violet-500/20" 
                      : "bg-zinc-700/60"
                  )}>
                    {updateAvailable ? (
                      <Sparkles className="w-5 h-5 text-violet-400" />
                    ) : (
                      <RefreshCw className={clsx(
                        "w-5 h-5 text-violet-400",
                        isChecking && "animate-spin"
                      )} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white">
                      {updateAvailable ? 'Update Ready' : 'App Version'}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate">
                      {currentVersion ? `v${currentVersion}` : 'Vibra Music'}
                    </p>
                  </div>
                  {!updateAvailable && !isChecking && (
                    <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0 absolute top-0/4 right-3 transform -translate-y-1/2" />
                  )}
                </div>

                {/* Status / Action */}
                {updateAvailable ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
                      <span className="text-sm text-violet-200">
                        v{newVersion} available
                      </span>
                    </div>
                    <button
                      onClick={applyUpdate}
                      disabled={isUpdating}
                      className="w-full h-9 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Installing...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Install Update
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={checkForUpdate}
                    disabled={isChecking}
                    className="w-full h-9 mt-8 px-1 flex items-center justify-center gap-2 border border-zinc-600 bg-zinc-700/50 hover:bg-zinc-700 active:bg-zinc-600 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {isChecking ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        {/* <RefreshCw className="w-4 h-4" /> */}
                        Check for Updates
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Card 2: Storage */}
              {storage && (
                <div 
                  className="flex-shrink-0 snap-start rounded-2xl p-2 bg-zinc-800/80 border border-zinc-700/50 backdrop-blur-sm"
                  style={{ width: 'calc(100% - 37px)', minWidth: 'calc(100% - 37px)' }}
                >
                  {/* Icon + Title Row */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-700/60 flex items-center justify-center shrink-0">
                      <HardDrive className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white">Storage</h3>
                      <p className="text-xs text-zinc-400">
                        {offlineSongs.length} {offlineSongs.length === 1 ? 'song' : 'songs'} offline
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-white">{Math.round(storage.percentage)}%</p>
                      <p className="text-xs text-zinc-500">used</p>
                    </div>
                  </div>

                  {/* Storage Bar */}
                  <div className="space-y-4">
                    <div className="w-full bg-zinc-700/50 rounded-full h-3 overflow-hidden">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all duration-500",
                          storage.percentage > 90 ? "bg-gradient-to-r from-red-500 to-red-400" :
                          storage.percentage > 70 ? "bg-gradient-to-r from-amber-500 to-yellow-400" :
                          "bg-gradient-to-r from-violet-600 to-violet-400"
                        )}
                        style={{ width: `${Math.min(storage.percentage, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center px-2">
                      <div className="text-center">
                        <p className="text-base font-semibold text-white">{formatBytes(storage.used)}</p>
                        <p className="text-xs text-zinc-500">Used</p>
                      </div>
                      <div className="h-8 w-px bg-zinc-700" />
                      <div className="text-center">
                        <p className="text-base font-semibold text-white">{formatBytes(storage.available)}</p>
                        <p className="text-xs text-zinc-500">Free</p>
                      </div>
                      <div className="h-8 w-px bg-zinc-700" />
                      <div className="text-center">
                        <p className="text-base font-semibold text-white">{formatBytes(storage.total)}</p>
                        <p className="text-xs text-zinc-500">Total</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dot Indicators */}
            <div className="flex justify-center gap-2 mt-2">
              {[0, 1].map((idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToCard(idx)}
                  className={clsx(
                    "h-2 rounded-full transition-all duration-300",
                    activeCard === idx 
                      ? "bg-violet-500 w-6 h-1.5" 
                      : "bg-zinc-600 w-2 h-1.5 hover:bg-zinc-500"
                  )}
                  aria-label={`Go to card ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* ========== DESKTOP: Side-by-Side Cards ========== */}
          <div className="hidden sm:grid sm:grid-cols-2 gap-4 mb-6">
            {/* Update Card */}
            <div className={clsx(
              "rounded-xl p-5 border transition-all duration-300",
              updateAvailable 
                ? "bg-gradient-to-br from-violet-600/15 to-purple-600/10 border-violet-500/30" 
                : "bg-zinc-800/60 border-zinc-700/50 hover:border-zinc-600/50"
            )}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-11 h-11 rounded-xl flex items-center justify-center",
                    updateAvailable ? "bg-violet-500/20" : "bg-zinc-700/50"
                  )}>
                    {updateAvailable ? (
                      <Sparkles className="w-5 h-5 text-violet-400" />
                    ) : (
                      <RefreshCw className={clsx(
                        "w-5 h-5 text-violet-400",
                        isChecking && "animate-spin"
                      )} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {updateAvailable ? 'Update Available' : 'App Version'}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {currentVersion ? `Currently v${currentVersion}` : 'Vibra Music'}
                    </p>
                  </div>
                </div>
                {!updateAvailable && !isChecking && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-violet-500" />
                    <span className="text-xs text-violet-400">Up to date</span>
                  </div>
                )}
              </div>

              {updateAvailable ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-sm text-violet-200">Version {newVersion} is ready</span>
                  </div>
                  <button
                    onClick={applyUpdate}
                    disabled={isUpdating}
                    className="w-full h-10 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Installing Update...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Install Update
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={checkForUpdate}
                  disabled={isChecking}
                  className="w-full h-10 mt-7 flex items-center justify-center gap-2 border border-zinc-700 bg-transparent hover:bg-zinc-700/80 text-zinc-300 hover:text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isChecking ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Checking for updates...
                    </>
                  ) : (
                    <>
                      {/* <RefreshCw className="w-4 h-4" /> */}
                      Check for Updates
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Storage Card */}
            {storage && (
              <div className="rounded-xl p-5 bg-zinc-800/60 border border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-zinc-700/50 flex items-center justify-center">
                      <HardDrive className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Storage</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {offlineSongs.length} {offlineSongs.length === 1 ? 'song' : 'songs'} saved
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">{Math.round(storage.percentage)}%</p>
                    <p className="text-xs text-zinc-500">used</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-zinc-700/50 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        storage.percentage > 90 ? "bg-gradient-to-r from-red-500 to-red-400" :
                        storage.percentage > 70 ? "bg-gradient-to-r from-amber-500 to-yellow-400" :
                        "bg-gradient-to-r from-violet-600 to-violet-400"
                      )}
                      style={{ width: `${Math.min(storage.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex justify-between text-center">
                  <div>
                    <p className="text-sm font-medium text-white">{formatBytes(storage.used)}</p>
                    <p className="text-xs text-zinc-500">Used</p>
                  </div>
                  <div className="w-px bg-zinc-700" />
                  <div>
                    <p className="text-sm font-medium text-white">{formatBytes(storage.available)}</p>
                    <p className="text-xs text-zinc-500">Free</p>
                  </div>
                  <div className="w-px bg-zinc-700" />
                  <div>
                    <p className="text-sm font-medium text-white">{formatBytes(storage.total)}</p>
                    <p className="text-xs text-zinc-500">Total</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========== Downloads List ========== */}
          <div className="mt-2">
            {offlineSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-zinc-400 py-20">
                <Download className="size-12 mb-4 animate-bounce text-violet-500" />
                <p className="text-lg font-medium">No downloads yet.</p>
                <p className="mt-2 text-sm text-zinc-500">Songs you download will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
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
                      
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hidden sm:flex h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPause(song, idx);
                          }}
                        >
                          {isCurrentPlaying ? (
                            <Pause className="size-4 text-violet-400" />
                          ) : (
                            <Play className="size-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                          onClick={(e) => handleDelete(song._id, e)}
                        >
                          <Trash2 className="size-4" />
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