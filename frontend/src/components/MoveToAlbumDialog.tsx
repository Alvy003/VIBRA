// components/MoveToAlbumDialog.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useMusicStore } from "@/stores/useMusicStore";
import { FolderOpen, X, Check, Music, Loader2 } from "lucide-react";
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
  const {  fetchSongs, fetchAlbums: refreshAlbums } = useMusicStore();
  
  // Local albums state to avoid store re-renders
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [originalAlbums, setOriginalAlbums] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const hasInitialized = useRef(false);

  // Fetch albums directly without using store (to avoid isLoading issues)
  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      hasInitialized.current = true;
      setIsLoading(true);
      
      axiosInstance.get("/albums")
        .then((res) => {
          const fetchedAlbums = res.data;
          setAlbums(fetchedAlbums);
          
          // Calculate which albums contain this song
          const albumsContainingSong = new Set<string>();
          
          fetchedAlbums.forEach((album: any) => {
            const songIds = album.songs?.map((s: any) => 
              typeof s === 'string' ? s : s._id
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
          setOriginalAlbums(new Set(albumsContainingSong));
        })
        .catch((err) => {
          console.error("Error fetching albums:", err);
          toast.error("Failed to load albums");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    
    // Reset when closed
    if (!isOpen) {
      hasInitialized.current = false;
      setAlbums([]);
      setSelectedAlbums(new Set());
      setOriginalAlbums(new Set());
    }
  }, [isOpen, song._id, song.albumId]);

  const toggleAlbum = useCallback((albumId: string) => {
    setSelectedAlbums(prev => {
      const newSet = new Set(prev);
      if (newSet.has(albumId)) {
        newSet.delete(albumId);
      } else {
        newSet.add(albumId);
      }
      return newSet;
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const toAdd = [...selectedAlbums].filter(id => !originalAlbums.has(id));
      const toRemove = [...originalAlbums].filter(id => !selectedAlbums.has(id));
      
      // Add song to new albums
      for (const albumId of toAdd) {
        await axiosInstance.patch(`/admin/albums/${albumId}/songs`, {
          op: "add",
          songId: song._id
        });
      }
      
      // Remove song from unselected albums
      for (const albumId of toRemove) {
        await axiosInstance.patch(`/admin/albums/${albumId}/songs`, {
          op: "remove",
          songId: song._id
        });
      }
      
      if (toAdd.length > 0 || toRemove.length > 0) {
        const addedCount = toAdd.length;
        const removedCount = toRemove.length;
        
        let message = "";
        if (addedCount > 0 && removedCount > 0) {
          message = `Added to ${addedCount} album${addedCount > 1 ? 's' : ''}, removed from ${removedCount}`;
        } else if (addedCount > 0) {
          message = `Added to ${addedCount} album${addedCount > 1 ? 's' : ''}`;
        } else {
          message = `Removed from ${removedCount} album${removedCount > 1 ? 's' : ''}`;
        }
        
        toast.custom(
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-violet-600/90 text-white px-4 py-2 rounded-full shadow-lg border border-violet-500/30"
          >
            <span className="text-sm">{message}</span>
          </motion.div>,
          { duration: 2000 }
        );
        
        // Refresh store data after changes
        await fetchSongs();
        await refreshAlbums();
      }
      
      onClose();
    } catch (error) {
      console.error("Error updating albums:", error);
      toast.error("Failed to update albums");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = useCallback(() => {
    if (selectedAlbums.size !== originalAlbums.size) return true;
    for (const id of selectedAlbums) {
      if (!originalAlbums.has(id)) return true;
    }
    return false;
  }, [selectedAlbums, originalAlbums]);

  if (!isOpen) return null;

  // Use portal to render outside the component tree
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999]"
        onClick={onClose}
      />

      {/* Dialog Container */}
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 pb-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">
                    Add to Album
                  </h3>
                  <p className="text-sm text-zinc-400 truncate max-w-[200px]">
                    {song.title}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Album List */}
          <div className="p-3 max-h-[350px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            ) : albums.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No albums available</p>
                <p className="text-sm mt-1">Create an album first</p>
              </div>
            ) : (
              <div className="space-y-1">
                {albums.map((album: any) => {
                  const isSelected = selectedAlbums.has(album._id);
                  const wasOriginallySelected = originalAlbums.has(album._id);
                  
                  return (
                    <button
                      key={album._id}
                      onClick={() => toggleAlbum(album._id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                        isSelected
                          ? "bg-violet-500/15 ring-1 ring-violet-500/50"
                          : "hover:bg-zinc-800/70"
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isSelected
                            ? "bg-violet-500"
                            : "border-2 border-zinc-600"
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        )}
                      </div>

                      {/* Album Image */}
                      <img
                        src={album.imageUrl}
                        alt={album.title}
                        className="w-11 h-11 rounded-lg object-cover shrink-0"
                      />

                      {/* Album Info */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {album.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          {album.artist} • {album.songs?.length || 0} songs
                        </p>
                      </div>

                      {/* Status indicator */}
                      {isSelected !== wasOriginallySelected && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                          isSelected 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {isSelected ? "Adding" : "Removing"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            {hasChanges() && (
              <div className="mb-3 px-1">
                <p className="text-xs text-zinc-400">
                  {selectedAlbums.size === 0 
                    ? "Song will be removed from all albums (becomes a single)"
                    : `Song will be in ${selectedAlbums.size} album${selectedAlbums.size > 1 ? 's' : ''}`
                  }
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
};

export default MoveToAlbumDialog;