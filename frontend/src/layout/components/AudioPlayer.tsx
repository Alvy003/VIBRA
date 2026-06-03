// AudioPlayer.tsx
import { useEffect, useRef, useCallback } from "react";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { shouldStopAfterCurrentSong, clearStopAfterCurrentSong } from "@/components/SleepTimer";

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Hidden preloader for next song buffering
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const currentSongIdRef = useRef<string | null>(null);
  const isSwitchingRef = useRef(false);
  const isFirstLoadRef = useRef(true);
  const wasPlayingBeforeOfflineRef = useRef(false);
  // Incremented on each new song switch to cancel stale async chains
  const switchIdRef = useRef(0);
  // Throttle rapid skip/previous presses from media session (hardware buttons)
  const lastSkipTimeRef = useRef(0);
  const SKIP_THROTTLE_MS = 400;
  // Preload tracking
  const preloadedSongIdRef = useRef<string | null>(null);
  // Media session heartbeat timer
  const msHeartbeatRef = useRef<NodeJS.Timeout | null>(null);

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
    displayQueue,
    currentIndex,
  } = usePlayerStore();

  const hasMS = typeof navigator !== "undefined" && "mediaSession" in navigator;
  const canSetPos =
    hasMS &&
    (navigator.mediaSession as any) &&
    typeof (navigator.mediaSession as any).setPositionState === "function";

  // ========== WAKE LOCK ==========
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

  // ========== BACKGROUND PLAYBACK ==========
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

  // ========== iOS KEEP-ALIVE ==========
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

  // ========== HELPERS ==========
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

  // ========== SMOOTH SWITCH (fixed cancellation + isSwitchingRef cleanup) ==========
  const smoothSwitchAudio = async (
    audio: HTMLAudioElement,
    newSrc: string,
    shouldPlay: boolean,
    thisSwitchId: number
  ) => {
    const FADE_OUT_MS = 120;
    const FADE_IN_MS = 150;
    const steps = 8; // fewer steps = faster abort detection
    const startVolume = audio.volume;

    isSwitchingRef.current = true;
    
    // Forcefully abort any pending browser playback/loading
    audio.pause();
    audio.src = "";
    audio.load();

    // Helper: check if this switch was superseded. Always cleans up before returning.
    const isCancelled = () => switchIdRef.current !== thisSwitchId;

    try {
      // Fade out only if currently playing something
      if (!audio.paused && audio.src) {
        for (let i = steps; i >= 0; i--) {
          if (isCancelled()) {
            // Restore volume so the winner switch starts from correct level
            audio.volume = startVolume;
            return;
          }
          audio.volume = (startVolume * i) / steps;
          await new Promise<void>((r) => setTimeout(r, FADE_OUT_MS / steps));
        }
        audio.pause();
      }

      if (isCancelled()) {
        audio.volume = startVolume;
        return;
      }

      // Stop any preload audio that was buffering the same or different song
      if (preloadAudioRef.current) {
        preloadAudioRef.current.src = "";
        preloadedSongIdRef.current = null;
      }

      audio.currentTime = 0;
      audio.volume = startVolume; // restore before loading new src
      audio.src = newSrc;
      audio.load();

      if (isCancelled()) {
        return;
      }

      if (shouldPlay) {
        // Start at 0 volume and fade in
        audio.volume = 0;
        await audio.play().catch(() => {});
      }

      if (isCancelled()) {
        return;
      }

      isSwitchingRef.current = false;

      if (!shouldPlay) {
        audio.volume = startVolume;
        return;
      }

      // Fade in
      for (let i = 0; i <= steps; i++) {
        if (isCancelled()) {
          audio.volume = startVolume;
          return;
        }
        audio.volume = (startVolume * i) / steps;
        await new Promise<void>((r) => setTimeout(r, FADE_IN_MS / steps));
      }

      audio.volume = startVolume;

      if (hasMS) {
        navigator.mediaSession.playbackState = "playing";
        setMSPositionFromAudio(audio);
      }
    } catch (e) {
      console.warn("Smooth switch failed", e);
      audio.volume = startVolume;
      if (!isCancelled()) {
        isSwitchingRef.current = false;
        audio.src = newSrc;
        audio.load();
        if (shouldPlay) audio.play().catch(() => {});
      }
    }
  };

  // ========== VOLUME SYNC ==========
  useEffect(() => {
    if (audioRef.current && !isSwitchingRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // ========== RESUME AFTER APP RESTART ==========
  useEffect(() => {
    if (!isFirstLoadRef.current) return;
    if (!audioRef.current) return;
    
    const store = usePlayerStore.getState();
    if (store.currentSong) return;
    
    const { lastPlayed } = usePreferencesStore.getState();
    if (!lastPlayed?.song) return;
    
    const age = Date.now() - lastPlayed.timestamp;
    if (age > 24 * 60 * 60 * 1000) return;
    
    usePlayerStore.setState({
      currentSong: lastPlayed.song,
      currentTime: lastPlayed.position,
      isPlaying: false,
    });
  }, []);

  // ========== NEXT-SONG PRELOADER ==========
  // Industry-standard: buffer the upcoming song while current is playing
  useEffect(() => {
    // Create the hidden preload element once
    if (!preloadAudioRef.current) {
      const el = new Audio();
      el.preload = "auto";
      el.muted = true; // silent — only for buffering
      el.volume = 0;
      preloadAudioRef.current = el;
    }
    return () => {
      if (preloadAudioRef.current) {
        preloadAudioRef.current.src = "";
        preloadAudioRef.current = null;
      }
    };
  }, []);

  // Determine next song from display queue
  useEffect(() => {
    const audio = audioRef.current;
    const preload = preloadAudioRef.current;
    if (!audio || !preload || !currentSong) return;

    const nextSong = (() => {
      if (currentIndex === -1 || displayQueue.length === 0) return null;
      const upcoming = displayQueue.slice(currentIndex + 1);
      return upcoming[0] || null;
    })();

    if (!nextSong) return;

    const nextId = nextSong._id || nextSong.externalId || "";

    // Only update preload when the track to preload actually changes
    if (preloadedSongIdRef.current === nextId) return;

    const preloadSong = () => {
      if (isSwitchingRef.current) return; // don't preload during a switch
      const src = getAudioSrc(nextSong);
      if (!src) return;
      preloadedSongIdRef.current = nextId;
      preload.src = src;
      preload.load();
    };

    // Start preloading when within 20s of end, or immediately if song is longer than 45s
    const checkAndPreload = () => {
      if (!audio.duration || !isPlaying) return;
      const remaining = audio.duration - audio.currentTime;
      if (remaining <= 20 && remaining > 0) {
        preloadSong();
      }
    };

    // Also preload proactively if next song changes while we have >20s left
    // Do it after 3s of playing to avoid wasting bandwidth on short previews
    const proactiveTimer = setTimeout(() => {
      if (isPlaying && !preloadedSongIdRef.current) {
        preloadSong();
      }
    }, 3000);

    audio.addEventListener("timeupdate", checkAndPreload);
    return () => {
      clearTimeout(proactiveTimer);
      audio.removeEventListener("timeupdate", checkAndPreload);
    };
  }, [currentSong, currentIndex, displayQueue, isPlaying]);

  // ========== LOAD NEW SONG ==========
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    const audio = audioRef.current;

    const songId = currentSong._id || currentSong.externalId || "";
    if (songId === currentSongIdRef.current) {
      return;
    }
    currentSongIdRef.current = songId;

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
        // Immediately mark as playing so OS doesn't hide the notification
        navigator.mediaSession.playbackState = shouldAutoPlay ? "playing" : "paused";
      } catch {}
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [currentSong]);

  // ========== MEDIA SESSION ACTIONS + HEARTBEAT ==========
  // Use refs for the latest playNext/playPrevious so we only register handlers once
  const playNextRef = useRef(playNext);
  const playPreviousRef = useRef(playPrevious);
  const setIsPlayingRef = useRef(setIsPlaying);
  useEffect(() => { playNextRef.current = playNext; }, [playNext]);
  useEffect(() => { playPreviousRef.current = playPrevious; }, [playPrevious]);
  useEffect(() => { setIsPlayingRef.current = setIsPlaying; }, [setIsPlaying]);

  useEffect(() => {
    if (!hasMS) return;

    const throttledSkip = (fn: () => void) => {
      const now = Date.now();
      if (now - lastSkipTimeRef.current < SKIP_THROTTLE_MS) return;
      lastSkipTimeRef.current = now;
      fn();
    };

    try {
      navigator.mediaSession.setActionHandler?.("play", () => {
        audioRef.current?.play().catch(() => {});
        setIsPlayingRef.current(true);
        navigator.mediaSession.playbackState = "playing";
      });
      navigator.mediaSession.setActionHandler?.("pause", () => {
        audioRef.current?.pause();
        setIsPlayingRef.current(false);
        navigator.mediaSession.playbackState = "paused";
      });
      navigator.mediaSession.setActionHandler?.("previoustrack", () => {
        throttledSkip(() => {
          setIsPlayingRef.current(true);
          playPreviousRef.current();
        });
      });
      navigator.mediaSession.setActionHandler?.("nexttrack", () => {
        throttledSkip(() => {
          setIsPlayingRef.current(true);
          playNextRef.current();
        });
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
        setIsPlayingRef.current(false);
        navigator.mediaSession.playbackState = "none";
      });
    } catch {}

    // Heartbeat: re-assert playback state every 20s so iOS/Android don't kill the session
    msHeartbeatRef.current = setInterval(() => {
      if (!hasMS) return;
      const state = usePlayerStore.getState();
      const audio = audioRef.current;
      if (!audio || !state.currentSong) return;
      try {
        const expectedState = state.isPlaying && !audio.paused ? "playing" : "paused";
        if (navigator.mediaSession.playbackState !== expectedState) {
          navigator.mediaSession.playbackState = expectedState;
        }
        // Re-set metadata if it got wiped (some Android browsers clear it)
        if (!navigator.mediaSession.metadata && state.currentSong) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: state.currentSong.title,
            artist: state.currentSong.artist,
            album: state.currentSong.album || "",
            artwork: state.currentSong.imageUrl
              ? [{ src: state.currentSong.imageUrl, sizes: "512x512", type: "image/png" }]
              : [],
          });
        }
        if (audio && !audio.paused) setMSPositionFromAudio(audio);
      } catch {}
    }, 20000);

    return () => {
      if (msHeartbeatRef.current) {
        clearInterval(msHeartbeatRef.current);
        msHeartbeatRef.current = null;
      }
    };
  // Register once on mount — handlers use refs internally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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