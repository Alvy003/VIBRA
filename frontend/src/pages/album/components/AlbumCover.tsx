import { Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Song } from "@/types";

interface AlbumCoverProps {
  songs?: Song[];
  imageUrl?: string | null;
  className?: string;
}

export const AlbumCover = ({ songs = [], imageUrl, className }: AlbumCoverProps) => {
  // Explicit album artwork
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Album"
        loading="lazy"
        className={cn("w-full h-full object-cover rounded-lg", className)}
      />
    );
  }

  const covers = songs
    .map((s) => s.imageUrl)
    .filter(Boolean)
    .slice(0, 4);

  // No songs → placeholder
  if (covers.length === 0) {
    return (
      <div className={cn(
        "w-full h-full rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-600/30 flex items-center justify-center",
        className
      )}>
        <Disc3 className="w-12 h-12 text-violet-400/70" />
      </div>
    );
  }

  // Single song
  if (covers.length < 4) {
    return (
      <img
        src={covers[0]}
        alt="Album"
        loading="lazy"
        className={cn("w-full h-full object-cover rounded-lg", className)}
      />
    );
  }

  // Mosaic
  return (
    <div className={cn(
      "w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 rounded-lg overflow-hidden",
      className
    )}>
      {covers.map((cover, i) => (
        <img key={i} src={cover} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
};
