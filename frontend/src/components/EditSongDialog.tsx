// components/EditSongDialog.tsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useMusicStore } from "@/stores/useMusicStore";
import { Pencil, X, Loader2, Upload, Image as ImageIcon, Music } from "lucide-react";
import toast from "react-hot-toast";

interface EditSongDialogProps {
  isOpen: boolean;
  onClose: () => void;
  song: {
    _id: string;
    title: string;
    artist: string;
    duration: number;
    imageUrl: string;
    audioUrl: string;
  };
}

const EditSongDialog = ({ isOpen, onClose, song }: EditSongDialogProps) => {
  const { updateSong, updateSongImage, updateSongAudio } = useMusicStore();
  
  const [formData, setFormData] = useState({
    title: song.title,
    artist: song.artist,
    duration: song.duration,
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(song.imageUrl);
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    image: boolean;
    audio: boolean;
    metadata: boolean;
  }>({
    image: false,
    audio: false,
    metadata: false,
  });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: song.title,
        artist: song.artist,
        duration: song.duration,
      });
      setImagePreview(song.imageUrl);
      setImageFile(null);
      setAudioFile(null);
    }
  }, [isOpen, song]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Audio must be less than 10MB');
        return;
      }

      setAudioFile(file);
      
      // Try to get duration from audio file
      const audio = new Audio(URL.createObjectURL(file));
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && isFinite(audio.duration)) {
          setFormData(prev => ({
            ...prev,
            duration: Math.round(audio.duration),
          }));
        }
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.artist.trim()) {
      toast.error('Title and artist are required');
      return;
    }

    setIsLoading(true);

    try {
      // Update metadata (title, artist, duration)
      if (
        formData.title !== song.title ||
        formData.artist !== song.artist ||
        formData.duration !== song.duration
      ) {
        setUploadProgress(prev => ({ ...prev, metadata: true }));
        await updateSong(song._id, formData);
        setUploadProgress(prev => ({ ...prev, metadata: false }));
      }

      // Update image if changed
      if (imageFile) {
        setUploadProgress(prev => ({ ...prev, image: true }));
        await updateSongImage(song._id, imageFile);
        setUploadProgress(prev => ({ ...prev, image: false }));
      }

      // Update audio if changed
      if (audioFile) {
        setUploadProgress(prev => ({ ...prev, audio: true }));
        await updateSongAudio(song._id, audioFile, formData.duration);
        setUploadProgress(prev => ({ ...prev, audio: false }));
      }

      toast.success('Song updated successfully');
      onClose();
    } catch (error) {
      // Errors are handled in store
    } finally {
      setIsLoading(false);
      setUploadProgress({ image: false, audio: false, metadata: false });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const hasChanges = () => {
    return (
      formData.title !== song.title ||
      formData.artist !== song.artist ||
      formData.duration !== song.duration ||
      imageFile !== null ||
      audioFile !== null
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999]"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 pb-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-violet-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">Edit Song</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Cover Image
              </label>
              <div className="flex items-center gap-4">
                <img
                  src={imagePreview}
                  alt="Song cover"
                  className="w-20 h-20 rounded-lg object-cover border border-zinc-700"
                />
                <div className="flex-1">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {imageFile ? 'Change Image' : 'Replace Image'}
                  </button>
                  {imageFile && (
                    <p className="text-xs text-green-400 mt-1">
                      New image selected: {imageFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Audio Upload */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-300 flex items-center gap-2">
                <Music className="w-4 h-4" />
                Audio File
              </label>
              <div>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {audioFile ? 'Change Audio' : 'Replace Audio'}
                </button>
                {audioFile && (
                  <p className="text-xs text-green-400 mt-1">
                    New audio selected: {audioFile.name}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4" />

            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm text-zinc-300 block">
                Title
              </label>
              <input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                placeholder="Song title"
              />
            </div>

            {/* Artist */}
            <div className="space-y-2">
              <label htmlFor="artist" className="text-sm text-zinc-300 block">
                Artist
              </label>
              <input
                id="artist"
                value={formData.artist}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, artist: e.target.value }))
                }
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                placeholder="Artist name"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label htmlFor="duration" className="text-sm text-zinc-300 block">
                Duration (seconds)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      duration: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                  placeholder="Duration in seconds"
                />
                <span className="text-zinc-400 text-sm whitespace-nowrap">
                  ({formatDuration(formData.duration)})
                </span>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {isLoading && (
            <div className="px-5 pb-3">
              <div className="space-y-2">
                {uploadProgress.metadata && (
                  <div className="flex items-center gap-2 text-xs text-violet-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Updating song details...
                  </div>
                )}
                {uploadProgress.image && (
                  <div className="flex items-center gap-2 text-xs text-violet-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading new image...
                  </div>
                )}
                {uploadProgress.audio && (
                  <div className="flex items-center gap-2 text-xs text-violet-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading new audio file...
                  </div>
                )}
              </div>
            </div>
          )}

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
              disabled={isLoading || !hasChanges() || !formData.title.trim() || !formData.artist.trim()}
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
    </>,
    document.body
  );
};

export default EditSongDialog;