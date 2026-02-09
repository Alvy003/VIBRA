// pages/search/SearchPage.tsx
import Topbar from "@/components/Topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useFuzzySearch } from "@/hooks/useFuzzySearch";
import SongsTable from "../admin/components/SongsTable";
import { Search, X } from "lucide-react";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import { Song } from "@/types";
import SongOptions from "../album/components/SongOptions";

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const { songs, fetchSongs } = useMusicStore();
  const { initializeQueue } = usePlayerStore();
  const { 
    recentlyPlayedFromSearch, 
    addRecentlyPlayedFromSearch,
    removeRecentlyPlayedFromSearch,
    clearRecentlyPlayedFromSearch,
  } = usePreferencesStore();

  useEffect(() => {
    if (songs.length === 0) {
      fetchSongs();
    }
  }, [fetchSongs, songs.length]);

  const searchResults = useFuzzySearch(songs, debouncedQuery, {
    keys: ["title", "artist"],
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    returnAllOnEmpty: false,
    limit: 20,
  });

  const hasQuery = debouncedQuery.trim().length > 0;
  const hasResults = searchResults.length > 0;
  const hasRecentSongs = recentlyPlayedFromSearch.length > 0;

  const clearSearch = () => {
    setQuery("");
    // Keep keyboard open by refocusing input
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  // Play from search results - track it
  const handlePlayFromSearch = (allSongs: Song[], index: number) => {
    const song = allSongs[index];
    addRecentlyPlayedFromSearch(song);
    initializeQueue(allSongs, index, true);
  };

  // Play from recent
  const handlePlayRecentSong = (index: number) => {
    const recentSong = recentlyPlayedFromSearch[index];
    // Convert to Song format
    const song: Song = {
      _id: recentSong._id,
      title: recentSong.title,
      artist: recentSong.artist,
      imageUrl: recentSong.imageUrl,
      audioUrl: recentSong.audioUrl,
      duration: recentSong.duration,
      albumId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Move to top of recent
    addRecentlyPlayedFromSearch(song);
    
    // Convert all recent songs to Song format for queue
    const allSongs: Song[] = recentlyPlayedFromSearch.map(s => ({
      _id: s._id,
      title: s.title,
      artist: s.artist,
      imageUrl: s.imageUrl,
      audioUrl: s.audioUrl,
      duration: s.duration,
      albumId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    
    initializeQueue(allSongs, index, true);
  };

  return (
    <main className="h-full rounded-lg bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-900 overflow-hidden">
      <Topbar />

      <div className="h-[calc(100vh-145px)] lg:h-[calc(100vh-180px)]">
        <ScrollArea className="h-[calc(100vh-70px)] lg:h-[calc(100vh-180px)]">
          <div className="px-2 sm:px-6">
            {/* Sticky search bar */}
            <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-gradient-to-b from-zinc-900/95 to-zinc-900/80 backdrop-blur-md">
              <div className="py-3">
                <div className="relative w-full" role="Search">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400/90"
                    size={18}
                  />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What do you wanna listen to?"
                    className="w-full h-full bg-zinc-700/60 text-sm placeholder:text-zinc-400/90 placeholder:text-sm text-white py-2.5 lg:py-2 pl-10 pr-10 rounded-full focus:outline-none"
                  />
                  {query.length > 0 && (
                    <button
                      onPointerDown={(e) => {
                        e.preventDefault(); // Prevents input blur on mobile
                        clearSearch();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-zinc-400 active:text-zinc-200 active:bg-zinc-600/50 transition-colors"
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Results area */}
            <div className="mt-1">
              {hasQuery && hasResults ? (
                <SearchResults 
                  songs={searchResults} 
                  onPlay={handlePlayFromSearch}
                />
              ) : hasQuery ? (
                <EmptyState
                  title="No songs found"
                  subtitle={`Couldn't find anything for "${debouncedQuery}"`}
                />
              ) : hasRecentSongs ? (
                <RecentlyPlayedSection
                  songs={recentlyPlayedFromSearch}
                  onPlay={handlePlayRecentSong}
                  onRemove={removeRecentlyPlayedFromSearch}
                  onClear={clearRecentlyPlayedFromSearch}
                />
              ) : (
                <EmptyState
                  title="Search for music"
                  subtitle="Find your favorite songs and artists"
                />
              )}
            </div>
            <MobileOverlaySpacer />
          </div>
        </ScrollArea>
      </div>
    </main>
  );
};

// Search Results - wraps SongsTable with custom play handler
const SearchResults = ({ 
  songs,
}: { 
  songs: Song[]; 
  onPlay: (allSongs: Song[], index: number) => void;
}) => {
  const { initializeQueue } = usePlayerStore();
  const { addRecentlyPlayedFromSearch } = usePreferencesStore();

  // Override the default play behavior to track recent
  const handleRowClick = (index: number) => {
    addRecentlyPlayedFromSearch(songs[index]);
    initializeQueue(songs, index, true);
  };

  return (
    <div onClick={(e) => {
      // Intercept clicks on song rows to track them
      const target = e.target as HTMLElement;
      const row = target.closest('[data-song-index]');
      if (row) {
        const index = parseInt(row.getAttribute('data-song-index') || '0');
        handleRowClick(index);
        e.stopPropagation();
      }
    }}>
      <SongsTable songs={songs} hideActions />
    </div>
  );
};

// Recently Played Section
const RecentlyPlayedSection = ({
  songs,
  onPlay,
  onClear,
}: {
  songs: { _id: string; title: string; artist: string; imageUrl: string; audioUrl: string; duration: number; playedAt: number }[];
  onPlay: (index: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) => {

  // Convert to Song format for SongOptions
  const songsAsSongType: Song[] = songs.map(s => ({
    _id: s._id,
    title: s.title,
    artist: s.artist,
    imageUrl: s.imageUrl,
    audioUrl: s.audioUrl,
    duration: s.duration,
    albumId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-medium text-zinc-200/50 tracking-wide">Recent Searches</h2>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-zinc-200/40 active:text-zinc-300 transition-colors px-2 py-1 rounded-md active:bg-zinc-800"
        >
          Clear all
        </button>
      </div>

      {/* Songs List */}
      <div className="flex flex-col divide-y divide-zinc-800/50">
        {songs.map((song, idx) => (
          <div
            key={song._id}
            onClick={() => onPlay(idx)}
            className="group flex items-center justify-between gap-3 px-2 py-3 active:bg-zinc-800/50 cursor-pointer rounded-lg transition-colors"
          >
            {/* Left side: image + title + artist + time */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img
                src={song.imageUrl}
                alt={song.title}
                className="w-11 h-11 rounded-md object-cover flex-shrink-0"
                loading="lazy"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <div className="text-sm font-medium text-white line-clamp-1">
                  {song.title}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className="line-clamp-1">{song.artist}</span>
                </div>
              </div>
            </div>

            {/* Right side: song options */}
            <div
              className="flex items-center justify-end flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <SongOptions song={songsAsSongType[idx]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Empty State
const EmptyState = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className="flex flex-col items-center justify-center text-center py-20 text-zinc-400">
    <div className="relative bg-zinc-800/50 rounded-full mb-3 p-4">
      <Search className="size-7 text-zinc-500" />
    </div>
    <h3 className="text-base font-medium mb-1 text-zinc-300">{title}</h3>
    <p className="text-sm text-zinc-500">{subtitle}</p>
  </div>
);

export default SearchPage;