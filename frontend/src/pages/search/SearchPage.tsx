// pages/SearchPage.tsx
import Topbar from "@/components/Topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useMusicStore } from "@/stores/useMusicStore";
import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useFuzzySearch } from "@/hooks/useFuzzySearch";
import SongsTable from "../admin/components/SongsTable";
import { Search, Loader } from "lucide-react";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const { songs, fetchSongs, isLoading } = useMusicStore();

  // Fetch all songs on mount
  useEffect(() => {
    if (songs.length === 0) {
      fetchSongs();
    }
  }, [fetchSongs, songs.length]);

  // Use fuzzy search for typo tolerance
  const searchResults = useFuzzySearch(songs, debouncedQuery, {
    keys: ["title", "artist"],
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    returnAllOnEmpty: false,
  });

  const hasQuery = debouncedQuery.trim().length > 0;
  const hasResults = searchResults.length > 0;

  // Search suggestions based on common typos
  const suggestions = useMemo(() => {
    if (!hasQuery || hasResults) return [];
    // return ["Try checking the spelling", "Search for artist name instead"];
  }, [hasQuery, hasResults]);

  return (
    <main className="h-full rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 overflow-hidden">
      <Topbar />

      <div className="h-[calc(100vh-145px)] lg:h-[calc(100vh-180px)]">
        <ScrollArea className="h-full">
          <div className="px-4 sm:px-6">
            {/* Sticky search bar */}
            <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-gradient-to-b from-zinc-900/70 to-transparent backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60">
              <div className="py-3">
                <div className="relative w-full" role="search">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    size={18}
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What do you wanna listen to?"
                    className="w-full bg-zinc-700/60 text-sm placeholder:text-zinc-400 text-white py-2 lg:py-1.5 pl-10 pr-3 rounded-2xl lg:rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>

              </div>
            </div>

            {/* Results area */}
            <div className="mt-2 space-y-6">
              {isLoading ? (
                <LoadingState />
              ) : hasQuery && hasResults ? (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400">
                    Found {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{debouncedQuery}"
                  </p>
                  <SongsTable songs={searchResults} hideActions />
                </div>
              ) : hasQuery ? (
                <EmptyState
                  title="No songs found"
                  subtitle={`Couldn't find anything for "${debouncedQuery}"`}
                  suggestions={suggestions}
                />
              ) : (
                <EmptyState
                  title="Search for songs"
                  subtitle="Type to discover music you love."
                />
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </main>
  );
};

// Loading State
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-20">
       <Loader className="w-8 h-8 text-violet-500 animate-spin" />
    <p className="text-zinc-400 mt-4">Searching...</p>
  </div>
);

// Empty State component
const EmptyState = ({
  title,
  subtitle,
  suggestions = [],
}: {
  title: string;
  subtitle: string;
  suggestions?: string[];
}) => (
  <div className="flex flex-col items-center justify-center text-center py-20 text-zinc-400">
    <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
      <Search className="w-8 h-8 text-violet-500" />
    </div>
    <p className="text-lg font-medium text-zinc-300">{title}</p>
    <p className="text-sm text-zinc-500 mt-1 max-w-md">{subtitle}</p>
    
    {suggestions.length > 0 && (
      <div className="mt-4 space-y-1">
        {suggestions.map((suggestion, i) => (
          <p key={i} className="text-xs text-zinc-600">
            💡 {suggestion}
          </p>
        ))}
      </div>
    )}
  </div>
);

export default SearchPage;