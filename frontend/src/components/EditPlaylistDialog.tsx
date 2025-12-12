import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Pencil, X, Loader2, Music, FileText, Trash2 } from "lucide-react";
import { usePlaylistStore } from "@/stores/usePlaylistStore";
import { Playlist } from "@/types";
import toast from "react-hot-toast";

interface EditPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist;
  onDelete?: () => void;
}

const EditPlaylistDialog = ({ isOpen, onClose, playlist, onDelete }: EditPlaylistDialogProps) => {
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description || "");
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { updatePlaylist, deletePlaylist } = usePlaylistStore();

  useEffect(() => {
    if (isOpen) {
      setName(playlist.name);
      setDescription(playlist.description || "");
      setShowDeleteConfirm(false);
    }
  }, [isOpen, playlist]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await updatePlaylist(playlist._id, {
        name: name.trim(),
        description: description.trim(),
      });
      toast.success("Playlist updated!");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update playlist");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deletePlaylist(playlist._id);
      toast.success("Playlist deleted");
      onClose();
      onDelete?.();
    } catch (error) {
      toast.error("Failed to delete playlist");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999]"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 pb-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">Edit Playlist</h3>
              </div>
              <button onClick={onClose} disabled={isLoading} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          {showDeleteConfirm ? (
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Delete Playlist?</h4>
                  <p className="text-sm text-zinc-400">This cannot be undone</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} disabled={isLoading} className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={isLoading} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-300 flex items-center gap-2">
                    <Music className="w-4 h-4" /> Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                    placeholder="Playlist name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-300 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none h-20"
                    placeholder="Add a description..."
                  />
                </div>
              </div>

              <div className="p-5 pt-2 border-t border-zinc-800">
                <div className="flex gap-3 mb-3">
                  <button onClick={onClose} disabled={isLoading} className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || !name.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save"}
                  </button>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete Playlist
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </>,
    document.body
  );
};

export default EditPlaylistDialog;