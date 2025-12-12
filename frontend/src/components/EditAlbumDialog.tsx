// components/EditAlbumDialog.tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMusicStore } from "@/stores/useMusicStore";
import { Pencil, X, Loader2, Calendar, User, Music } from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import toast from "react-hot-toast";

interface EditAlbumDialogProps {
  isOpen: boolean;
  onClose: () => void;
  album: {
    _id: string;
    title: string;
    artist: string;
    releaseYear: number;
    imageUrl: string;
  };
}

const EditAlbumDialog = ({ isOpen, onClose, album }: EditAlbumDialogProps) => {
  const { fetchAlbums } = useMusicStore();
  const [formData, setFormData] = useState({
    title: album.title,
    artist: album.artist,
    releaseYear: album.releaseYear,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: album.title,
        artist: album.artist,
        releaseYear: album.releaseYear,
      });
    }
  }, [isOpen, album]);

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.artist.trim()) return;

    setIsLoading(true);
    try {
      await axiosInstance.patch(`/admin/albums/${album._id}`, formData);
      await fetchAlbums();
      toast.success("Album updated successfully");
      onClose();
    } catch (error: any) {
      console.error("Error updating album:", error);
      toast.error(error.response?.data?.message || "Failed to update album");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999]"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-md overflow-hidden pointer-events-auto"
          onClick={handleDialogClick}
        >
          {/* Header */}
          <div className="p-5 pb-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">Edit Album</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Album Preview */}
          <div className="px-5 pt-4 flex items-center gap-4">
            <img
              src={album.imageUrl}
              alt={album.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-400">Editing album</p>
              <p className="text-white font-medium truncate">{album.title}</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="album-title" className="text-sm text-zinc-300 flex items-center gap-2">
                <Music className="w-4 h-4" />
                Title
              </label>
              <input
                id="album-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                placeholder="Album title"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="album-artist" className="text-sm text-zinc-300 flex items-center gap-2">
                <User className="w-4 h-4" />
                Artist
              </label>
              <input
                id="album-artist"
                value={formData.artist}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, artist: e.target.value }))
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                placeholder="Artist name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="album-year" className="text-sm text-zinc-300 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Release Year
              </label>
              <input
                id="album-year"
                type="number"
                value={formData.releaseYear}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    releaseYear: parseInt(e.target.value) || new Date().getFullYear(),
                  }))
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                placeholder="Release year"
                min="1900"
                max={new Date().getFullYear() + 1}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-5 pt-2 border-t border-zinc-800">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !formData.title.trim() || !formData.artist.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default EditAlbumDialog;