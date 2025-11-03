// components/Queue.tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { usePlayerStore } from "@/stores/usePlayerStore";
import { useMusicStore } from "@/stores/useMusicStore";
import { Trash2, Plus, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

// ✅ Spotify-style horizontal drag handle (3 lines)
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
  isDesktop,
}: {
  song: any;
  currentSong: any;
  playSong: (song: any) => void;
  removeFromQueue: (id: string) => void;
  isDesktop: boolean;
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
    if (isDesktop) return;
    startX.current = e.touches[0].clientX;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDesktop || startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < -10) isSwiping.current = true;
    if (isSwiping.current) {
      const clamped = Math.max(Math.min(dx, 0), swipeMax);
      setSwipeX(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (isDesktop) return;
    if (swipeX <= -60) {
      removeFromQueue(song._id);
    } else {
      setSwipeX(0);
    }
    startX.current = null;
    isSwiping.current = false;
  };

  const dy = typeof transform?.y === "number" ? transform!.y : 0;
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
        "hover:bg-zinc-800/60",
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
      {/* ✅ Delete button revealed on swipe (mobile) */}
      {!isDesktop && swipeX < -10 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full bg-red-500 transition-all",
            swipeX <= -60 && "scale-110"
          )}>
            <Trash2 className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {/* ✅ Drag Handle (left) */}
      <div
        ref={(el) => setActivatorNodeRef(el as any)}
        {...listeners}
        {...attributes}
        className={cn(
          "shrink-0 p-1 cursor-grab active:cursor-grabbing transition-colors",
          "text-zinc-600 hover:text-zinc-300",
          isDragging && "text-violet-400"
        )}
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: "none" }}
        aria-label="Reorder"
      >
        <DragHandle className="w-4 h-4" />
      </div>

      {/* ✅ Album Art */}
      <div className="relative shrink-0">
        <img
          src={song.imageUrl}
          alt={song.title}
          className={cn(
            "w-11 h-11 rounded object-cover ring-1 ring-white/5 transition-all",
            "group-hover:ring-violet-500/20",
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

      {/* ✅ Song Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm truncate transition-colors",
          isCurrent ? "text-violet-400" : "text-white"
        )}>
          {song.title}
        </p>
        <p className="text-xs text-zinc-400 truncate">
          {song.artist}
        </p>
      </div>

      {/* ✅ Delete Button (desktop) */}
      {isDesktop && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeFromQueue(song._id);
          }}
          className={cn(
            "shrink-0 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100",
            "text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
          )}
          aria-label="Remove from queue"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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
    addSongToQueue,
    displayQueue,
    reorderQueue,
  } = usePlayerStore();

  const { songs: allSongs } = useMusicStore();

  const nextSongs = (() => {
    const seen = new Set<string>();
    const list = displayQueue.slice(currentIndex + 1).filter((s) => {
      if (seen.has(s._id)) return false;
      seen.add(s._id);
      return true;
    });
    const shortfall = 11 - list.length;
    if (shortfall > 0) {
      const exclude = new Set([
        ...seen,
        ...displayQueue.map((s) => s._id),
        currentSong?._id,
      ]);
      const fills = allSongs
        .filter((s) => !exclude.has(s._id))
        .sort(() => 0.5 - Math.random())
        .slice(0, shortfall);
      return list.concat(fills);
    }
    return list.slice(0, 11);
  })();

  const suggestions = (() => {
    const exclude = new Set([
      ...queue.map((s) => s._id),
      ...displayQueue.map((s) => s._id),
      currentSong?._id,
    ]);
    return allSongs.filter((s) => !exclude.has(s._id)).slice(0, 5);
  })();

  const [items, setItems] = useState<string[]>(() => nextSongs.map((s) => s._id));

  useEffect(() => {
    const newIds = nextSongs.map((s) => s._id);
    if (
      newIds.length !== items.length ||
      newIds.some((id, idx) => id !== items[idx])
    ) {
      setItems(newIds);
    }
  }, [nextSongs]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      const reordered = newItems
        .map((id) => nextSongs.find((s) => s._id === id))
        .filter(Boolean) as any[];
      reorderQueue(reordered);
    }
  };

  return (
    <div className="text-white h-full flex flex-col bg-zinc-900/50 rounded-lg overflow-hidden">
      {/* ✅ Polished Header */}
      <div className="p-4 border-b border-zinc-800/50 bg-gradient-to-b from-zinc-800/30 to-transparent shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white">Queue</h2>
          {queue.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 rounded-full">
              <Music2 className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-medium text-violet-400">
                {queue.length} {queue.length === 1 ? 'song' : 'songs'}
              </span>
            </div>
          )}
        </div>

        {/* ✅ Now Playing Card */}
        {currentSong && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <h3 className="text-xs font-medium text-violet-400 uppercase tracking-wide">
                Now Playing
              </h3>
            </div>
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-all",
              "bg-gradient-to-br from-violet-500/10 to-purple-500/5",
              "ring-1 ring-violet-500/20"
            )}>
              <div className="relative">
                <img
                  src={currentSong.imageUrl}
                  alt={currentSong.title}
                  className="w-12 h-12 rounded-lg object-cover ring-1 ring-violet-500/30"
                />
                <div className="absolute -bottom-1 -right-1 bg-violet-500 rounded-full p-1">
                  <Music2 className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-white">
                  {currentSong.title}
                </p>
                <p className="text-sm text-zinc-400 truncate">
                  {currentSong.artist}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Queue Content */}
      {queue.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl" />
            <div className="relative bg-zinc-800 rounded-full p-4 ring-1 ring-violet-500/20">
              <Music2 className="w-8 h-8 text-violet-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Queue is empty</h3>
          <p className="text-sm text-zinc-500 max-w-[200px]">
            Add songs to your queue to start playing
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-3 py-2">
          <div className="space-y-6">
            {/* ✅ Up Next Section */}
            {items.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 px-2">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Up Next
                  </h3>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-1">
                      <AnimatePresence>
                        {items.map((id) => {
                          const song = nextSongs.find((s) => s._id === id);
                          if (!song) return null;
                          return (
                            <SortableItem
                              key={song._id}
                              song={song}
                              currentSong={currentSong}
                              playSong={playSong}
                              removeFromQueue={removeFromQueue}
                              isDesktop={isDesktop}
                            />
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* ✅ Suggestions Section */}
            {suggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 px-2">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Suggested
                  </h3>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                <ul className="space-y-1">
                  {suggestions.map((song) => (
                    <li
                      key={song._id}
                      onClick={() => addSongToQueue(song)}
                      className={cn(
                        "group flex items-center gap-3 px-2 py-2 rounded-lg",
                        "cursor-pointer transition-all duration-200",
                        "hover:bg-zinc-800/60"
                      )}
                    >
                      {/* Add Icon */}
                      <div className={cn(
                        "shrink-0 p-1 rounded-lg transition-all",
                        "bg-zinc-800 group-hover:bg-violet-500"
                      )}>
                        <Plus className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                      </div>

                      {/* Album Art */}
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-11 h-11 rounded object-cover ring-1 ring-white/5 group-hover:ring-violet-500/20 transition-all"
                      />

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-white group-hover:text-violet-300 transition-colors">
                          {song.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          {song.artist}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default Queue;