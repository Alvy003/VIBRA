// src/pages/library/components/MobileLibraryPageSkeleton.tsx

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import Topbar from "@/components/Topbar";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import MobileSubHeader from "@/components/MobileSubHeader";

// Softer Shimmer
const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "relative overflow-hidden bg-zinc-800/40 rounded-md",
      className
    )}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent" />
  </div>
);

// Filter Chip Skeleton
const FilterChipSkeleton = ({ width = "w-16" }: { width?: string }) => (
  <Shimmer className={cn("h-8 rounded-full", width)} />
);

// Mosaic Thumbnail Skeleton
const MosaicThumbnailSkeleton = () => (
  <div className="size-12 rounded-md overflow-hidden bg-zinc-800/40">
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px">
      {[...Array(4)].map((_, i) => (
        <Shimmer key={i} className="rounded-none" />
      ))}
    </div>
  </div>
);

// Single Collection Item Skeleton
const CollectionItemSkeleton = ({
  index,
}: {
  index: number;
}) => (
  <div className="flex items-center gap-3 p-2 -mx-2">
    {/* Every 3rd item looks like mosaic (playlist style) */}
    {index % 3 === 0 ? (
      <MosaicThumbnailSkeleton />
    ) : (
      <Shimmer className="size-12 rounded-md shrink-0" />
    )}

    <div className="flex-1 min-w-0 space-y-1.5">
      {/* Slight width variation for realism */}
      <Shimmer
        className={cn(
          "h-3.5 rounded",
          index % 2 === 0 ? "w-2/3" : "w-1/2"
        )}
      />
      <Shimmer
        className={cn(
          "h-2.5 rounded",
          index % 2 === 0 ? "w-1/3" : "w-2/5"
        )}
      />
    </div>
  </div>
);

const MobileLibraryPageSkeleton = () => (
  <main className="h-full bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-900 rounded-lg overflow-hidden">
    <Topbar />

    <ScrollArea className="h-[calc(100vh-45px)] lg:h-[calc(100vh-180px)]">
      {/* Header */}
      <MobileSubHeader
        title="Your Library"
        className="ml-1"
        rightSlot={<Shimmer className="size-8 rounded-full" />}
      />

      <div className="px-4 pb-4">
        {/* Filter Chips */}
        <div
          className="sticky top-11 z-10 backdrop-blur bg-zinc-900/70
          flex items-center gap-2 overflow-x-auto scrollbar-none
          -mx-4 px-4 py-1.5"
        >
          <FilterChipSkeleton width="w-14" />
          <FilterChipSkeleton width="w-24" />
          <FilterChipSkeleton width="w-20" />
        </div>

        {/* Continuous List (Spotify-style) */}
        <section className="space-y-0 mt-2">
          {[...Array(8)].map((_, i) => (
            <CollectionItemSkeleton key={i} index={i} />
          ))}
        </section>

        <MobileOverlaySpacer />
      </div>
    </ScrollArea>

    {/* Shimmer animation */}
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