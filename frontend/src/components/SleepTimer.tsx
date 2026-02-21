// src/components/SleepTimer.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Timer, X, Moon, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import BottomSheet from "@/components/ui/BottomSheet";

const TIMER_OPTIONS = [
  { label: "5 min", fullLabel: "5 minutes", value: 5 },
  { label: "15 min", fullLabel: "15 minutes", value: 15 },
  { label: "30 min", fullLabel: "30 minutes", value: 30 },
  { label: "45 min", fullLabel: "45 minutes", value: 45 },
  { label: "1 hour", fullLabel: "1 hour", value: 60 },
  { label: "2 hours", fullLabel: "2 hours", value: 120 },
];

interface SleepTimerState {
  activeSeconds: number | null;
  remainingSeconds: number | null;
  activeMode: "timer" | "endOfSong" | null;
  timeoutId: number | null;
  intervalId: number | null;
}

const globalTimerState: SleepTimerState = {
  activeSeconds: null,
  remainingSeconds: null,
  activeMode: null,
  timeoutId: null,
  intervalId: null,
};

const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback());
};

const clearGlobalTimer = () => {
  if (globalTimerState.timeoutId) {
    window.clearTimeout(globalTimerState.timeoutId);
    globalTimerState.timeoutId = null;
  }
  if (globalTimerState.intervalId) {
    window.clearInterval(globalTimerState.intervalId);
    globalTimerState.intervalId = null;
  }

  globalTimerState.activeSeconds = null;
  globalTimerState.remainingSeconds = null;
  globalTimerState.activeMode = null;

  notifySubscribers();
};

export const shouldStopAfterCurrentSong = () => globalTimerState.activeMode === "endOfSong";

export const clearStopAfterCurrentSong = () => {
  if (globalTimerState.activeMode === "endOfSong") {
    clearGlobalTimer();
  }
};

interface SleepTimerProps {
  externalOpen?: boolean;
  onExternalClose?: () => void;
  hideTrigger?: boolean;
}

const SleepTimer = ({ externalOpen, onExternalClose, hideTrigger }: SleepTimerProps = {}) => {
  const { setIsPlaying } = usePlayerStore();
  const isTouch = useIsTouchDevice();
  const [internalOpen, setInternalOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [localState, setLocalState] = useState({
    activeMode: globalTimerState.activeMode,
    remainingSeconds: globalTimerState.remainingSeconds,
    activeSeconds: globalTimerState.activeSeconds,
  });

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = useCallback((val: boolean) => {
    if (externalOpen !== undefined) {
      if (!val && onExternalClose) onExternalClose();
    } else {
      setInternalOpen(val);
    }
  }, [externalOpen, onExternalClose]);
  
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      setLocalState({
        activeMode: globalTimerState.activeMode,
        remainingSeconds: globalTimerState.remainingSeconds,
        activeSeconds: globalTimerState.activeSeconds,
      });
    };
    subscribers.add(update);
    return () => {
      subscribers.delete(update);
    };
  }, []);

  useEffect(() => {
    if (isOpen && globalTimerState.activeMode === "timer" && globalTimerState.remainingSeconds !== null) {
      intervalRef.current = window.setInterval(() => {
        setLocalState({
          activeMode: globalTimerState.activeMode,
          remainingSeconds: globalTimerState.remainingSeconds,
          activeSeconds: globalTimerState.activeSeconds,
        });
      }, 1000);

      return () => {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isOpen]);

  const calculatePosition = useCallback(() => {
    const trigger = document.querySelector('[data-sleep-timer-trigger]') as HTMLButtonElement;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popoverWidth = 300;
    const popoverHeight = 380;
    const padding = 16;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left: number;
    const centeredLeft = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;

    if (centeredLeft < padding) {
      left = padding;
    } else if (centeredLeft + popoverWidth > viewportWidth - padding) {
      left = viewportWidth - popoverWidth - padding;
    } else {
      left = centeredLeft;
    }

    let top: number;
    const aboveTop = triggerRect.top - popoverHeight - 12;
    const belowTop = triggerRect.bottom + 12;

    if (aboveTop >= padding) {
      top = aboveTop;
    } else if (belowTop + popoverHeight <= viewportHeight - padding) {
      top = belowTop;
    } else {
      top = Math.max(padding, (viewportHeight - popoverHeight) / 2);
    }

    setPopoverPosition({ top, left });
  }, []);

  useEffect(() => {
    if (isOpen && !isTouch) {
      calculatePosition();

      const handleResize = () => calculatePosition();
      const handleScroll = () => calculatePosition();

      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleScroll, true);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll, true);
      };
    }
  }, [isOpen, calculatePosition, isTouch]);

  const clearEverything = useCallback(() => {
    clearGlobalTimer();
  }, []);

  const closeModal = useCallback(() => {
    if (externalOpen !== undefined) {
      onExternalClose?.();
    } else {
      setInternalOpen(false);
    }
  }, [externalOpen, onExternalClose]);

  const startCountdown = useCallback(
    (seconds: number) => {
      if (globalTimerState.activeMode === "timer" && globalTimerState.activeSeconds === seconds) {
        clearEverything();
        return;
      }

      clearEverything();

      globalTimerState.timeoutId = window.setTimeout(() => {
        setIsPlaying(false);
        clearEverything();
      }, seconds * 1000);

      globalTimerState.remainingSeconds = seconds;
      globalTimerState.intervalId = window.setInterval(() => {
        if (globalTimerState.remainingSeconds === null || globalTimerState.remainingSeconds <= 1) {
          if (globalTimerState.intervalId) {
            window.clearInterval(globalTimerState.intervalId);
            globalTimerState.intervalId = null;
          }
          globalTimerState.remainingSeconds = null;
        } else {
          globalTimerState.remainingSeconds -= 1;
        }
        notifySubscribers();
      }, 1000);

      globalTimerState.activeSeconds = seconds;
      globalTimerState.activeMode = "timer";

      notifySubscribers();
      closeModal();
    },
    [clearEverything, setIsPlaying, closeModal]
  );

  const toggleEndOfSong = useCallback(() => {
    if (globalTimerState.activeMode === "endOfSong") {
      clearEverything();
      return;
    }

    clearEverything();
    globalTimerState.activeMode = "endOfSong";
    notifySubscribers();
    closeModal();
  }, [clearEverything, closeModal]);

  const cancel = useCallback(() => clearEverything(), [clearEverything]);

  const isActiveTimer = (s: number) =>
    localState.activeMode === "timer" && localState.activeSeconds === s;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage =
    localState.activeSeconds && localState.remainingSeconds
      ? (localState.remainingSeconds / localState.activeSeconds) * 100
      : 0;

  const { activeMode, remainingSeconds, activeSeconds } = localState;

  return (
    <>
      {!hideTrigger && (
        <Button
          data-sleep-timer-trigger
          size="icon"
          variant="ghost"
          className={cn(
            "transition-colors",
            activeMode
              ? "text-violet-400 hover:text-violet-300"
              : "text-white/80 md:text-zinc-400 hover:text-white"
          )}
          onClick={() => setIsOpen(true)}
          aria-label="Sleep timer"
        >
          <Timer className="h-5 w-5" />
        </Button>
      )}

      <AnimatePresence>
        {isOpen && !isTouch && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-[90]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              key="sleep-timer-desktop"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[99] w-[300px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden"
              style={{
                top: popoverPosition.top,
                left: popoverPosition.left,
              }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                    <Moon className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Sleep Timer</h2>
                    <p className="text-xs text-zinc-500">
                      {activeMode === "endOfSong"
                        ? "Stopping after this song"
                        : remainingSeconds
                        ? `${formatTime(remainingSeconds)} remaining`
                        : "Stop playback after"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full hover:bg-zinc-800 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>

              <div className="p-3 space-y-3">
                <button
                  onClick={toggleEndOfSong}
                  className={cn(
                    "w-full p-3 rounded-lg flex items-center gap-3 transition-colors",
                    activeMode === "endOfSong"
                      ? "bg-violet-500/15 border border-violet-500/40"
                      : "bg-zinc-800/50 border border-transparent hover:bg-zinc-800"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    activeMode === "endOfSong" ? "bg-violet-500 text-white" : "bg-zinc-700 text-zinc-400"
                  )}>
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-sm font-medium text-white">End of song</span>
                    <span className="text-xs text-zinc-500 block">Stop after current track</span>
                  </div>
                  {activeMode === "endOfSong" && (
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                  )}
                </button>

                <div>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2 px-1">
                    Timer
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TIMER_OPTIONS.map(({ label, value }) => {
                      const isActive = isActiveTimer(value * 60);
                      return (
                        <button
                          key={value}
                          onClick={() => startCountdown(value * 60)}
                          className={cn(
                            "relative h-10 rounded-lg text-sm font-medium transition-colors overflow-hidden",
                            isActive
                              ? "bg-violet-500 text-white"
                              : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                          )}
                        >
                          {isActive && remainingSeconds && activeSeconds && (
                            <div
                              className="absolute inset-y-0 right-0 bg-violet-600"
                              style={{ width: `${100 - progressPercentage}%` }}
                            />
                          )}
                          <span className="relative z-10">
                            {isActive && remainingSeconds ? formatTime(remainingSeconds) : label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeMode && (
                  <button
                    className="w-full h-9 rounded-lg border border-zinc-700 text-sm text-zinc-400 font-medium hover:bg-zinc-800 hover:text-zinc-300"
                    onClick={cancel}
                  >
                    Cancel Timer
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isTouch && (
        <BottomSheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          snapPoints={[0.55]}
          zIndex={220}
          header={
            <div className="flex items-center justify-between px-5 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="hidden md:flex w-10 h-10 rounded-xl bg-violet-500/15 items-center justify-center">
                  <Moon className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold ml-1 md:ml-0 text-white">Sleep Timer</h2>
                  <p className="text-xs ml-1 md:ml-0 text-white/50">
                    {activeMode === "endOfSong"
                      ? "Stopping after this song"
                      : remainingSeconds
                      ? `${formatTime(remainingSeconds)} remaining`
                      : "Stop playback automatically"}
                  </p>
                </div>
              </div>
            </div>
          }
        >
          <div className="p-5 space-y-4">
            <button
              onClick={toggleEndOfSong}
              className={cn(
                "w-full p-4 rounded-xl flex items-center gap-4 transition-colors",
                activeMode === "endOfSong"
                  ? "bg-violet-500/15 border border-violet-500/50"
                  : "bg-zinc-800/50 border border-transparent"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                activeMode === "endOfSong" ? "bg-violet-500 text-white" : "bg-zinc-700 text-zinc-400"
              )}>
                <Music className="w-5 h-5" />
              </div>
              <div className="text-left flex-1">
                <span className="font-medium text-white">End of song</span>
                <span className="text-sm text-white/50 block">Stop after current track</span>
              </div>
              {activeMode === "endOfSong" && (
                <div className="w-2 h-2 rounded-full bg-violet-500" />
              )}
            </button>

            <div>
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3 px-1">
                Timer Duration
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TIMER_OPTIONS.map(({ fullLabel, value }) => {
                  const isActive = isActiveTimer(value * 60);
                  return (
                    <button
                      key={value}
                      onClick={() => startCountdown(value * 60)}
                      className={cn(
                        "relative h-14 rounded-xl font-normal transition-colors overflow-hidden",
                        isActive ? "bg-violet-500 text-white" : "bg-zinc-800/50 text-zinc-300"
                      )}
                    >
                      {isActive && remainingSeconds && activeSeconds && (
                        <div
                          className="absolute inset-y-0 right-0 bg-violet-600"
                          style={{ width: `${100 - progressPercentage}%` }}
                        />
                      )}
                      <span className="relative z-10">
                        {isActive && remainingSeconds ? formatTime(remainingSeconds) : fullLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeMode && (
              <button
                className="w-full h-12 rounded-xl border border-zinc-700 text-zinc-400 font-medium active:bg-zinc-800"
                onClick={cancel}
              >
                Cancel Timer
              </button>
            )}
          </div>
        </BottomSheet>
      )}
    </>
  );
};

export const useSleepTimerActive = () => {
  const [active, setActive] = useState(globalTimerState.activeMode !== null);

  useEffect(() => {
    const update = () => setActive(globalTimerState.activeMode !== null);
    subscribers.add(update);
    return () => { subscribers.delete(update); };
  }, []);

  return active;
};

export default SleepTimer;