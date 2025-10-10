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
import { Trash2, GripVertical } from "lucide-react";

const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

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

  // --- SAFE transform: only use vertical y from dnd-kit; ignore its x (prevent horizontal drift) ---
  const swipeMax = -150; // limit swipe distance on mobile
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
    if (dx < -10) isSwiping.current = true; // start swiping only when leftward movement
    if (isSwiping.current) {
      // clamp to negative range up to swipeMax
      const clamped = Math.max(Math.min(dx, 0), swipeMax);
      setSwipeX(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (isDesktop) return;
    if (swipeX <= -100) {
      // threshold reached — remove
      // you can add an exit animation before removal if you want
      removeFromQueue(song._id);
    } else {
      setSwipeX(0);
    }
    startX.current = null;
    isSwiping.current = false;
  };

  // get vertical translation safely
  const dy = typeof transform?.y === "number" ? transform!.y : 0;
  const dx = swipeX; // only allow horizontal movement for swipe gestures (mobile)
  const transformStr = `translate3d(${dx}px, ${dy}px, 0)`;
  const style = {
    transform: transformStr,
    transition: transition || "transform 200ms cubic-bezier(0.25,1,0.5,1)",
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 50 : 1,
  } as const;

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between p-3 rounded-md bg-zinc-800/40 ${
        currentSong?._id === song._id ? "bg-zinc-800" : "hover:bg-zinc-700/40"
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        // don't trigger play if the user was swiping
        if (!isSwiping.current && Math.abs(swipeX) < 10) {
          playSong(song);
        }
      }}
    >
      <div className="flex items-center gap-4">
        <img
          src={song.imageUrl}
          alt={song.title}
          className="w-12 h-12 rounded object-cover pointer-events-none select-none"
        />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-medium truncate">{song.title}</span>
          <span className="text-sm text-zinc-400 truncate">{song.artist}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <div
          ref={(el) => {
            setActivatorNodeRef(el as any);
          }}
          {...listeners}
          {...attributes}
          className="p-1 cursor-grab text-zinc-400 hover:text-white"
          onClick={(e) => e.stopPropagation()}
          style={{ touchAction: "none" }}
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {isDesktop && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFromQueue(song._id);
            }}
            className="text-zinc-400 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
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

  const [items, setItems] = useState<string[]>(() =>
    nextSongs.map((s) => s._id)
  );

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
    <div className="p-4 text-white h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Queue</h2>

      {queue.length === 0 ? (
        <p className="text-zinc-400">Your queue is empty.</p>
      ) : (
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm text-zinc-400 mb-2">Up Next</h3>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]} // <-- enforce vertical-only movement
              >
                <SortableContext
                  items={items}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-2">
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

            {suggestions.length > 0 && (
              <div>
                <h3 className="text-sm text-zinc-400 mb-2">
                  Suggestions for you
                </h3>
                <ul className="space-y-2">
                  {suggestions.map((song) => (
                    <li
                      key={song._id}
                      className="group p-2 rounded hover:bg-zinc-800 cursor-pointer flex items-center gap-4"
                      onClick={() => addSongToQueue(song)}
                    >
                      <img
                        src={song.imageUrl}
                        alt={song.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex flex-col max-w-[160px]">
                        <span className="font-medium truncate">
                          {song.title}
                        </span>
                        <span className="text-sm text-zinc-400 truncate">
                          {song.artist}
                        </span>
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
