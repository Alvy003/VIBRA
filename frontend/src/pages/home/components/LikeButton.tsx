// src/pages/home/components/LikeButton.tsx
import { useAuth } from "@clerk/clerk-react";
import { useMusicStore } from "@/stores/useMusicStore";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Song } from "@/types";

interface LikeButtonProps {
  song: Song;
  /** @deprecated Use `song` prop instead. Kept for backward compat. */
  songId?: string;
  className?: string;
  size?: number;
}

const LikeButton = ({ song, songId: legacySongId, className, size = 5 }: LikeButtonProps) => {
  const { isSignedIn } = useAuth();
  const { likedSongs, likeSong, unlikeSong } = useMusicStore();
  const [loading, setLoading] = useState(false);

  // Determine the ID to use for matching
  const songId = song?._id || song?.externalId || legacySongId || "";

  // Check if liked — match by _id OR externalId
  const isLiked = likedSongs.some((s) => {
    const likedId = s._id || (s as any).externalId;
    return likedId === songId || likedId === song?.externalId;
  });

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isSignedIn) {
      toast.custom(
        <div className="bg-red-800/95 text-white px-4 py-2 rounded-full shadow-lg border border-red-400/30">
          <span className="text-sm">Please sign in to Like Songs</span>
        </div>,
        { duration: 1500 }
      );
      return;
    }

    try {
      setLoading(true);
      if (isLiked) {
        await unlikeSong(songId);
      } else {
        // Pass full song data for external songs
        await likeSong(songId, song);
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    } finally {
      setLoading(false);
    }
  };

  const sizeClass = `size-${size}`;

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className || "focus:outline-none"}
      aria-label={isLiked ? "Unlike song" : "Like song"}
    >
      <Heart
        className={`${sizeClass} transition ${
          isLiked
            ? "fill-violet-500 text-violet-500"
            : "text-zinc-300 hover:text-white"
        } ${loading ? "opacity-50" : ""}`}
      />
    </button>
  );
};

export default LikeButton;