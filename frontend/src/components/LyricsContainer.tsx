// src/components/LyricsContainer.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLyricsStore } from "@/stores/useLyricsStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import LyricsView from "@/components/LyricsView";
import { LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";

interface LyricsContainerProps {
  variant: "desktop" | "mobile";
  dominantColor?: string;
  onTapLyricsArea?: () => void;
  className?: string;
}

// ─── Loading Skeleton ───
const LyricsLoadingSkeleton = () => {
  const lineWidths = [45, 72, 60, 80, 55, 68, 50, 75, 42, 65, 58, 70];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-4">
      {lineWidths.map((width, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
          className="relative overflow-hidden rounded-full"
          style={{ width: `${width}%`, maxWidth: "320px" }}
        >
          <div className="h-4 rounded-full bg-white/[0.06]" />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.08,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};

// ─── No Lyrics Fallback (Spotify-style) ───
const NoLyricsView = ({ variant }: { variant: "desktop" | "mobile" }) => {
  const lines = [
    { text: "♪", style: "symbol" },
    { text: "", style: "gap" },
    { text: "Lyrics aren't available", style: "heading" },
    { text: "for this song", style: "subheading" },
    { text: "", style: "gap" },
    { text: "Enjoy the music", style: "body" },
    { text: "and feel the rhythm", style: "body" },
    { text: "", style: "gap" },
    { text: "♪  ♪  ♪", style: "symbol" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      {lines.map((line, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.15 + i * 0.08,
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className={cn(
            "text-center leading-relaxed select-none",
            line.style === "symbol" && "text-3xl text-white/10 my-2",
            line.style === "heading" &&
              cn(
                "font-bold text-white/40 mt-1",
                variant === "mobile" ? "text-xl" : "text-2xl"
              ),
            line.style === "subheading" &&
              cn(
                "text-white/25 mb-1",
                variant === "mobile" ? "text-base" : "text-lg"
              ),
            line.style === "gap" && "h-3",
            line.style === "body" &&
              cn(
                "text-white/15",
                variant === "mobile" ? "text-sm" : "text-base"
              )
          )}
        >
          {line.text}
        </motion.p>
      ))}
    </div>
  );
};

// ─── Unsynced Lyrics View ───
const UnsyncedLyricsView = ({ variant }: { variant: "desktop" | "mobile" }) => {
  const { unsyncedLyrics, plainLyrics } = useLyricsStore();
  const text = unsyncedLyrics || plainLyrics;

  if (!text) return <NoLyricsView variant={variant} />;

  const lines = text.split("\n");

  return (
    <div
      className={cn(
        "h-full overflow-y-auto overscroll-contain scroll-smooth",
        variant === "mobile" ? "px-6 pt-6 pb-36" : "px-8 pt-20 pb-28"
      )}
    >
      <div className="flex flex-col items-center gap-2">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-4" />;
          return (
            <motion.p
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.5), duration: 0.3 }}
              className={cn(
                "text-center leading-relaxed max-w-lg",
                variant === "mobile"
                  ? "text-[17px] font-semibold text-white/60"
                  : "text-xl font-bold text-white/50"
              )}
            >
              {trimmed}
            </motion.p>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Container ───
const LyricsContainer = ({
  variant,
  onTapLyricsArea,
  className,
}: LyricsContainerProps) => {
  const { isLoading, hasLyrics, syncedLyrics, showUnsyncedMode } =
    useLyricsStore();
  const { currentSong } = usePlayerStore();

  const [showSyncButton, setShowSyncButton] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUserScroll = useCallback(() => {
    if (syncedLyrics && syncedLyrics.length > 0 && !showUnsyncedMode) {
      setShowSyncButton(true);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        setShowSyncButton(false);
      }, 6000);
    }
  }, [syncedLyrics, showUnsyncedMode]);

  useEffect(() => {
    const handler = () => setShowSyncButton(false);
    window.addEventListener("lyrics-auto-scrolled", handler);
    return () => window.removeEventListener("lyrics-auto-scrolled", handler);
  }, []);

  useEffect(() => {
    setShowSyncButton(false);
  }, [currentSong?._id]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    onTapLyricsArea?.();
  }, [onTapLyricsArea]);

  return (
    <div className={cn("relative flex-1 flex flex-col min-h-0 overflow-hidden", className)}>
      {/* Content — flex-1 + min-h-0 ensures proper height constraint for scrolling */}
      <div className="flex-1 min-h-0" onClick={variant === "mobile" ? handleClick : undefined}>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <LyricsLoadingSkeleton />
            </motion.div>
          ) : !hasLyrics ? (
            <motion.div
              key="no-lyrics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <NoLyricsView variant={variant} />
            </motion.div>
          ) : showUnsyncedMode ? (
            <motion.div
              key="unsynced"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <UnsyncedLyricsView variant={variant} />
            </motion.div>
          ) : (
            <motion.div
              key="synced"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <LyricsView variant={variant} onUserScroll={handleUserScroll} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sync button */}
      <AnimatePresence>
        {showSyncButton && !showUnsyncedMode && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowSyncButton(false);
              window.dispatchEvent(new CustomEvent("lyrics-sync-to-current"));
            }}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 z-20",
              "px-4 py-2 rounded-full bg-white/15 backdrop-blur-md",
              "border border-white/10 shadow-xl",
              "flex items-center gap-2 text-white/90",
              "transition-colors",
              variant === "mobile"
                ? "bottom-4 active:bg-white/25"
                : "bottom-6 hover:bg-white/25"
            )}
          >
            <LocateFixed className="w-4 h-4" />
            <span className="text-sm font-medium">Sync</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LyricsContainer;