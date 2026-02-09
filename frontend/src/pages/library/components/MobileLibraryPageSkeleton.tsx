// src/pages/library/components/MobileLibraryPageSkeleton.tsx
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import Topbar from "@/components/Topbar";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import MobileSubHeader from "@/components/MobileSubHeader";

// Shimmer animation component
const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn("relative overflow-hidden bg-zinc-800/60 rounded-lg", className)}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent" />
  </div>
);

// Filter Chip Skeleton
const FilterChipSkeleton = ({ width = "w-16" }: { width?: string }) => (
  <Shimmer className={cn("h-9 rounded-full", width)} />
);

// Section Header Skeleton
const SectionHeaderSkeleton = () => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <Shimmer className="h-3 w-24 rounded" />
    </div>
  </div>
);


// Mosaic Thumbnail Skeleton (for 2x2 grid effect)
const MosaicThumbnailSkeleton = () => (
  <div className="size-12 rounded-lg overflow-hidden bg-zinc-800/60">
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px">
      {[...Array(4)].map((_, i) => (
        <Shimmer key={i} className="rounded-none" />
      ))}
    </div>
  </div>
);

// Playlist/Album List Item with Mosaic option
const CollectionItemSkeleton = ({ showMosaic = false }: { showMosaic?: boolean }) => (
  <div className="flex items-center gap-3 p-2 -mx-2">
    {showMosaic ? (
      <MosaicThumbnailSkeleton />
    ) : (
      <Shimmer className="size-12 rounded-lg flex-shrink-0" />
    )}
    <div className="flex-1 min-w-0 space-y-1.5">
      <Shimmer className="h-3.5 w-2/3 rounded" />
      <Shimmer className="h-2.5 w-2/5 rounded" />
    </div>
  </div>
);

// Liked Songs Item Skeleton (with gradient)
// const LikedSongsSkeleton = () => (
//   <div className="flex items-center gap-3 p-2 -mx-2">
//     <div className="size-12 rounded-lg bg-zinc-800/60 flex-shrink-0" />
//     <div className="flex-1 min-w-0 space-y-1.5">
//       <Shimmer className="h-3.5 w-24 rounded" />
//       <Shimmer className="h-2.5 w-20 rounded" />
//     </div>
//   </div>
// );

// Main Skeleton Component
const MobileLibraryPageSkeleton = () => (
  <main className="h-full bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-900 rounded-lg overflow-hidden">
    <Topbar />

    <ScrollArea className="h-[calc(100vh-40px)] lg:h-[calc(100vh-180px)]">
      {/* Library Header Skeleton using MobileSubHeader */}
      <MobileSubHeader 
        title="Your Library" 
        className="ml-1"
        rightSlot={
          <Shimmer className="size-8 rounded-full" />
        }
      />

      <div className="px-4 pb-4 space-y-5">
        {/* Filter Chips Skeleton */}
        <div
          className="sticky top-11 z-10 backdrop-blur
              flex items-center gap-2 overflow-x-auto scrollbar-none
              -mx-4 px-4 py-2"
        >
          <FilterChipSkeleton width="w-14" />
          <FilterChipSkeleton width="w-24" />
          <FilterChipSkeleton width="w-20" />
        </div>

        {/* Playlists Section Skeleton */}
        <section className="space-y-1">
          <SectionHeaderSkeleton />
          <div className="space-y-0.5">
            {/* Liked Songs skeleton first */}
            {/* <LikedSongsSkeleton /> */}
            {[...Array(1)].map((_, i) => (
              <CollectionItemSkeleton key={`playlist-${i}`} showMosaic={i % 1 === 0} />
            ))}
          </div>
        </section>

        {/* Albums Section Skeleton */}
        <section className="space-y-1">
          <SectionHeaderSkeleton />
          <div className="space-y-0.5">
            {[...Array(6)].map((_, i) => (
              <CollectionItemSkeleton key={`album-${i}`} />
            ))}
          </div>
        </section>

        <MobileOverlaySpacer />
      </div>
    </ScrollArea>

    {/* Shimmer keyframe animation */}
    <style>{`
      @keyframes shimmer {
        100% {
          transform: translateX(100%);
        }
      }
    `}</style>
  </main>
);

export default MobileLibraryPageSkeleton;