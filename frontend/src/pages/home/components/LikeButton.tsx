// src/pages/home/components/LikeButton.tsx
import { useAuth, RedirectToSignIn } from "@clerk/clerk-react";
import { useMusicStore } from "@/stores/useMusicStore";
import { Heart } from "lucide-react";
import { useState } from "react";

interface LikeButtonProps {
  songId: string;
}

const LikeButton = ({ songId }: LikeButtonProps) => {
  const { isSignedIn } = useAuth();
  const { likedSongs, likeSong, unlikeSong } = useMusicStore();
  const [loading, setLoading] = useState(false);

  const isLiked = likedSongs.some((s) => s._id === songId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 🔑 If not signed in → trigger Clerk sign-in flow
    if (!isSignedIn) {
      RedirectToSignIn({});
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
