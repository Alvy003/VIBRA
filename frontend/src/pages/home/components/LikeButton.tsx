// src/pages/home/components/LikeButton.tsx
import { useAuth } from "@clerk/clerk-react";//useClerk
import { useMusicStore } from "@/stores/useMusicStore";
import { Heart } from "lucide-react";
import { useState } from "react";
import {toast} from "react-hot-toast";

interface LikeButtonProps {
  songId: string;
}

const LikeButton = ({ songId }: LikeButtonProps) => {
  const { isSignedIn } = useAuth();
  const { likedSongs, likeSong, unlikeSong } = useMusicStore();
  const [loading, setLoading] = useState(false);
  // const { redirectToSignIn } = useClerk();

  const isLiked = likedSongs.some((s) => s._id === songId);

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
        await likeSong(songId);
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="focus:outline-none"
    >
      <Heart
        className={`size-5 transition ${
          isLiked
            ? "fill-violet-500 text-violet-500"
            : "text-zinc-400 hover:text-white"
        }`}
      />
    </button>
  );
};

export default LikeButton;
