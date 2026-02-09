// src/components/Queue.tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Trash2, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Song } from "@/types";

const DragHandle = ({ className }: { className?: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const SortableItem = ({
  song,
  currentSong,
  playSong,
  removeFromQueue,
  isTouchDevice,
}: {
  song: Song;
  currentSong: Song | null;
  playSong: (song: Song) => void;
  removeFromQueue: (id: string) => void;
  isTouchDevice: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song._id });

  const swipeMax = -80;
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTouchDevice) return;
    startX.current = e.touches[0].clientX;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchDevice || startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < -10) isSwiping.current = true;
    if (isSwiping.current) {
      const clamped = Math.max(Math.min(dx, 0), swipeMax);
      setSwipeX(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (!isTouchDevice) return;
    if (swipeX <= -60) {
      removeFromQueue(song._id);
    } else {
      setSwipeX(0);
    }
    startX.current = null;
    isSwiping.current = false;
  };

  const dy = typeof transform?.y === "number" ? transform.y : 0;
  const dx = swipeX;
  const transformStr = `translate3d(${dx}px, ${dy}px, 0)`;
  const style = {
    transform: transformStr,
    transition: transition || "transform 200ms cubic-bezier(0.25,1,0.5,1)",
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  } as const;

  const isCurrent = currentSong?._id === song._id;

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-200",
        isTouchDevice ? "active:bg-zinc-800/60" : "hover:bg-zinc-800/60",
        isCurrent && "bg-zinc-800/40 ring-1 ring-violet-500/20",
        isDragging && "shadow-xl shadow-black/40 bg-zinc-800"
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        if (!isSwiping.current && Math.abs(swipeX) < 10) playSong(song);
      }}
    >
      {isTouchDevice && swipeX < -10 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-red-500 transition-all",
            swipeX <= -60 && "scale-110"
          )}>
            <Trash2 className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      <div className="relative shrink-0">
        <img
          src={song.imageUrl}
          alt={song.title}
          loading="lazy"
          className={cn(
            "w-11 h-11 rounded-md object-cover ring-1 ring-white/5 transition-all",
            "group-hover:ring-white/10",
            isCurrent && "ring-violet-500/30"
          )}
        />
        {isCurrent && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-3 bg-violet-400 animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-0.5 h-3 bg-violet-400 animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-0.5 h-3 bg-violet-400 animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      <div className={cn(
        "flex-1 min-w-0 transition-all duration-200",
        !isTouchDevice && "pr-0 group-hover:pr-[60px]"
      )}>
        <p className={cn(
          "font-normal text-sm line-clamp-1 transition-colors duration-200",
          isCurrent ? "text-violet-400" : "text-zinc-200"
        )}>
          {song.title}
        </p>
        <p className="text-xs text-zinc-400/80 line-clamp-1">
          {song.artist}
        </p>
      </div>

      {isTouchDevice && (
        <div
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          className={cn(
            "shrink-0 p-1 cursor-grab active:cursor-grabbing transition-colors",
            "text-zinc-600",
            isDragging && "text-violet-400"
          )}
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: "none" }}
          aria-label="Reorder"
        >
          <DragHandle className="w-4 h-4" />
        </div>
      )}

      {!isTouchDevice && (
        <div className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2",
          "flex items-center gap-0.5 shrink-0",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        )}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFromQueue(song._id);
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              "text-zinc-400/80 hover:text-red-400 hover:bg-red-400/10"
            )}
            aria-label="Remove from queue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
              "p-1 cursor-grab active:cursor-grabbing transition-colors",
              "text-zinc-400/80 hover:text-zinc-300",
              isDragging && "text-violet-400"
            )}
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: "none" }}
            aria-label="Reorder"
          >
            <DragHandle className="w-4 h-4" />
          </div>
        </div>
      )}
    </motion.li>
  );
};

const Queue = () => {
  const {
    queue,
    currentSong,
    currentIndex,
    playSong,
    removeFromQueue,
    displayQueue,
    reorderQueue,
  } = usePlayerStore();

  const isTouchDevice = useIsTouchDevice();

  // Get next songs (after current, excluding current)
  const nextSongs = useMemo(() => {
    if (currentIndex === -1 || displayQueue.length === 0) return [];

    const upcoming = displayQueue.slice(currentIndex + 1);

    const seen = new Set<string>();
    const deduped = upcoming.filter((s) => {
      if (seen.has(s._id)) return false;
      seen.add(s._id);
      return true;
    });

    return deduped.slice(0, 20);
  }, [displayQueue, currentIndex]);







  // DnD items
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const newIds = nextSongs.map((s) => s._id);
    setItems(prevItems => {
      if (
        newIds.length !== prevItems.length ||
        newIds.some((id, idx) => id !== prevItems[idx])
      ) {
        return newIds;
      }
      return prevItems;
    });
  }, [nextSongs]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems(prevItems => {
      const oldIndex = prevItems.indexOf(active.id as string);
      const newIndex = prevItems.indexOf(over.id as string);

      if (oldIndex === -1 || newIndex === -1) return prevItems;

      const newItems = arrayMove(prevItems, oldIndex, newIndex);

      queueMicrotask(() => {
        const reordered = newItems
          .map((id) => nextSongs.find((s) => s._id === id))
          .filter((s): s is Song => s !== undefined);

        if (reordered.length > 0) {
          reorderQueue(reordered);
        }
      });

      return newItems;
    });
  }, [nextSongs, reorderQueue]);

  const songMap = useMemo(() => {
    const map = new Map<string, Song>();
    nextSongs.forEach(song => map.set(song._id, song));
    return map;
  }, [nextSongs]);


  return (
    <div className="text-white h-full flex flex-col bg-zinc-900/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 md:-mt-6 border-b border-zinc-800/50 shrink-0">
        <div className="md:hidden flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Queue</h2>
          {queue.length > 0 && (
            <span className="text-xs text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded-full">
              {queue.length} {queue.length === 1 ? 'song' : 'songs'}
            </span>
          )}
        </div>

        {/* Now Playing */}
        {currentSong && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Now Playing
            </p>
            <div className="flex items-center gap-3 p-2 -mx-2 rounded-lg bg-gradient-to-r from-violet-500/10 to-transparent">
              <div className="relative">
                <img
                  src={currentSong.imageUrl}
                  alt={currentSong.title}
                  loading="lazy"
                  className="w-12 h-12 rounded-md object-cover ring-2 ring-violet-500/30"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md">
                  <div className="flex gap-[3px]">
                    <div className="w-[3px] h-3.5 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-[3px] h-3.5 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-[3px] h-3.5 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1 text-violet-300">
                  {currentSong.title}
                </p>
                <p className="text-xs text-zinc-400 line-clamp-1">
                  {currentSong.artist}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Queue Content */}
      {queue.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative bg-zinc-800/50 rounded-full mb-4 p-4">
            <Music2 className="size-7 text-zinc-400" />
          </div>
          <div className="space-y-2 max-w-[180px]">
            <h3 className="text-sm font-medium text-zinc-300">
              Your queue is empty
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Add songs to your queue and they'll appear here
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-3 py-0">
          <div className="space-y-6">
            {/* Up Next Section */}
            {items.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider py-1 px-2">
                  Next Up
                </p>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-1">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {items.map((id) => {
                          const song = songMap.get(id);
                          if (!song) return null;
                          return (
                            <SortableItem
                              key={song._id}
                              song={song}
                              currentSong={currentSong}
                              playSong={playSong}
                              removeFromQueue={removeFromQueue}
                              isTouchDevice={isTouchDevice}
                            />
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default Queue;