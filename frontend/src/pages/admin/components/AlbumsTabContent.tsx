// pages/admin/components/AlbumsTabContent.tsx
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Disc3, Search, X } from "lucide-react";
import AlbumsTable from "./AlbumsTable";
import AddAlbumDialog from "./AddAlbumDialog";
import { useMusicStore } from "@/stores/useMusicStore";
import { useFuzzySearch } from "@/hooks/useFuzzySearch";
import { useDebounce } from "@/hooks/useDebounce";

const AlbumsTabContent = () => {
  const { albums } = useMusicStore();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const filteredAlbums = useFuzzySearch(albums, debouncedQuery, {
    keys: ["title", "artist"],
    threshold: 0.4,
    distance: 100,
  });

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <Card className="bg-zinc-900/80 border-zinc-800/50 shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2.5 text-white">
                <div className="p-1.5 rounded-lg bg-purple-500/15">
                  <Disc3 className="size-4 text-purple-400" />
                </div>
                Albums
              </CardTitle>
              <CardDescription className="text-zinc-500 mt-1">
                {albums.length} albums
                {debouncedQuery && (
                  <span className="text-purple-400 ml-1">
                    • {filteredAlbums.length} match{filteredAlbums.length !== 1 ? 'es' : ''}
                  </span>
                )}
              </CardDescription>
            </div>
            <AddAlbumDialog />
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or artist..."
              className="pl-10 pr-10 h-10 bg-zinc-800/60 border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* No Results Message */}
          {debouncedQuery && filteredAlbums.length === 0 && (
            <div className="text-sm text-zinc-500 bg-zinc-800/30 rounded-lg px-4 py-3 border border-zinc-800/50">
              <p>No albums found for "<span className="text-zinc-400">{debouncedQuery}</span>"</p>
              <p className="text-xs mt-0.5 text-zinc-600">
                Try a different search term
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <AlbumsTable />
      </CardContent>
    </Card>
  );
};

export default AlbumsTabContent;