// admin/components/SongsTabContent.tsx
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Music, Search, X } from "lucide-react";
import SongsTable from "./SongsTable";
import AddSongDialog from "./AddSongDialog";
import { useMusicStore } from "@/stores/useMusicStore";
import { useFuzzySearch } from "@/hooks/useFuzzySearch";
import { useDebounce } from "@/hooks/useDebounce";

const SongsTabContent = () => {
  const { songs } = useMusicStore();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Fuzzy search with typo tolerance
  const filteredSongs = useFuzzySearch(songs, debouncedQuery, {
    keys: ["title", "artist", "albumId.title"], // Search in title, artist, and album name
    threshold: 0.4, // Allows typos (0 = exact, 1 = match everything)
    distance: 100,
  });

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Music className="size-5 text-violet-500" />
                Songs Library
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Manage your music tracks ({songs.length} total
                {debouncedQuery && `, ${filteredSongs.length} found`})
              </CardDescription>
            </div>
            <AddSongDialog />
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs by title, artist..."
              className="pl-10 pr-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 focus:ring-violet-500/20"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Tips */}
          {debouncedQuery && filteredSongs.length === 0 && (
            <div className="text-sm text-zinc-500 bg-zinc-800/50 rounded-lg p-3">
              <p>No songs found for "{debouncedQuery}"</p>
              <p className="text-xs mt-1">
                Try a different spelling or search term
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <SongsTable songs={filteredSongs} />
      </CardContent>
    </Card>
  );
};

export default SongsTabContent;