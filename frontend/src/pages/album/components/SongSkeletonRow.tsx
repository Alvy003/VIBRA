// src/pages/album/components/SongSkeletonRow.tsx
import { memo } from "react";

type Props = {
  variant: "compact" | "medium" | "full";
};

export const SongSkeletonRow = memo(({ variant }: Props) => {
  if (variant === "compact") {
    return (
      <div className="grid grid-cols-[1fr_36px] gap-2 px-2 py-2.5 h-full items-center">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-10 rounded bg-white/[0.06] animate-shimmer shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="h-3.5 w-[70%] max-w-[180px] rounded bg-white/[0.06] animate-shimmer" />
            <div className="h-2.5 w-[50%] max-w-[120px] rounded bg-white/[0.06] animate-shimmer" />
          </div>
        </div>
        <div className="size-7 rounded-full bg-white/[0.04] justify-self-end" />
      </div>
    );
  }

  if (variant === "medium") {
    return (
      <div className="grid grid-cols-[1fr_50px_36px] gap-2 px-3 py-2.5 h-full items-center">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-10 rounded bg-white/[0.06] animate-shimmer shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="h-3.5 w-[65%] max-w-[200px] rounded bg-white/[0.06] animate-shimmer" />
            <div className="h-2.5 w-[45%] max-w-[140px] rounded bg-white/[0.06] animate-shimmer" />
          </div>
        </div>
        <div className="h-3 w-10 rounded bg-white/[0.06] animate-shimmer" />
        <div className="size-7 rounded-full bg-white/[0.04] justify-self-end" />
      </div>
    );
  }

  // Full variant
  return (
    <div className="grid grid-cols-[1fr_48px] md:grid-cols-[24px_4fr_2fr_minmax(60px,1fr)_48px] px-3 md:px-4 py-3 gap-3 h-full items-center">
      {/* Track number */}
      <div className="hidden md:flex justify-center">
        <div className="h-4 w-4 rounded bg-white/[0.06] animate-shimmer" />
      </div>
      
      {/* Title & Artist */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-10 rounded bg-white/[0.06] animate-shimmer shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="h-3.5 w-[60%] max-w-[220px] rounded bg-white/[0.06] animate-shimmer" />
          <div className="h-2.5 w-[35%] max-w-[120px] rounded bg-white/[0.06] animate-shimmer" />
        </div>
      </div>
      
      {/* Release date */}
      <div className="hidden md:flex">
        <div className="h-3 w-20 rounded bg-white/[0.06] animate-shimmer" />
      </div>
      
      {/* Duration */}
      <div className="hidden md:flex">
        <div className="h-3 w-10 rounded bg-white/[0.06] animate-shimmer" />
      </div>
      
      {/* Options */}
      <div className="size-7 rounded-full bg-white/[0.04] justify-self-end" />
    </div>
  );
});

SongSkeletonRow.displayName = "SongSkeletonRow";