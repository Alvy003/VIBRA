// src/pages/album/components/AlbumCoverSmall.tsx
import { Disc3 } from "lucide-react";
import { Song } from "@/types";

interface AlbumCoverSmallProps {
  songs?: Song[];
  imageUrl?: string | null;
}

export const AlbumCoverSmall = ({
  songs = [],
  imageUrl,
}: AlbumCoverSmallProps) => {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Album"
        className="w-full h-full object-cover rounded"
      />
    );
  }

  const covers = songs
    .map((s) => s.imageUrl)
    .filter(Boolean)
    .slice(0, 4);

  if (covers.length === 0) {
    return (
      <div className="w-full h-full rounded bg-gradient-to-br from-violet-500/30 to-purple-600/30 flex items-center justify-center">
        <Disc3 className="w-4 h-4 text-violet-400/70" />
      </div>
    );
  }

  if (covers.length < 4) {
    return (
      <img
        src={covers[0]}
        alt="Album"
        className="w-full h-full object-cover rounded"
      />
    );
  }

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px rounded overflow-hidden">
      {covers.map((c, i) => (
        <img key={i} src={c} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
};
