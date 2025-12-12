// FeaturedSection.tsx
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import FeaturedGridSkeleton from "@/components/skeletons/FeaturedGridSkeleton";
import PlayButton from "./PlayButton";
import SongOptions from "@/pages/album/components/SongOptions";
import { useSongContextMenu } from "@/hooks/useSongContextMenu";

const FeaturedSection = () => {
  const { isLoading, featuredSongs, error } = useMusicStore();
  const { playSong } = usePlayerStore();

  const {
    contextSong,
    contextMenu,
    showOptions,
    openContextMenu,
    handleTouchStart,
    handleTouchEnd,
    closeContextMenu,
  } = useSongContextMenu();

  if (isLoading) return <FeaturedGridSkeleton />;
  if (error) return <p className="text-red-500 mb-4 text-lg">{error}</p>;

  return (
    <>
     <h2 className="text-xl sm:text-xl font-semibold sm:font-bold mb-4">Quick Picks</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {featuredSongs.map((song) => (
          <div
            key={song._id}
            className="flex items-center bg-zinc-800/50 rounded-md overflow-hidden
              hover:bg-zinc-700/50 transition-colors group cursor-pointer relative"
            onClick={() => playSong(song)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openContextMenu(e, song);
            }}
            onTouchStart={(e) => handleTouchStart(e, song)}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={song.imageUrl}
              alt={song.title}
              className="w-16 sm:w-20 h-16 sm:h-20 object-cover flex-shrink-0"
            />
            <div className="flex-1 p-4">
              <p className="font-medium max-w-[155px] truncate">{song.title}</p>
              <p className="text-sm text-zinc-400 max-w-[155px] truncate">{song.artist}</p>
            </div>
            <PlayButton song={song} />
          </div>
        ))}
      </div>

        {/* Context Menu Overlay */}
        {showOptions && contextSong && contextMenu && (
          <div className="fixed inset-0 z-[9998]" onClick={closeContextMenu}>
            <div
              className="absolute z-[9999]"
              style={{
                top: contextMenu.y,
                left: contextMenu.x,
                transform: "translate(-50%, 0)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <SongOptions
                song={contextSong}
                forceOpen
                onClose={closeContextMenu}
                inlineTrigger={false}
              />
            </div>
          </div>
        )}
    </>
  );
};

export default FeaturedSection;