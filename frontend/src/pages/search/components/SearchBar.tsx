import { Input } from "@/components/ui/input";
import { useMusicStore } from "@/stores/useMusicStore";
import { useState } from "react";

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const { searchResults, searchSongs } = useMusicStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchSongs(query);
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for songs..."
        />
      </form>
      <div>
        {searchResults.map((song) => (
          <div key={song._id} className="p-2 border-b">
            {song.title} — {song.artist}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;
