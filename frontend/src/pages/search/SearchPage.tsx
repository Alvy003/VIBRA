import Topbar from "@/components/Topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useMusicStore } from "@/stores/useMusicStore";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import SongsTable from "../admin/components/SongsTable";
import { Search } from "lucide-react";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const { searchResults, searchSongs, isLoading } = useMusicStore();

  useEffect(() => {
    if (debouncedQuery.trim()) searchSongs(debouncedQuery);
  }, [debouncedQuery, searchSongs]);

  const hasResults = searchResults && searchResults.length > 0;

  return (
    <main className="h-full rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 overflow-hidden">
      <Topbar />

      <div className="h-[calc(100vh-145px)] lg:h-[calc(100vh-180px)]">
        <ScrollArea className="h-full">
          <div className="px-4 sm:px-6">
            {/* Sticky search bar (no extra heading) */}
            <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-gradient-to-b from-zinc-900/70 to-transparent backdrop-blur supports-[backdrop-filter]:bg-zinc-900/60">
              <div className="py-3">
                <div className="relative w-full" role="search">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What do you wanna listen to?"
                    className="w-full bg-zinc-700/60 text-1sm placeholder:text-zinc-400 text-white py-2 lg:py-1.6 pl-10 pr-3 rounded-2xl lg:rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Gap below the sticky bar */}
            <div className="mt-2 space-y-6">
              {isLoading ? (
                <p className="text-zinc-400">Searching...</p>
              ) : hasResults ? (
                <SongsTable songs={searchResults} hideActions />
              ) : query.trim() ? (
                <EmptyState
                  title="No songs found"
                  subtitle="Try searching for a different title or artist."
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

// Reusable Empty State component
const EmptyState = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="flex flex-col items-center justify-center text-center py-20 text-zinc-400">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-14 h-14 mb-4 text-violet-500 animate-ping [animation-duration:2s]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <line
        x1="16.65"
        y1="16.65"
        x2="21"
        y2="21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
    <p className="text-lg font-medium mt-5">{title}</p>
    <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
  </div>
);

export default SearchPage;