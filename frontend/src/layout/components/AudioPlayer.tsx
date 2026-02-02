// AudioPlayer.tsx - Enhanced with background playback support
import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { shouldStopAfterCurrentSong, clearStopAfterCurrentSong } from "@/components/SleepTimer";

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const {
    currentSong,
    isPlaying,
    playNext,
    playPrevious,
    setDuration,
    setCurrentTime,
    setIsPlaying,
    volume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayerStore();

  // Helpers
  const hasMS = typeof navigator !== "undefined" && "mediaSession" in navigator;
  const canSetPos =
    hasMS &&
    (navigator.mediaSession as any) &&
    typeof (navigator.mediaSession as any).setPositionState === "function";

  // Wake Lock API - prevents screen from sleeping and helps keep audio alive
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && isPlaying) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          // console.log('Wake Lock released');
        });
      } catch (err) {
        // console.log('Wake Lock error:', err);
      }
    }
  }, [isPlaying]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  // Request/release wake lock based on play state
  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => releaseWakeLock();
  }, [isPlaying, requestWakeLock, releaseWakeLock]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, requestWakeLock]);

  // Handle page visibility - keep audio playing when backgrounded
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleVisibilityChange = () => {
      // When coming back to foreground, ensure audio state matches our state
      if (document.visibilityState === 'visible') {
        if (isPlaying && audio.paused) {
          audio.play().catch(() => {});
        }
      }
    };

    // Prevent audio from being suspended on iOS
    const handlePageHide = (e: PageTransitionEvent) => {
      if (e.persisted && isPlaying) {
        // Page is being cached (bfcache), try to keep audio alive
        setTimeout(() => {
          if (audio.paused && isPlaying) {
            audio.play().catch(() => {});
          }
        }, 0);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isPlaying]);

  // iOS Safari workaround - keep audio context alive
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Create a silent audio context to keep audio session alive on iOS
    let silentInterval: NodeJS.Timeout | null = null;

    const keepAlive = () => {
      if (isPlaying && audio.paused) {
        audio.play().catch(() => {});
      }
    };

    if (isPlaying) {
      // Check every 5 seconds if audio should still be playing
      silentInterval = setInterval(keepAlive, 5000);
    }

    return () => {
      if (silentInterval) clearInterval(silentInterval);
    };
  }, [isPlaying]);

  const resetMSPosition = () => {
    if (!canSetPos) return;
    try {
      (navigator.mediaSession as any).setPositionState({
        duration: 0,
        position: 0,
        playbackRate: 1,
      });
      navigator.mediaSession.playbackState = "paused";
    } catch {
      // ignore
    }
  };

  const setMSPositionFromAudio = (audio: HTMLAudioElement) => {
    if (!canSetPos) return;
    const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
    const pos = Math.min(Math.max(0, audio.currentTime || 0), dur || 0);
    try {
      (navigator.mediaSession as any).setPositionState({
        duration: dur,
        position: pos,
        playbackRate: audio.playbackRate || 1,
      });
    } catch {
      // ignore
    }
  };

  // keep volume in sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // load new song + setup media session
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    const audio = audioRef.current;

    // Revoke previous blob URL if any
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    resetMSPosition();

    // Pick source
    let newSrc: string | null = null;
    if ((currentSong as any).audioBlob instanceof Blob) {
      const blobUrl = URL.createObjectURL((currentSong as any).audioBlob as Blob);
      blobUrlRef.current = blobUrl;
      newSrc = blobUrl;
    } else if ((currentSong as any).audioUrl) {
      newSrc = (currentSong as any).audioUrl as string;
    }

    // Swap src
    if (newSrc && audio.src !== newSrc) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = newSrc;
      try {
        audio.load();
      } catch {}
    }

    // Media Session metadata + actions
    if (hasMS && currentSong) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title,
          artist: (currentSong as any).artist,
          album: (currentSong as any).album || '',
          artwork: currentSong.imageUrl
            ? [
                { src: currentSong.imageUrl, sizes: "96x96", type: "image/png" },
                { src: currentSong.imageUrl, sizes: "128x128", type: "image/png" },
                { src: currentSong.imageUrl, sizes: "192x192", type: "image/png" },
                { src: currentSong.imageUrl, sizes: "256x256", type: "image/png" },
                { src: currentSong.imageUrl, sizes: "384x384", type: "image/png" },
                { src: currentSong.imageUrl, sizes: "512x512", type: "image/png" },
              ]
            : [],
        });

        // Standard actions
        navigator.mediaSession.setActionHandler?.("play", () => {
          audio.play().catch(() => {});
          setIsPlaying(true);
          navigator.mediaSession.playbackState = "playing";
          setMSPositionFromAudio(audio);
        });

        navigator.mediaSession.setActionHandler?.("pause", () => {
          audio.pause();
          setIsPlaying(false);
          navigator.mediaSession.playbackState = "paused";
          setMSPositionFromAudio(audio);
        });

        navigator.mediaSession.setActionHandler?.("previoustrack", () => playPrevious());
        navigator.mediaSession.setActionHandler?.("nexttrack", () => playNext());

        navigator.mediaSession.setActionHandler?.("seekto", (e: any) => {
          if (typeof e.seekTime === "number") {
            audio.currentTime = Math.max(0, Math.min(e.seekTime, audio.duration || e.seekTime));
            setMSPositionFromAudio(audio);
          }
        });

        navigator.mediaSession.setActionHandler?.("seekbackward", (e: any) => {
          const skipTime = e.seekOffset || 10;
          audio.currentTime = Math.max(0, audio.currentTime - skipTime);
          setMSPositionFromAudio(audio);
        });

        navigator.mediaSession.setActionHandler?.("seekforward", (e: any) => {
          const skipTime = e.seekOffset || 10;
          audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + skipTime);
          setMSPositionFromAudio(audio);
        });

        // Stop handler
        navigator.mediaSession.setActionHandler?.("stop", () => {
          audio.pause();
          audio.currentTime = 0;
          setIsPlaying(false);
          navigator.mediaSession.playbackState = "none";
        });
      } catch {
        // ignore
      }
    }

    if (isPlaying) audio.play().catch(() => {});

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [currentSong, isPlaying, playNext, playPrevious, setIsPlaying]);

  // Enhanced keyboard shortcuts with shuffle/repeat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      if (isInput) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }

      if (e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        playPrevious();
      }

      if (e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        playNext();
      }

      if (e.key.toLowerCase() === "s" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleShuffle();
      }

      if (e.key.toLowerCase() === "r" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleRepeat();
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = Math.max(0, audio.currentTime - 5);
        }
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
        }
      }

      if (e.key.toLowerCase() === "m" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const audio = audioRef.current;
        if (audio) {
          audio.muted = !audio.muted;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, setIsPlaying, playPrevious, playNext, toggleShuffle, toggleRepeat]);

  // keep play/pause in sync + playbackState
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => {});
      if (hasMS) navigator.mediaSession.playbackState = "playing";
    } else {
      audio.pause();
      if (hasMS) navigator.mediaSession.playbackState = "paused";
    }
    setMSPositionFromAudio(audio);
  }, [isPlaying]);

  // attach listeners once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let lastPosUpdate = 0;
    const THROTTLE_MS = 250;

    const handleTime = () => {
      setCurrentTime(audio.currentTime);
      const now = performance.now();
      if (now - lastPosUpdate > THROTTLE_MS) {
        setMSPositionFromAudio(audio);
        lastPosUpdate = now;
      }
    };

    const handleLoadStart = () => {
      resetMSPosition();
    };

    const handleDuration = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(dur);
      setMSPositionFromAudio(audio);
    };

    const handleSeeked = () => {
      setMSPositionFromAudio(audio);
    };

    const handleEnded = () => {
      setMSPositionFromAudio(audio);
      
      if (shouldStopAfterCurrentSong()) {
        setIsPlaying(false);
        clearStopAfterCurrentSong();
        return;
      }
      
      playNext();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (hasMS) navigator.mediaSession.playbackState = "playing";
      setMSPositionFromAudio(audio);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (hasMS) navigator.mediaSession.playbackState = "paused";
      setMSPositionFromAudio(audio);
    };

    // Handle audio interruptions (phone calls, etc.)
    const handleInterruption = () => {
      // Audio was interrupted, update our state
      if (audio.paused && isPlaying) {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("loadedmetadata", handleDuration);
    audio.addEventListener("seeked", handleSeeked);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("emptied", resetMSPosition as any);
    audio.addEventListener("suspend", handleInterruption);
    audio.addEventListener("stalled", handleInterruption);

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("loadedmetadata", handleDuration);
      audio.removeEventListener("seeked", handleSeeked);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("emptied", resetMSPosition as any);
      audio.removeEventListener("suspend", handleInterruption);
      audio.removeEventListener("stalled", handleInterruption);
    };
  }, [playNext, setDuration, setCurrentTime, setIsPlaying, isPlaying]);

  return (
    <audio 
      ref={audioRef} 
      preload="auto"
      // These attributes help with background playback
      playsInline
      webkit-playsinline="true"
    />
  );
};

export default AudioPlayer;