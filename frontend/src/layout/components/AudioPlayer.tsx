// AudioPlayer.tsx
import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { shouldStopAfterCurrentSong, clearStopAfterCurrentSong } from "@/components/SleepTimer";

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const currentSongIdRef = useRef<string | null>(null);
  const isSwitchingRef = useRef(false);
  const isFirstLoadRef = useRef(true);
  const wasPlayingBeforeOfflineRef = useRef(false);
  // Track the current switch operation to cancel stale ones
  const switchIdRef = useRef(0);

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

  const hasMS = typeof navigator !== "undefined" && "mediaSession" in navigator;
  const canSetPos =
    hasMS &&
    (navigator.mediaSession as any) &&
    typeof (navigator.mediaSession as any).setPositionState === "function";

  // Wake Lock
  const requestWakeLock = useCallback(async () => {
    if ("wakeLock" in navigator && isPlaying) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch {}
    }
  }, [isPlaying]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) requestWakeLock();
    else releaseWakeLock();
    return () => releaseWakeLock();
  }, [isPlaying, requestWakeLock, releaseWakeLock]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible" && isPlaying) requestWakeLock();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [isPlaying, requestWakeLock]);

  // Background playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isPlaying && audio.paused && !isSwitchingRef.current) {
        audio.play().catch(() => {});
      }
    };
    const handlePageHide = (e: PageTransitionEvent) => {
      if (e.persisted && isPlaying) {
        setTimeout(() => { if (audio.paused && isPlaying && !isSwitchingRef.current) audio.play().catch(() => {}); }, 0);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [isPlaying]);

  // iOS keep-alive
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (isPlaying && audio.paused && !isSwitchingRef.current) audio.play().catch(() => {});
      }, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPlaying]);

  // ========== NETWORK RECOVERY ==========
  useEffect(() => {
    const handleOffline = () => {
      if (isPlaying || !audioRef.current?.paused) {
        wasPlayingBeforeOfflineRef.current = true;
      }
    };

    const handleOnline = () => {
      if (!wasPlayingBeforeOfflineRef.current) return;
      wasPlayingBeforeOfflineRef.current = false;

      const audio = audioRef.current;
      if (!audio || !currentSong || isSwitchingRef.current) return;

      setTimeout(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (audio.paused) {
          const hasValidSrc = audio.src && audio.src !== "" && audio.src !== window.location.href;

          if (hasValidSrc && audio.readyState >= 1) {
            audio.play()
              .then(() => {
                setIsPlaying(true);
                if (hasMS) navigator.mediaSession.playbackState = "playing";
              })
              .catch(() => {
                reloadAndPlay(audio);
              });
          } else {
            reloadAndPlay(audio);
          }
        }
      }, 1500);
    };

    const reloadAndPlay = (audio: HTMLAudioElement) => {
      if (!currentSong) return;

      let src: string | null = null;
      if (currentSong.audioBlob instanceof Blob) {
        if (blobUrlRef.current) {
          src = blobUrlRef.current;
        } else {
          src = URL.createObjectURL(currentSong.audioBlob);
          blobUrlRef.current = src;
        }
      } else {
        src = getAudioSrc(currentSong);
      }

      if (!src) return;

      const savedTime = audio.currentTime || 0;
      audio.src = src;
      audio.load();

      const onCanPlay = () => {
        audio.removeEventListener("canplay", onCanPlay);
        if (savedTime > 0 && Number.isFinite(savedTime)) {
          audio.currentTime = savedTime;
        }
        audio.play()
          .then(() => {
            setIsPlaying(true);
            if (hasMS) navigator.mediaSession.playbackState = "playing";
          })
          .catch(() => {});
      };

      audio.addEventListener("canplay", onCanPlay, { once: true });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [currentSong, isPlaying, setIsPlaying]);

  // Helpers
  const resetMSPosition = () => {
    if (!canSetPos) return;
    try {
      (navigator.mediaSession as any).setPositionState({ duration: 0, position: 0, playbackRate: 1 });
      navigator.mediaSession.playbackState = "paused";
    } catch {}
  };

  const setMSPositionFromAudio = (audio: HTMLAudioElement) => {
    if (!canSetPos) return;
    const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
    const pos = Math.min(Math.max(0, audio.currentTime || 0), dur || 0);
    try {
      (navigator.mediaSession as any).setPositionState({ duration: dur, position: pos, playbackRate: audio.playbackRate || 1 });
    } catch {}
  };

  const AUDIO_PROXY_URL = import.meta.env.VITE_AUDIO_PROXY_URL || "";

  const proxyIfNeeded = (url: string): string => {
    if (!AUDIO_PROXY_URL || !url) return url;
    try {
      const parsed = new URL(url);
      const shouldProxy = [
        'saavncdn.com',
        'jiosaavn.com',
        'saavn.com',
      ].some(d => parsed.hostname.endsWith(d));
      if (shouldProxy) {
        return `${AUDIO_PROXY_URL}?url=${encodeURIComponent(url)}`;
      }
    } catch {}
    return url;
  };
  
  const getAudioSrc = (song: any): string | null => {
    if (!song) return null;
    if (song.audioBlob instanceof Blob) return null;
    const url = song.audioUrl || song.streamUrl;
    if (!url) return null;
    return proxyIfNeeded(url);
  };

  // Smooth switch with switching guard and cancellation
  const smoothSwitchAudio = async (
    audio: HTMLAudioElement,
    newSrc: string,
    shouldPlay: boolean,
    thisSwitchId: number
  ) => {
    const FADE_OUT_MS = 120;
    const FADE_IN_MS = 150;
    const steps = 10;
    const startVolume = audio.volume;

    isSwitchingRef.current = true;

    try {
      // Only fade out if currently playing something
      if (!audio.paused && audio.src) {
        for (let i = steps; i >= 0; i--) {
          // Check if this switch was cancelled by a newer one
          if (switchIdRef.current !== thisSwitchId) return;
          audio.volume = (startVolume * i) / steps;
          await new Promise((r) => setTimeout(r, FADE_OUT_MS / steps));
        }
        audio.pause();
      }

      // Check cancellation again before loading new source
      if (switchIdRef.current !== thisSwitchId) {
        isSwitchingRef.current = false;
        return;
      }

      audio.currentTime = 0;
      audio.src = newSrc;
      audio.load();

      if (shouldPlay) {
        await audio.play().catch(() => {});
      }

      // Check cancellation after play
      if (switchIdRef.current !== thisSwitchId) return;

      isSwitchingRef.current = false;

      // Fade IN
      for (let i = 0; i <= steps; i++) {
        if (switchIdRef.current !== thisSwitchId) return;
        audio.volume = (startVolume * i) / steps;
        await new Promise((r) => setTimeout(r, FADE_IN_MS / steps));
      }

      // Ensure final volume is correct
      audio.volume = startVolume;

      if (shouldPlay && hasMS) {
        navigator.mediaSession.playbackState = "playing";
        setMSPositionFromAudio(audio);
      }
    } catch (e) {
      console.warn("Smooth switch failed", e);
      if (switchIdRef.current !== thisSwitchId) return;
      isSwitchingRef.current = false;
      audio.volume = startVolume;
      audio.src = newSrc;
      audio.load();
      if (shouldPlay) audio.play().catch(() => {});
    }
  };

  // Volume sync
  useEffect(() => {
    if (audioRef.current && !isSwitchingRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // ========== RESUME AFTER APP RESTART ==========
  useEffect(() => {
    if (!isFirstLoadRef.current) return;
    if (!audioRef.current) return;
    
    // Only attempt resume if there's no current song loaded yet
    const store = usePlayerStore.getState();
    if (store.currentSong) return; // Already has a song, skip resume
    
    const { lastPlayed } = usePreferencesStore.getState();
    if (!lastPlayed?.song) return;
    
    const age = Date.now() - lastPlayed.timestamp;
    if (age > 24 * 60 * 60 * 1000) return; // Too old
    
    // Restore the song to the player without auto-playing
    usePlayerStore.setState({
      currentSong: lastPlayed.song,
      currentTime: lastPlayed.position,
      isPlaying: false,
    });
  }, []);

  // ========== LOAD NEW SONG (only when song actually changes) ==========
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    const audio = audioRef.current;

    const songId = currentSong._id || currentSong.externalId || "";
    if (songId === currentSongIdRef.current) {
      return;
    }
    currentSongIdRef.current = songId;

    // Increment switch ID to cancel any in-progress switch
    const thisSwitchId = ++switchIdRef.current;

    const shouldAutoPlay = isFirstLoadRef.current ? isPlaying : true;
    isFirstLoadRef.current = false;

    // Revoke old blob
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    resetMSPosition();

    let newSrc: string | null = null;
    if (currentSong.audioBlob instanceof Blob) {
      newSrc = URL.createObjectURL(currentSong.audioBlob);
      blobUrlRef.current = newSrc;
    } else {
      newSrc = getAudioSrc(currentSong);
    }

    if (newSrc) {
      smoothSwitchAudio(audio, newSrc, shouldAutoPlay, thisSwitchId);
    }

    // Media Session metadata
    if (hasMS) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title,
          artist: currentSong.artist,
          album: currentSong.album || "",
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
      } catch {}
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [currentSong]);

  // ========== MEDIA SESSION ACTIONS ==========
  useEffect(() => {
    if (!hasMS || !currentSong) return;
    try {
      navigator.mediaSession.setActionHandler?.("play", () => {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
        navigator.mediaSession.playbackState = "playing";
      });
      navigator.mediaSession.setActionHandler?.("pause", () => {
        audioRef.current?.pause();
        setIsPlaying(false);
        navigator.mediaSession.playbackState = "paused";
      });
      navigator.mediaSession.setActionHandler?.("previoustrack", () => {
        setIsPlaying(true);
        playPrevious();
      });
      navigator.mediaSession.setActionHandler?.("nexttrack", () => {
        setIsPlaying(true);
        playNext();
      });
      navigator.mediaSession.setActionHandler?.("seekto", (e: any) => {
        if (audioRef.current && typeof e.seekTime === "number") {
          audioRef.current.currentTime = Math.max(0, Math.min(e.seekTime, audioRef.current.duration || e.seekTime));
          setMSPositionFromAudio(audioRef.current);
        }
      });
      navigator.mediaSession.setActionHandler?.("seekbackward", (e: any) => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - (e.seekOffset || 10));
          setMSPositionFromAudio(audioRef.current);
        }
      });
      navigator.mediaSession.setActionHandler?.("seekforward", (e: any) => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + (e.seekOffset || 10));
          setMSPositionFromAudio(audioRef.current);
        }
      });
      navigator.mediaSession.setActionHandler?.("stop", () => {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
        setIsPlaying(false);
        navigator.mediaSession.playbackState = "none";
      });
    } catch {}
  }, [currentSong, playNext, playPrevious, setIsPlaying]);

  // ========== YOUTUBE URL REFRESH ON ERROR ==========
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    const handleError = async () => {
      if (currentSong.source === "youtube" && currentSong.videoId) {
        const { resolveAudioUrl } = usePlayerStore.getState();
        const store = usePlayerStore.getState();
        const newCache = new Map(store._urlCache);
        newCache.delete(currentSong.videoId!);
        usePlayerStore.setState({ _urlCache: newCache });

        const newUrl = await resolveAudioUrl(currentSong);
        if (newUrl) {
          currentSongIdRef.current = null;
          usePlayerStore.setState({ currentSong: { ...currentSong, audioUrl: newUrl } });
        }
      }
    };

    audio.addEventListener("error", handleError);
    return () => audio.removeEventListener("error", handleError);
  }, [currentSong]);

  // ========== PLAY/PAUSE SYNC ==========
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || isSwitchingRef.current) return;

    if (isPlaying) {
      // Only play if we have a valid source
      if (audio.src && audio.src !== "" && audio.src !== window.location.href) {
        audio.play().catch(() => {});
        if (hasMS) navigator.mediaSession.playbackState = "playing";
      }
    } else {
      audio.pause();
      if (hasMS) navigator.mediaSession.playbackState = "paused";
    }
    setMSPositionFromAudio(audio);
  }, [isPlaying]);

  // ========== AUDIO EVENT LISTENERS ==========
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let lastPosUpdate = 0;
    let lastSaveTime = 0;

    const handleTime = () => {
      setCurrentTime(audio.currentTime);
      const now = performance.now();
      if (now - lastPosUpdate > 250) {
        setMSPositionFromAudio(audio);
        lastPosUpdate = now;
      }
      // Save position every 5 seconds for resume capability
      if (now - lastSaveTime > 5000) {
        const cs = usePlayerStore.getState().currentSong;
        if (cs) {
          usePreferencesStore.getState().setLastPlayed(cs, audio.currentTime);
        }
        lastSaveTime = now;
      }
    };

    const handleLoadStart = () => resetMSPosition();

    const handleDuration = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(dur);
      setMSPositionFromAudio(audio);
    };

    const handleSeeked = () => setMSPositionFromAudio(audio);

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
      if (isSwitchingRef.current) return;
      setIsPlaying(true);
      if (hasMS) navigator.mediaSession.playbackState = "playing";
      setMSPositionFromAudio(audio);
    };

    const handlePause = () => {
      if (isSwitchingRef.current) return;
      setIsPlaying(false);
      if (hasMS) navigator.mediaSession.playbackState = "paused";
      setMSPositionFromAudio(audio);
    };

    const handleInterruption = () => {
      if (isSwitchingRef.current) return;
      if (audio.paused && isPlaying) {
        if (!navigator.onLine) {
          wasPlayingBeforeOfflineRef.current = true;
        }
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

  // ========== KEYBOARD ==========
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); setIsPlaying(!isPlaying); }
      if (e.shiftKey && e.key.toLowerCase() === "p") { e.preventDefault(); playPrevious(); }
      if (e.shiftKey && e.key.toLowerCase() === "n") { e.preventDefault(); playNext(); }
      if (e.key.toLowerCase() === "s" && !e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleShuffle(); }
      if (e.key.toLowerCase() === "r" && !e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleRepeat(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5); }
      if (e.key === "ArrowRight") { e.preventDefault(); if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 5); }
      if (e.key.toLowerCase() === "m" && !e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); if (audioRef.current) audioRef.current.muted = !audioRef.current.muted; }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, setIsPlaying, playPrevious, playNext, toggleShuffle, toggleRepeat]);

  return <audio ref={audioRef} preload="auto" playsInline webkit-playsinline="true" />;
};

export default AudioPlayer;