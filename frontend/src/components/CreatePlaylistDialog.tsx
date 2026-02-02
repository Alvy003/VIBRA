import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Loader2, Music, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlaylistStore } from "@/stores/usePlaylistStore";
import toast from "react-hot-toast";

export const CreatePlaylistDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { createPlaylist } = usePlaylistStore();

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await createPlaylist(name.trim(), description.trim());
      setIsOpen(false);
      setName("");
      setDescription("");
      toast.success("Playlist created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create playlist");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsOpen(false);
      setName("");
      setDescription("");
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className="h-8 w-8 text-zinc-200 bg-zinc-800/50 p-2 md:p-0 md:bg-transparent rounded-full font-semibold active:text-white"
      >
        <Plus className="h-7 w-7" />
      </Button>

      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[99999]"
            onClick={handleClose}
          />

          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="dialog"
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
                  <div className="flex items-center gap-3">
                    {/* <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-violet-500" />
                    </div> */}
                    <h3 className="text-base font-normal text-white">Create Playlist</h3>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={isLoading}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-300 flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 placeholder:text-zinc-500"
                    placeholder="My Awesome Playlist"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && name.trim()) {
                        handleSubmit();
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-zinc-300 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 placeholder:text-zinc-500 resize-none h-20"
                    placeholder="Add a description..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-5 pt-2 border-t border-zinc-800">
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !name.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};