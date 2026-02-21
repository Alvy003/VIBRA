// components/EditSongDialog.tsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useMusicStore } from "@/stores/useMusicStore";
import {
  X, Loader2, Upload, Image as ImageIcon, Music,
  Sparkles, Languages, Search,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  GENRE_OPTIONS,
  MOOD_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/pages/admin/components/AddSong/constants";
import { fetchTrackTags } from "@/pages/admin/components/AddSong/utils";

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
    genre?: string | null;
    mood?: string | null;
    language?: string | null;
  };
}

const EditSongDialog = ({ isOpen, onClose, song }: EditSongDialogProps) => {
  const { updateSong, updateSongImage, updateSongAudio } = useMusicStore();

  const [formData, setFormData] = useState({
    title: song.title,
    artist: song.artist,
    duration: song.duration,
    genre: song.genre || "",
    mood: song.mood || "",
    language: song.language || "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(song.imageUrl);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

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
        genre: song.genre || "",
        mood: song.mood || "",
        language: song.language || "",
      });
      setImagePreview(song.imageUrl);
      setImageFile(null);
      setAudioFile(null);
    }
  }, [isOpen, song]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      // Cleanup previous blob URL
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("audio/")) {
        toast.error("Please select an audio file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Audio must be less than 10MB");
        return;
      }

      setAudioFile(file);

      const url = URL.createObjectURL(file);
      const audio = new Audio();

      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.removeEventListener("loadedmetadata", onLoaded);
        audio.removeEventListener("error", onError);
        audio.src = "";
      };

      const onLoaded = () => {
        if (audio.duration && isFinite(audio.duration)) {
          setFormData((prev) => ({
            ...prev,
            duration: Math.round(audio.duration),
          }));
        }
        cleanup();
      };

      const onError = () => cleanup();

      audio.addEventListener("loadedmetadata", onLoaded);
      audio.addEventListener("error", onError);
      audio.src = url;
    }
  };

  // Auto-detect genre, mood, language from Last.fm
  const handleAutoDetect = async () => {
    if (!formData.title.trim() && !formData.artist.trim()) {
      toast.error("Need title or artist to auto-detect");
      return;
    }

    setIsAutoDetecting(true);
    try {
      const tags = await fetchTrackTags(formData.title, formData.artist);

      const updates: Partial<typeof formData> = {};
      let detectedCount = 0;

      if (tags.genre && !formData.genre) {
        updates.genre = tags.genre;
        detectedCount++;
      }
      if (tags.mood && !formData.mood) {
        updates.mood = tags.mood;
        detectedCount++;
      }
      if (tags.language && !formData.language) {
        updates.language = tags.language;
        detectedCount++;
      }

      if (detectedCount > 0) {
        setFormData((prev) => ({ ...prev, ...updates }));
        toast.success(`Auto-detected ${detectedCount} field(s)`);
      } else if (tags.genre || tags.mood || tags.language) {
        // Fields were detected but already filled
        toast(
          "Fields already filled. Clear them first to auto-detect.",
          { icon: "ℹ️" }
        );
      } else {
        toast.error("Could not detect tags for this track");
      }
    } catch (error) {
      toast.error("Auto-detection failed");
    } finally {
      setIsAutoDetecting(false);
    }
  };

  // Force overwrite auto-detect (fills even if already set)
  const handleForceAutoDetect = async () => {
    if (!formData.title.trim() && !formData.artist.trim()) {
      toast.error("Need title or artist to auto-detect");
      return;
    }

    setIsAutoDetecting(true);
    try {
      const tags = await fetchTrackTags(formData.title, formData.artist);

      const updates: Partial<typeof formData> = {};
      if (tags.genre) updates.genre = tags.genre;
      if (tags.mood) updates.mood = tags.mood;
      if (tags.language) updates.language = tags.language;

      if (Object.keys(updates).length > 0) {
        setFormData((prev) => ({ ...prev, ...updates }));
        toast.success(`Updated ${Object.keys(updates).length} field(s)`);
      } else {
        toast.error("Could not detect any tags");
      }
    } catch {
      toast.error("Auto-detection failed");
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.artist.trim()) {
      toast.error("Title and artist are required");
      return;
    }

    setIsLoading(true);

    try {
      // Check if metadata changed (including new fields)
      const metadataChanged =
        formData.title !== song.title ||
        formData.artist !== song.artist ||
        formData.duration !== song.duration ||
        formData.genre !== (song.genre || "") ||
        formData.mood !== (song.mood || "") ||
        formData.language !== (song.language || "");

      if (metadataChanged) {
        setUploadProgress((prev) => ({ ...prev, metadata: true }));
        await updateSong(song._id, {
          title: formData.title,
          artist: formData.artist,
          duration: formData.duration,
          genre: formData.genre || null,
          mood: formData.mood || null,
          language: formData.language || null,
        });
        setUploadProgress((prev) => ({ ...prev, metadata: false }));
      }

      if (imageFile) {
        setUploadProgress((prev) => ({ ...prev, image: true }));
        await updateSongImage(song._id, imageFile);
        setUploadProgress((prev) => ({ ...prev, image: false }));
      }

      if (audioFile) {
        setUploadProgress((prev) => ({ ...prev, audio: true }));
        await updateSongAudio(song._id, audioFile, formData.duration);
        setUploadProgress((prev) => ({ ...prev, audio: false }));
      }

      toast.success("Song updated successfully");
      onClose();
    } catch (error) {
      // Errors handled in store
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
      formData.genre !== (song.genre || "") ||
      formData.mood !== (song.mood || "") ||
      formData.language !== (song.language || "") ||
      imageFile !== null ||
      audioFile !== null
    );
  };

  // Show which fields are missing for visual hint
  const missingTagsCount = [
    !formData.genre,
    !formData.mood,
    !formData.language,
  ].filter(Boolean).length;

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
                <h3 className="text-lg font-semibold text-white">Edit Song</h3>
                {missingTagsCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded-full">
                    {missingTagsCount} tag{missingTagsCount > 1 ? "s" : ""} missing
                  </span>
                )}
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
                    {imageFile ? "Change Image" : "Replace Image"}
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
                  {audioFile ? "Change Audio" : "Replace Audio"}
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
              <label htmlFor="edit-title" className="text-sm text-zinc-300 block">
                Title
              </label>
              <input
                id="edit-title"
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
              <label htmlFor="edit-artist" className="text-sm text-zinc-300 block">
                Artist
              </label>
              <input
                id="edit-artist"
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
              <label htmlFor="edit-duration" className="text-sm text-zinc-300 block">
                Duration (seconds)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="edit-duration"
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

            <div className="border-t border-zinc-800 pt-4" />

            {/* Genre, Mood & Language Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  Tags
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoDetect}
                    disabled={isAutoDetecting || (!formData.title && !formData.artist)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAutoDetecting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Search className="w-3 h-3" />
                    )}
                    Auto-Detect
                  </button>
                  {(formData.genre || formData.mood || formData.language) && (
                    <button
                      type="button"
                      onClick={handleForceAutoDetect}
                      disabled={isAutoDetecting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs font-medium transition-colors disabled:opacity-50"
                      title="Overwrite existing values with auto-detected ones"
                    >
                      {isAutoDetecting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Re-detect
                    </button>
                  )}
                </div>
              </div>

              {/* Genre */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Music className="w-3 h-3 text-violet-400" />
                  Genre
                  {!formData.genre && (
                    <span className="text-amber-400/70 text-[10px]">(missing)</span>
                  )}
                </label>
                <select
                  value={formData.genre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, genre: e.target.value }))
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 appearance-none cursor-pointer"
                >
                  <option value="">No Genre</option>
                  {GENRE_OPTIONS.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mood */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Mood
                  {!formData.mood && (
                    <span className="text-amber-400/70 text-[10px]">(missing)</span>
                  )}
                </label>
                <select
                  value={formData.mood}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, mood: e.target.value }))
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 appearance-none cursor-pointer"
                >
                  <option value="">No Mood</option>
                  {MOOD_OPTIONS.map((mood) => (
                    <option key={mood} value={mood}>
                      {mood}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Languages className="w-3 h-3 text-cyan-400" />
                  Language
                  {!formData.language && (
                    <span className="text-amber-400/70 text-[10px]">(missing)</span>
                  )}
                </label>
                <select
                  value={formData.language}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, language: e.target.value }))
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 appearance-none cursor-pointer"
                >
                  <option value="">No Language</option>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick info about current state */}
              {(formData.genre || formData.mood || formData.language) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formData.genre && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-500/20 text-violet-400 text-[10px] font-medium rounded-full">
                      <Music className="w-2.5 h-2.5" />
                      {formData.genre}
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, genre: "" }))}
                        className="ml-0.5 hover:text-white"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )}
                  {formData.mood && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded-full">
                      <Sparkles className="w-2.5 h-2.5" />
                      {formData.mood}
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, mood: "" }))}
                        className="ml-0.5 hover:text-white"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )}
                  {formData.language && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-medium rounded-full">
                      <Languages className="w-2.5 h-2.5" />
                      {formData.language}
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, language: "" }))}
                        className="ml-0.5 hover:text-white"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )}
                </div>
              )}
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
              disabled={
                isLoading ||
                !hasChanges() ||
                !formData.title.trim() ||
                !formData.artist.trim()
              }
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