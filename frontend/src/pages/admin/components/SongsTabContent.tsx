// src/pages/admin/components/SongsTabContent.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Clock, TrendingUp, Calendar } from "lucide-react";
import AddSongDialog from "./AddSong/AddSongDialog";
import SongsTable from "./SongsTable";
import { useMusicStore } from "@/stores/useMusicStore";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SortOption = "recent" | "alphabetical" | "artist";

const SongsTabContent = () => {
  const { songs } = useMusicStore();
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showRecentOnly, setShowRecentOnly] = useState(false);
  
  // Get recently added songs (last 24 hours, 7 days, 30 days)
  const recentStats = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    // Sort songs by createdAt (newest first)
    const sortedByDate = [...songs].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    
    const last24h = sortedByDate.filter(s => {
      const created = new Date(s.createdAt || 0).getTime();
      return now - created < day;
    });
    
    const last7d = sortedByDate.filter(s => {
      const created = new Date(s.createdAt || 0).getTime();
      return now - created < 7 * day;
    });
    
    const last30d = sortedByDate.filter(s => {
      const created = new Date(s.createdAt || 0).getTime();
      return now - created < 30 * day;
    });
    
    return {
      last24h: last24h.length,
      last7d: last7d.length,
      last30d: last30d.length,
      recentSongs: sortedByDate.slice(0, 50), // Last 50 songs
    };
  }, [songs]);
  
  // Sorted songs based on selection
  const displaySongs = useMemo(() => {
    let filtered = showRecentOnly ? recentStats.recentSongs : [...songs];
    
    switch (sortBy) {
      case "recent":
        return filtered.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
      case "alphabetical":
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      case "artist":
        return filtered.sort((a, b) => a.artist.localeCompare(b.artist));
      default:
        return filtered;
    }
  }, [songs, sortBy, showRecentOnly, recentStats.recentSongs]);

  return (
    <Card className="bg-zinc-800/50 border-zinc-700/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Music className="h-5 w-5 text-violet-500" />
              Songs Library
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-1">
              Manage your music collection
            </CardDescription>
          </div>
          <AddSongDialog />
        </div>
        
        {/* Recent Stats */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-zinc-700/50">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-zinc-400">Today:</span>
              <span className="text-white font-medium">{recentStats.last24h}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400">7 days:</span>
              <span className="text-white font-medium">{recentStats.last7d}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400">30 days:</span>
              <span className="text-white font-medium">{recentStats.last30d}</span>
            </div>
          </div>
          
          <div className="flex-1" />
          
          {/* Sort & Filter Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={showRecentOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRecentOnly(!showRecentOnly)}
              className={cn(
                "h-8 text-xs",
                showRecentOnly 
                  ? "bg-violet-600 hover:bg-violet-700 text-white" 
                  : "border-zinc-700 hover:bg-zinc-800"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              Recent Only
            </Button>
            
            <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <TabsList className="h-8 bg-zinc-800 border border-zinc-700">
                <TabsTrigger value="recent" className="text-xs h-6 px-2.5 data-[state=active]:bg-violet-600">
                  Recent
                </TabsTrigger>
                <TabsTrigger value="alphabetical" className="text-xs h-6 px-2.5 data-[state=active]:bg-violet-600">
                  A-Z
                </TabsTrigger>
                <TabsTrigger value="artist" className="text-xs h-6 px-2.5 data-[state=active]:bg-violet-600">
                  Artist
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {/* Recently Added Preview */}
        {recentStats.last24h > 0 && !showRecentOnly && (
          <div className="mt-4 p-3 bg-gradient-to-r from-violet-500/10 to-transparent border border-violet-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-violet-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Just Added Today
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecentOnly(true)}
                className="h-6 text-xs text-violet-400 hover:text-violet-300"
              >
                View all recent →
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentStats.recentSongs.slice(0, 5).map((song) => (
                <div
                  key={song._id}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-800/80 rounded-lg shrink-0"
                >
                  <img
                    src={song.imageUrl}
                    alt=""
                    className="w-8 h-8 rounded object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white line-clamp-1 max-w-[120px]">
                      {song.title}
                    </p>
                    <p className="text-[10px] text-zinc-400 line-clamp-1">
                      {song.artist}
                    </p>
                  </div>
                </div>
              ))}
              {recentStats.last24h > 5 && (
                <div className="flex items-center px-3 text-xs text-zinc-400">
                  +{recentStats.last24h - 5} more
                </div>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <SongsTable songs={displaySongs} />
      </CardContent>
    </Card>
  );
};

export default SongsTabContent;