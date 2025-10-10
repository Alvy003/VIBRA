// src/pages/home/components/LikeButton.tsx
import { useAuth, useClerk } from "@clerk/clerk-react";
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
  const { redirectToSignIn } = useClerk();

  const isLiked = likedSongs.some((s) => s._id === songId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isSignedIn) {
      toast("Please sign in to like songs");
      setTimeout(() => {
        redirectToSignIn({ redirectUrl: window.location.href });
      }, 1000);
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
