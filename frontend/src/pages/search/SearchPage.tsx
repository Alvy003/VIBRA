import Topbar from "@/components/Topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useMusicStore } from "@/stores/useMusicStore";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import SongsTable from "../admin/components/SongsTable";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const { searchResults, searchSongs, isLoading } = useMusicStore();

  // run search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      searchSongs(debouncedQuery);
    }
  }, [debouncedQuery, searchSongs]);

  return (
    <main className="h-full rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 overflow-hidden">
      <Topbar />

      <div className="h-[calc(100vh-155px)]">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Search bar */}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What do you want to listen to?"
              className="bg-zinc-700 border-0 text-white placeholder-zinc-500"
            />

            {/* Results */}
            {isLoading ? (
              <p className="text-zinc-400">Searching...</p>
            ) : searchResults.length > 0 ? (
              <SongsTable songs={searchResults} hideActions />
            ) : (
              query && <p className="text-zinc-400">No songs found.</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </main>
  );
};

export default SearchPage;
