import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { usePlaylistStore } from "@/stores/usePlaylistStore";
import { ListMusic, X, Check, Music, Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Song, Playlist } from "@/types";
import { axiosInstance } from "@/lib/axios";

interface AddToPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
}

const AddToPlaylistDialog = ({ isOpen, onClose, song }: AddToPlaylistDialogProps) => {
//   const { createPlaylist } = usePlaylistStore();
  
  // Completely local state - no store dependencies for list
  const [localPlaylists, setLocalPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch playlists directly - bypassing store to avoid re-renders
  useEffect(() => {
    if (isOpen && !isInitialized) {
      setIsLoading(true);
      setIsInitialized(true);
      
      axiosInstance.get("/playlists/my-playlists")
        .then((res) => {
          setLocalPlaylists(res.data);
        })
        .catch((err) => {
          console.error("Failed to fetch playlists:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    
    // Reset when dialog closes
    if (!isOpen) {
      setIsInitialized(false);
      setShowCreate(false);
      setNewPlaylistName("");
      setIsSaving(null);
      // Keep localPlaylists to avoid flash on reopen
    }
  }, [isOpen, isInitialized]);

  const isSongInPlaylist = useCallback(
    (playlistId: string) => {
      const playlist = localPlaylists.find((p) => p._id === playlistId);
      return playlist?.songs?.some((s) => s._id === song._id) || false;
    },
    [localPlaylists, song._id]
  );

  const handleTogglePlaylist = async (playlistId: string) => {
    const isInPlaylist = isSongInPlaylist(playlistId);
    setIsSaving(playlistId);
    
    try {
      if (isInPlaylist) {
        // Remove from playlist
        const res = await axiosInstance.patch(`/playlists/${playlistId}/songs`, {
          op: "remove",
          songId: song._id,
        });
        
        // Update local state with response
        setLocalPlaylists(prev => prev.map(p => 
          p._id === playlistId ? res.data : p
        ));
        
        toast.custom(
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg border border-white/10"
          >
            <span className="text-sm">Removed from playlist</span>
          </motion.div>,
          { duration: 1500 }
        );
      } else {
        // Add to playlist
        const res = await axiosInstance.patch(`/playlists/${playlistId}/songs`, {
          op: "add",
          songId: song._id,
        });
        
        // Update local state with response
        setLocalPlaylists(prev => prev.map(p => 
          p._id === playlistId ? res.data : p
        ));
        
        toast.custom(
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-violet-600/90 text-white px-4 py-2 rounded-full shadow-lg border border-violet-500/20"
          >
            <span className="text-sm">Added to playlist</span>
          </motion.div>,
          { duration: 1500 }
        );
      }
    } catch (error) {
      console.error("Failed to update playlist:", error);
      toast.error("Failed to update playlist");
    } finally {
      setIsSaving(null);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim()) return;
    setIsSaving("new");
    
    try {
      // Create playlist
      const createRes = await axiosInstance.post("/playlists", { 
        name: newPlaylistName.trim() 
      });
      const newPlaylist = createRes.data;
      
      // Add song to new playlist
      const addRes = await axiosInstance.patch(`/playlists/${newPlaylist._id}/songs`, {
        op: "add",
        songId: song._id,
      });
      
      // Add to local state
      setLocalPlaylists(prev => [addRes.data, ...prev]);
      
      // Also update the store for sidebar
      usePlaylistStore.getState().fetchUserPlaylists();
      
      toast.success("Created playlist and added song!");
      setShowCreate(false);
      setNewPlaylistName("");
    } catch (error: any) {
      console.error("Failed to create playlist:", error);
      toast.error(error.response?.data?.message || "Failed to create playlist");
    } finally {
      setIsSaving(null);
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Sync changes back to store when closing
    usePlaylistStore.getState().fetchUserPlaylists();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999]" 
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <ListMusic className="w-5 h-5 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">Add to Playlist</h3>
                  <p className="text-sm text-zinc-400 truncate max-w-[200px]">{song.title}</p>
                </div>
              </div>
              <button 
                onClick={handleClose} 
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 max-h-[350px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                {/* Create New Button */}
                {!showCreate ? (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/70 transition-all"
                  >
                    <div className="w-11 h-11 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-violet-400" />
                    </div>
                    <span className="text-sm font-medium text-white">Create New Playlist</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-zinc-800/50 space-y-3">
                    <input
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      placeholder="Playlist name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newPlaylistName.trim()) {
                          handleCreateAndAdd();
                        }
                        if (e.key === 'Escape') {
                          setShowCreate(false);
                          setNewPlaylistName("");
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setShowCreate(false);
                          setNewPlaylistName("");
                        }} 
                        className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateAndAdd}
                        disabled={!newPlaylistName.trim() || isSaving === "new"}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm flex items-center justify-center transition-colors"
                      >
                        {isSaving === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create & Add"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {localPlaylists.length === 0 && !showCreate && !isLoading && (
                  <div className="text-center py-8 text-zinc-500">
                    <Music className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No playlists yet</p>
                    <p className="text-xs mt-1">Create one to get started</p>
                  </div>
                )}

                {/* Playlist List */}
                {localPlaylists.map((playlist) => {
                  const isInPlaylist = isSongInPlaylist(playlist._id);
                  const isModifying = isSaving === playlist._id;
                  
                  return (
                    <button
                      key={playlist._id}
                      onClick={() => handleTogglePlaylist(playlist._id)}
                      disabled={!!isSaving}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                        isInPlaylist 
                          ? "bg-violet-500/10 ring-1 ring-violet-500/30" 
                          : "hover:bg-zinc-800/70"
                      } ${isSaving ? "opacity-70" : ""}`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isInPlaylist
                            ? "bg-violet-500"
                            : "border-2 border-zinc-600"
                        }`}
                      >
                        {isModifying ? (
                          <Loader2 className="w-3 h-3 text-white animate-spin" />
                        ) : isInPlaylist ? (
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        ) : null}
                      </div>

                      {/* Thumbnail */}
                      <div className="w-11 h-11 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                        {playlist.imageUrl ? (
                          <img src={playlist.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : playlist.songs && playlist.songs.length > 0 && playlist.songs[0].imageUrl ? (
                          <img src={playlist.songs[0].imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ListMusic className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-white truncate">{playlist.name}</p>
                        <p className="text-xs text-zinc-400">{playlist.songs?.length || 0} songs</p>
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

export default AddToPlaylistDialog;