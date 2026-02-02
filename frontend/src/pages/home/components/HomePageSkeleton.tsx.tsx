// src/pages/home/components/HomePageSkeleton.tsx
import { cn } from "@/lib/utils";

// Shimmer animation component
const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn("relative overflow-hidden bg-zinc-800/60 rounded-lg", className)}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent" />
  </div>
);

// Hero Skeleton
const HeroSkeleton = () => (
  <div className="relative h-[320px] sm:h-[360px] md:h-[380px]">
    {/* Background */}
    <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-800/80 to-zinc-900">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-violet-900/10 via-zinc-800/50 to-zinc-900" />
    </div>
    
    {/* Gradient overlays */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-zinc-900" />
    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/70 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-zinc-900 via-zinc-900/95 to-transparent" />
    
    {/* Content skeleton */}
    <div className="relative z-10 h-full flex flex-col justify-end px-4 sm:px-6 pb-6">
      {/* Featured pill skeleton */}
      <div className="flex items-center gap-3 bg-white/5 rounded-full pl-1 pr-4 py-1 w-fit border border-white/5">
        <Shimmer className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5">
          <Shimmer className="h-3.5 w-24 rounded" />
          <Shimmer className="h-2.5 w-16 rounded" />
        </div>
        <Shimmer className="w-8 h-8 rounded-full ml-2" />
      </div>
      
      {/* Dots skeleton */}
      <div className="flex items-center gap-1.5 mt-4">
        <Shimmer className="h-1.5 w-6 rounded-full" />
        {[...Array(4)].map((_, i) => (
          <Shimmer key={i} className="h-1.5 w-1.5 rounded-full" />
        ))}
      </div>
    </div>
  </div>
);

// Quick Pick Card Skeleton
const QuickPickSkeleton = () => (
  <div className="flex items-center gap-3 bg-zinc-800/40 rounded-xl overflow-hidden border border-white/5">
    <Shimmer className="w-12 h-12 rounded-none flex-shrink-0" />
    <div className="flex-1 min-w-0 pr-2 py-2 space-y-1.5">
      <Shimmer className="h-3.5 w-3/4 rounded" />
      <Shimmer className="h-2.5 w-1/2 rounded" />
    </div>
  </div>
);

// Song/Album Card Skeleton
const CardSkeleton = () => (
  <div>
    <Shimmer className="aspect-square rounded-lg mb-3" />
    <div className="space-y-1.5">
      <Shimmer className="h-3.5 w-3/4 rounded" />
      <Shimmer className="h-2.5 w-1/2 rounded" />
    </div>
  </div>
);

// Section Header Skeleton
const SectionHeaderSkeleton = () => (
  <div className="flex items-center gap-2 mb-4">
    <Shimmer className="hidden md:block w-8 h-8 rounded-lg" />
    <Shimmer className="h-6 w-28 rounded" />
  </div>
);

// Main Skeleton Component
const HomePageSkeleton = () => (
  <div className="relative">
    {/* Hero Skeleton */}
    <HeroSkeleton />

    {/* Content Sections */}
    <div className="px-4 sm:px-6 pb-6 space-y-8 bg-zinc-900 relative z-10 -mt-8 w-full max-w-full overflow-x-hidden">
      {/* Top blend */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-zinc-900 -translate-y-full pointer-events-none" />
      
      {/* Quick Picks Section */}
      <section className="pt-4">
        <SectionHeaderSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <QuickPickSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Albums Section */}
      <section>
        <SectionHeaderSkeleton />
        {/* Mobile horizontal */}
        <div className="flex gap-4 overflow-hidden md:hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-36 flex-shrink-0">
              <CardSkeleton />
            </div>
          ))}
        </div>
        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Made For You Section */}
      <section>
        <SectionHeaderSkeleton />
        {/* Mobile horizontal */}
        <div className="flex gap-4 overflow-hidden md:hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-36 flex-shrink-0">
              <CardSkeleton />
            </div>
          ))}
        </div>
        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Trending Section */}
      <section>
        <SectionHeaderSkeleton />
        {/* Mobile horizontal */}
        <div className="flex gap-4 overflow-hidden md:hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-36 flex-shrink-0">
              <CardSkeleton />
            </div>
          ))}
        </div>
        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* Bottom spacer */}
      <div className="h-24 md:h-0" />
    </div>
    
    {/* Shimmer keyframe animation */}
    <style>{`
      @keyframes shimmer {
        100% {
          transform: translateX(100%);
        }
      }
    `}</style>
  </div>
);

export default HomePageSkeleton;