// src/components/LyricsView.tsx
import { useEffect, useRef, useCallback } from "react";
import { useLyricsStore } from "@/stores/useLyricsStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { MicVocal } from "lucide-react";
import { cn } from "@/lib/utils";

interface LyricsViewProps {
  variant: "mobile" | "desktop";
  className?: string;
  onUserScroll?: () => void;
}

const LyricsView = ({ variant, className, onUserScroll }: LyricsViewProps) => {
  const {
    syncedLyrics,
    plainLyrics,
    hasLyrics,
    currentLineIndex,
    setCurrentLineIndex,
  } = useLyricsStore();

  const { currentTime, setCurrentTime } = usePlayerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const userScrolling = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoScrollTime = useRef(0);
  const isAutoScrolling = useRef(false);

  const isMobile = variant === "mobile";

  // Find current line
  useEffect(() => {
    if (!syncedLyrics || syncedLyrics.length === 0) return;

    let newIndex = -1;
    for (let i = syncedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= syncedLyrics[i].time - 0.3) {
        newIndex = i;
        break;
      }
    }

    if (newIndex !== currentLineIndex) {
      setCurrentLineIndex(newIndex);
    }
  }, [currentTime, syncedLyrics, currentLineIndex, setCurrentLineIndex]);

  // Auto-scroll to current line — use scrollIntoView for reliability
  const scrollToLine = useCallback((lineIndex: number) => {
    const lineEl = lineRefs.current.get(lineIndex);
    const container = containerRef.current;

    if (lineEl && container) {
      isAutoScrolling.current = true;
      
      const containerRect = container.getBoundingClientRect();
      const lineRect = lineEl.getBoundingClientRect();
      
      // Calculate where we need to scroll so the line is centered
      const lineOffsetInContainer = lineRect.top - containerRect.top + container.scrollTop;
      const targetScroll = lineOffsetInContainer - containerRect.height / 2 + lineRect.height / 2;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });

      // Clear auto-scrolling flag after animation completes
      setTimeout(() => {
        isAutoScrolling.current = false;
      }, 600);
    }
  }, []);

  useEffect(() => {
    if (currentLineIndex < 0 || !syncedLyrics || userScrolling.current)
      return;

    const now = Date.now();
    if (now - lastAutoScrollTime.current < 200) return;
    lastAutoScrollTime.current = now;

    scrollToLine(currentLineIndex);

    // Tell parent that auto-scroll happened (hide sync button)
    window.dispatchEvent(new CustomEvent("lyrics-auto-scrolled"));
  }, [currentLineIndex, syncedLyrics, scrollToLine]);

  // Listen for sync-to-current event
  useEffect(() => {
    const handleSync = () => {
      userScrolling.current = false;
      if (currentLineIndex >= 0) {
        scrollToLine(currentLineIndex);
      }
    };

    window.addEventListener("lyrics-sync-to-current", handleSync);
    return () =>
      window.removeEventListener("lyrics-sync-to-current", handleSync);
  }, [currentLineIndex, scrollToLine]);

  // Detect user manual scroll — ignore auto-scroll events
  const handleScroll = useCallback(() => {
    // If this scroll was triggered by auto-scroll, ignore it
    if (isAutoScrolling.current) return;
    
    userScrolling.current = true;

    // Check if current line is visible
    const container = containerRef.current;
    const currentLine = lineRefs.current.get(currentLineIndex);

    if (container && currentLine) {
      const containerRect = container.getBoundingClientRect();
      const lineRect = currentLine.getBoundingClientRect();

      const isVisible =
        lineRect.top >= containerRect.top - 50 &&
        lineRect.bottom <= containerRect.bottom + 50;

      // Only show sync button if current line is NOT visible
      if (!isVisible) {
        onUserScroll?.();
      }
    }

    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      userScrolling.current = false;
    }, 3000); // Reduced from 5s to 3s for snappier re-sync
  }, [onUserScroll, currentLineIndex]);

  // Reset scroll state on song change
  useEffect(() => {
    userScrolling.current = false;
    isAutoScrolling.current = false;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
  }, [syncedLyrics]);

  useEffect(() => {
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  const handleLineTap = useCallback(
    (time: number) => {
      setCurrentTime(time);
      const audio = document.querySelector(
        "audio"
      ) as HTMLAudioElement | null;
      if (audio) audio.currentTime = time;
      userScrolling.current = false;
    },
    [setCurrentTime]
  );

  const setLineRef = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      if (el) lineRefs.current.set(index, el);
      else lineRefs.current.delete(index);
    },
    []
  );

  // No lyrics — return null
  if (!hasLyrics) return null;

  // Synced lyrics
  if (syncedLyrics && syncedLyrics.length > 0) {
    return (
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={cn(
          "overflow-y-auto overscroll-contain",
          "h-full",
          className
        )}
        style={{
          WebkitOverflowScrolling: "touch",
          maskImage: isMobile
            ? "linear-gradient(to bottom, transparent 0%, black 8%, black 85%, transparent 100%)"
            : "linear-gradient(to bottom, transparent 0%, black 6%, black 88%, transparent 100%)",
          WebkitMaskImage: isMobile
            ? "linear-gradient(to bottom, transparent 0%, black 8%, black 85%, transparent 100%)"
            : "linear-gradient(to bottom, transparent 0%, black 6%, black 88%, transparent 100%)",
        }}
      >
        {/* Top spacer — enough to push first line to center */}
        <div className={isMobile ? "h-[30vh]" : "h-[40vh]"} />

        <div className={cn(
          "space-y-0.5",
          isMobile ? "px-6" : "px-8 lg:px-12 max-w-3xl mx-auto"
        )}>
          {syncedLyrics.map((line, index) => {
            const isActive = index === currentLineIndex;
            const isPast = index < currentLineIndex;

            return (
              <div
                key={index}
                ref={(el) => setLineRef(index, el)}
                onClick={() => handleLineTap(line.time)}
                className={cn(
                  "cursor-pointer rounded-lg transition-all duration-300 ease-out",
                  isMobile
                    ? "py-2.5"
                    : "py-2 px-3 hover:bg-white/5 rounded-xl"
                )}
              >
                <p
                  className={cn(
                    "transition-all duration-500 ease-out leading-[1.4]",
                    isMobile
                      ? "text-[21px] font-bold"
                      : "text-[28px] lg:text-[32px] font-bold",
                    isActive && "text-white",
                    isPast && "text-white/20",
                    !isActive && !isPast && "text-white/25"
                  )}
                >
                  {line.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom spacer — enough to scroll last line to center */}
        <div className={isMobile ? "h-[45vh]" : "h-[55vh]"} />
      </div>
    );
  }

  // Plain lyrics
  if (plainLyrics) {
    const lines = plainLyrics.split("\n");

    return (
      <div
        ref={containerRef}
        className={cn(
          "overflow-y-auto overscroll-contain",
          "h-full",
          className
        )}
        style={{
          WebkitOverflowScrolling: "touch",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 5%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 5%, black 92%, transparent 100%)",
        }}
      >
        <div className={isMobile ? "h-[15vh]" : "h-[80px]"} />

        <div
          className={cn(
            "flex items-center gap-2 mb-4",
            isMobile ? "px-6" : "px-8 lg:px-12 max-w-3xl mx-auto"
          )}
        >
          <div className="px-2.5 py-1 rounded-full bg-white/10 flex items-center gap-1.5">
            <MicVocal className="w-3 h-3 text-white/50" />
            <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">
              Lyrics
            </span>
          </div>
        </div>

        <div className={cn(
          "space-y-0.5",
          isMobile ? "px-6" : "px-8 lg:px-12 max-w-3xl mx-auto"
        )}>
          {lines.map((line, index) => (
            <p
              key={index}
              className={cn(
                "leading-[1.5]",
                isMobile
                  ? "text-[17px] font-medium text-white/50"
                  : "text-xl font-medium text-white/50",
                line.trim() === "" && "h-4"
              )}
            >
              {line || "\u00A0"}
            </p>
          ))}
        </div>

        <div className={isMobile ? "h-[25vh]" : "h-[120px]"} />
      </div>
    );
  }

  return null;
};

export default LyricsView;