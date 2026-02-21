// src/components/LyricsOptionsMenu.tsx
import { motion, AnimatePresence } from "framer-motion";
import { useLyricsStore } from "@/stores/useLyricsStore";
import { AlignLeft, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { usePlayerStore } from "@/stores/usePlayerStore";

interface LyricsOptionsButtonProps {
  variant: "desktop" | "mobile";
  className?: string;
}

const LyricsOptionsMenu = ({ variant, className }: LyricsOptionsButtonProps) => {
  const {
    syncedLyrics,
    showUnsyncedMode,
    setShowUnsyncedMode,
    isFetchingUnsynced,
  } = useLyricsStore();

  const { currentSong } = usePlayerStore();
  const [showMenu, setShowMenu] = useState(false);
  const hasSynced = !!(syncedLyrics && syncedLyrics.length > 0);

  // Close when song changes
  useEffect(() => {
    setShowMenu(false);
  }, [currentSong?._id]);


  return (
    <div className={cn("relative", className)}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(prev => !prev);
        }}
        className={cn(
          "p-2 rounded-full transition-colors",
          variant === "mobile"
            ? "text-white/50 active:bg-white/10 h-10 w-10 flex items-center justify-center"
            : "text-white/40 hover:text-white/70 hover:bg-white/10"
        )}
      >
        <MoreVertical className="w-5 h-5" />
      </button>  
  
    <AnimatePresence>
        {showMenu && (
        <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300]"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />

            {/* Menu */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
                y: variant === "mobile" ? 4 : -4,
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute z-[310] bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden w-52",
                variant === "mobile"
                  ? "right-0 top-full mt-1"
                  : "right-0 top-full mt-1"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-1.5">
              <button
                onClick={() => {
                    if (!hasSynced && !showUnsyncedMode) return;

                    setShowUnsyncedMode(!showUnsyncedMode);
                    setShowMenu(false);
                }}
                disabled={isFetchingUnsynced || (!hasSynced && !showUnsyncedMode)}
                className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px]",
                    hasSynced || showUnsyncedMode
                    ? "text-zinc-300 hover:bg-white/8"
                    : "text-zinc-500",
                    "disabled:opacity-50"
                )}
                >
                <AlignLeft className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>
                    {!hasSynced
                        ? "No synced lyrics"
                        : showUnsyncedMode
                        ? "Switch to synced"
                        : "Switch to unsynced"}
                    </span>
                </button>
            </div>
            </motion.div>
        </>
        )}
    </AnimatePresence>
    </div>
);
};

export default LyricsOptionsMenu;