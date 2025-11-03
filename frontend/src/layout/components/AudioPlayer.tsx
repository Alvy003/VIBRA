import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/usePlayerStore";

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const {
    currentSong,
    isPlaying,
    playNext,
    playPrevious,
    setDuration,
    setCurrentTime,
    setIsPlaying,
    volume,
  } = usePlayerStore();

  // Helpers
  const hasMS = typeof navigator !== "undefined" && "mediaSession" in navigator;
  const canSetPos =
    hasMS &&
    (navigator.mediaSession as any) &&
    typeof (navigator.mediaSession as any).setPositionState === "function";

  const resetMSPosition = () => {
    if (!canSetPos) return;
    try {
      (navigator.mediaSession as any).setPositionState({
        duration: 0,
        position: 0,
        playbackRate: 1,
      });
      // Optional: temporarily mark paused so notification UI doesn't show stale progress
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

  // load new song + setup media session (supports audioBlob)
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    const audio = audioRef.current;

    // Revoke previous blob URL if any
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    // Immediately reset Media Session position for new track to avoid showing "end"
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
      // Reset first to clear any cached media pipeline
      audio.pause();
      audio.currentTime = 0;
      audio.src = newSrc;
      try {
        audio.load(); // ensure the browser commits to the new source
      } catch {}
    }

    // Media Session metadata
    if (hasMS && currentSong) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title,
          artist: (currentSong as any).artist,
          artwork: currentSong.imageUrl
            ? [{ src: currentSong.imageUrl, sizes: "512x512", type: "image/png" }]
            : [],
        });

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
        // Optional: hook seekto if you want OS seek from notification
        navigator.mediaSession.setActionHandler?.("seekto", (e: any) => {
          if (typeof e.seekTime === "number") {
            audio.currentTime = Math.max(0, Math.min(e.seekTime, audio.duration || e.seekTime));
            setMSPositionFromAudio(audio);
          }
        });
      } catch {
        // ignore
      }
    }

    // Auto-play if requested
    if (isPlaying) audio.play().catch(() => {});

    // Cleanup blob URL on unmount / track change
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [currentSong, isPlaying, playNext, playPrevious, setIsPlaying]);

  // Keyboard shortcuts (unchanged)
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, setIsPlaying, playPrevious, playNext]);

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
    // Also keep position state aligned after toggles
    setMSPositionFromAudio(audio);
  }, [isPlaying]);

  // attach listeners once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Throttle position updates to ~4/s to avoid spamming MS
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
      // New source is starting: zero everything in MS to avoid stale end
      resetMSPosition();
    };

    const handleDuration = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(dur);
      // Update MS once duration is known (position likely still 0)
      setMSPositionFromAudio(audio);
    };

    const handleSeeked = () => {
      setMSPositionFromAudio(audio);
    };

    const handleEnded = () => {
      // At end, make sure MS shows end-of-track before we move on
      setMSPositionFromAudio(audio);
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

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("loadedmetadata", handleDuration);
    audio.addEventListener("seeked", handleSeeked);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    // Some browsers emit 'emptied' when source is cleared; reset MS as well
    audio.addEventListener("emptied", resetMSPosition as any);

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("loadedmetadata", handleDuration);
      audio.removeEventListener("seeked", handleSeeked);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("emptied", resetMSPosition as any);
    };
  }, [playNext, setDuration, setCurrentTime, setIsPlaying]);

  return <audio ref={audioRef} preload="auto" />;
};

export default AudioPlayer;