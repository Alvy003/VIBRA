// components/EditAlbumDialog.tsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useMusicStore } from "@/stores/useMusicStore";
import { X, Loader, Calendar, User, Music, ImagePlus, Trash2, Grid2X2 } from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import toast from "react-hot-toast";
import { Album } from "@/types";
import AlbumThumbnail from "./AlbumThumbnail";

interface EditAlbumDialogProps {
  isOpen: boolean;
  onClose: () => void;
  album: Album;
}

const EditAlbumDialog = ({ isOpen, onClose, album }: EditAlbumDialogProps) => {
  const { fetchAlbums, fetchAlbumById, updateAlbum } = useMusicStore();
  const [formData, setFormData] = useState({
    title: album.title,
    artist: album.artist,
    releaseYear: album.releaseYear,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: album.title,
        artist: album.artist,
        releaseYear: album.releaseYear,
      });
    }
  }, [isOpen, album]);

  const handleReplaceImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("imageFile", file);

    try {
      setIsImageLoading(true);
      await axiosInstance.patch(`/admin/albums/${album._id}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchAlbumById(album._id);
      await fetchAlbums();
      
      toast.custom(
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-violet-600/90 text-white px-4 py-2 rounded-full shadow-lg border border-violet-500/20"
        >
          <span className="text-sm">Album artwork updated</span>
        </motion.div>,
        { duration: 1500 }
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update artwork");
    } finally {
      setIsImageLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    try {
      setIsImageLoading(true);

      await axiosInstance.patch(`/admin/albums/${album._id}`, {
        imageUrl: null,
      });

      await fetchAlbumById(album._id);
      await fetchAlbums();

      toast.custom(
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg border border-white/10"
        >
          <span className="text-sm">Album artwork removed</span>
        </motion.div>,
        { duration: 1500 }
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove artwork");
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleToggleMosaic = async () => {
    try {
      await updateAlbum(album._id, {
        useMosaicCover: !album.useMosaicCover,
      });
      await fetchAlbumById(album._id);
    } catch (err) {
      toast.error("Failed to update mosaic setting");
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.artist.trim()) return;

    setIsLoading(true);
    try {
      await updateAlbum(album._id, formData);

      // 🔑 refresh BOTH
      await fetchAlbumById(album._id);
      await fetchAlbums(true);
      
      
      toast.custom(
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-violet-600/90 text-white px-4 py-2 rounded-full shadow-lg border border-violet-500/20"
        >
          <span className="text-sm">Album updated successfully</span>
        </motion.div>,
        { duration: 1500 }
      );
      onClose();
    } catch (error: any) {
      console.error("Error updating album:", error);
      toast.error(error.response?.data?.message || "Failed to update album");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onClose();
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
                <h3 className="text-lg font-semibold text-white">Edit Album</h3>
                <p className="text-sm text-zinc-400 line-clamp-1">{album.title}</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageSelected}
          />

          {/* Content */}
          <div className="p-4 max-h-[450px] overflow-y-auto no-scrollbar space-y-4">
            
            {/* Album Artwork Section */}
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {isImageLoading ? (
                    <Loader className="w-6 h-6 text-violet-500 animate-spin" />
                  ) : album.imageUrl ? (
                    <img
                      src={album.imageUrl}
                      alt={album.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <AlbumThumbnail
                      imageUrl={album.imageUrl}
                      previewImages={album.previewImages}
                      title={album.title}
                      useMosaicCover={album.useMosaicCover}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              {/* Artwork Actions */}
              <div className="flex-1 flex flex-col justify-center gap-2">
                <button
                  onClick={handleReplaceImage}
                  disabled={isImageLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-white text-sm transition-colors disabled:opacity-50"
                >
                  <ImagePlus className="w-4 h-4 text-violet-400" />
                  {album.imageUrl ? "Replace Artwork" : "Add Artwork"}
                </button>
                
                {album.imageUrl && (
                  <button
                    onClick={handleRemoveImage}
                    disabled={isImageLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-sm transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Artwork
                  </button>
                )}

                {/* Mosaic Toggle */}
                <button
                  onClick={handleToggleMosaic}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    album.useMosaicCover
                      ? "bg-violet-500/20 text-violet-400"
                      : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <Grid2X2 className="w-4 h-4" />
                  Mosaic Cover
                  {album.useMosaicCover && (
                    <span className="ml-auto text-[10px] bg-violet-500/30 px-1.5 py-0.5 rounded">ON</span>
                  )}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-800" />

            {/* Form Fields */}
            <div className="space-y-3">
              {/* Title */}
              <div className="space-y-1.5">
                <label htmlFor="album-title" className="text-xs text-zinc-400 flex items-center gap-1.5 px-1">
                  <Music className="w-3.5 h-3.5" />
                  Title
                </label>
                <input
                  id="album-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full bg-zinc-800/70 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
                  placeholder="Album title"
                />
              </div>

              {/* Artist */}
              <div className="space-y-1.5">
                <label htmlFor="album-artist" className="text-xs text-zinc-400 flex items-center gap-1.5 px-1">
                  <User className="w-3.5 h-3.5" />
                  Artist
                </label>
                <input
                  id="album-artist"
                  value={formData.artist}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, artist: e.target.value }))
                  }
                  className="w-full bg-zinc-800/70 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
                  placeholder="Artist name"
                />
              </div>

              {/* Release Year */}
              <div className="space-y-1.5">
                <label htmlFor="album-year" className="text-xs text-zinc-400 flex items-center gap-1.5 px-1">
                  <Calendar className="w-3.5 h-3.5" />
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
                  className="w-full bg-zinc-800/70 border border-zinc-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent transition-all"
                  placeholder="Release year"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 flex gap-3">
            <button
              onClick={handleClose}
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
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
};

export default EditAlbumDialog;