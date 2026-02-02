// src/components/AlbumThumbnail.tsx
import { cn } from "@/lib/utils";
import GeneratedAlbumCover from "./GeneratedAlbumCover";

interface AlbumThumbnailProps {
  imageUrl?: string | null;
  previewImages?: string[];
  title: string;
  useMosaicCover?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const AlbumThumbnail = ({
  imageUrl,
  previewImages = [],
  title,
  useMosaicCover = false,
  className,
  size = "md",
}: AlbumThumbnailProps) => {
  // Custom image takes priority
  if (imageUrl) {
    return (
      <div
        className={cn(
          "aspect-square rounded-lg overflow-hidden bg-zinc-800 shrink-0",
          className
        )}
      >
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Mosaic only if explicitly requested AND we have 4+ images
  if (useMosaicCover) {
    const images = previewImages.filter(Boolean).slice(0, 4);
    if (images.length >= 4) {
      return (
        <div
          className={cn(
            "aspect-square rounded-lg overflow-hidden bg-zinc-800 shrink-0",
            className
          )}
        >
          <div className="grid grid-cols-2 grid-rows-2 gap-px w-full h-full">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ))}
          </div>
        </div>
      );
    }
  }

  // Generated cover with image background
  return (
    <GeneratedAlbumCover
      title={title}
      previewImages={previewImages}
      className={cn("shrink-0", className)}
      size={size}
    />
  );
};

export default AlbumThumbnail;