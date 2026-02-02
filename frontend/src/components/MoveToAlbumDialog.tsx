// components/MoveToAlbumDialog.tsx
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useMusicStore } from "@/stores/useMusicStore";
import { Disc3, X, Check, Music, Loader } from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import toast from "react-hot-toast";

interface MoveToAlbumDialogProps {
  isOpen: boolean;
  onClose: () => void;
  song: {
    _id: string;
    title: string;
    artist: string;
    albumId?: string | null;
  };
}

const MoveToAlbumDialog = ({ isOpen, onClose, song }: MoveToAlbumDialogProps) => {
  const { fetchSongs, fetchAlbums: refreshAlbums } = useMusicStore();

  // Local state
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch albums directly - bypassing store to avoid re-renders
  useEffect(() => {
    if (isOpen && !isInitialized) {
      setIsLoading(true);
      setIsInitialized(true);

      axiosInstance
        .get("/albums")
        .then((res) => {
          const fetchedAlbums = res.data;
          setAlbums(fetchedAlbums);

          // Calculate which albums contain this song
          const albumsContainingSong = new Set<string>();

          fetchedAlbums.forEach((album: any) => {
            const songIds =
              album.songs?.map((s: any) =>
                typeof s === "string" ? s : s._id
              ) || [];

            if (songIds.includes(song._id)) {
              albumsContainingSong.add(album._id);
            }
          });

          // Also check song's albumId field
          if (song.albumId) {
            albumsContainingSong.add(song.albumId);
          }

          setSelectedAlbums(new Set(albumsContainingSong));
        })
        .catch((err) => {
          console.error("Error fetching albums:", err);
          toast.error("Failed to load albums");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }

    // Reset when dialog closes
    if (!isOpen) {
      setIsInitialized(false);
      setIsSaving(null);
    }
  }, [isOpen, isInitialized, song._id, song.albumId]);

  const isInAlbum = useCallback(
    (albumId: string) => {
      return selectedAlbums.has(albumId);
    },
    [selectedAlbums]
  );

  const handleToggleAlbum = async (albumId: string) => {
    const currentlyInAlbum = isInAlbum(albumId);
    setIsSaving(albumId);

    try {
      if (currentlyInAlbum) {
        // Remove from album
        await axiosInstance.patch(`/admin/albums/${albumId}/songs`, {
          op: "remove",
          songId: song._id,
        });

        // Update local state
        setSelectedAlbums((prev) => {
          const newSet = new Set(prev);
          newSet.delete(albumId);
          return newSet;
        });

        toast.custom(
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg border border-white/10"
          >
            <span className="text-sm">Removed from album</span>
          </motion.div>,
          { duration: 1500 }
        );
      } else {
        // Add to album
        await axiosInstance.patch(`/admin/albums/${albumId}/songs`, {
          op: "add",
          songId: song._id,
        });

        // Update local state
        setSelectedAlbums((prev) => {
          const newSet = new Set(prev);
          newSet.add(albumId);
          return newSet;
        });

        toast.custom(
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-violet-600/90 text-white px-4 py-2 rounded-full shadow-lg border border-violet-500/20"
          >
            <span className="text-sm">Added to album</span>
          </motion.div>,
          { duration: 1500 }
        );
      }
    } catch (error) {
      console.error("Failed to update album:", error);
      toast.error("Failed to update album");
    } finally {
      setIsSaving(null);
    }
  };

  const handleClose = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Sync changes back to store when closing
    await fetchSongs();
    await refreshAlbums();
    onClose();
  };

  // Generate album thumbnail
  const getAlbumThumbnail = (album: any) => {
    if (album.imageUrl) {
      return (
        <img
          src={album.imageUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      );
    }

    // Mosaic from song covers
    if (album.previewImages && album.previewImages.length > 0) {
      const images = album.previewImages.slice(0, 4);
      if (images.length >= 4) {
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2">
            {images.map((img: string, idx: number) => (
              <img
                key={idx}
                src={img}
                alt=""
                className="w-full h-full object-cover"
              />
            ))}
          </div>
        );
      } else if (images.length > 0) {
        return (
          <img
            src={images[0]}
            alt=""
            className="w-full h-full object-cover"
          />
        );
      }
    }

    return <Disc3 className="w-5 h-5 text-zinc-500" />;
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-[99999]"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-md overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 pb-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">Add to Album</h3>
                <p className="text-sm text-zinc-400 line-clamp-1">{song.title}</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Content - Added no-scrollbar class */}
          <div className="p-3 max-h-[350px] overflow-y-auto no-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                {/* Empty State */}
                {albums.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-zinc-500">
                    <Music className="w-11 h-11 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No albums yet</p>
                    <p className="text-xs mt-1">Create an album first</p>
                  </div>
                )}

                {/* Album List */}
                {albums.map((album) => {
                  const inAlbum = isInAlbum(album._id);
                  const isModifying = isSaving === album._id;

                  return (
                    <button
                      key={album._id}
                      onClick={() => handleToggleAlbum(album._id)}
                      disabled={!!isSaving}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                        inAlbum ? "bg-transparent" : "hover:bg-zinc-800/70"
                      } ${isSaving ? "opacity-70" : ""}`}
                    >
                      {/* Thumbnail */}
                      <div className="w-11 h-11 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                        {getAlbumThumbnail(album)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-white line-clamp-1">
                          {album.title}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {album.artist} • {album.songs?.length || 0} songs
                        </p>
                      </div>

                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                          inAlbum
                            ? "bg-violet-500"
                            : "border-2 border-zinc-600"
                        }`}
                      >
                        {isModifying ? (
                          <Loader className="w-3 h-3 text-white animate-spin" />
                        ) : inAlbum ? (
                          <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={handleClose}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
};

export default MoveToAlbumDialog;