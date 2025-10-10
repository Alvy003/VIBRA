import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/usePlayerStore";

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);

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

    if (audio.src !== currentSong.audioUrl) {
      audio.src = currentSong.audioUrl;
      audio.currentTime = 0;
    }

    // ✅ Media Session API
    if ("mediaSession" in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        artwork: [
          { src: currentSong.imageUrl, sizes: "512x512", type: "image/png" },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        audio.play();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audio.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        playPrevious()
      );
      navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
    }

    if (isPlaying) audio.play().catch(() => {});
  }, [currentSong, isPlaying, playNext, playPrevious, setIsPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement 
  
      if (isInput) return;
  
      // Prevent default space behavior like page scroll
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
  
      // Shift+P for previous track
      if (e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        playPrevious();
      }
  
      // Shift+N for next track
      if (e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        playNext();
      }
    };
  
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, setIsPlaying, playPrevious, playNext]);
  
  
  
  // keep play/pause in sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();

    // ✅ Update playbackState for system controls
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  // attach listeners once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTime = () => {
      setCurrentTime(audio.currentTime);

      // ✅ Update positionState so slider works
      if ("mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration || 0,
            position: audio.currentTime,
            playbackRate: audio.playbackRate,
          });
        } catch (e) {
          // some browsers may throw if not supported
        }
      }
    };

    const handleDuration = () => setDuration(audio.duration);
    const handleEnded = () => playNext();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("loadedmetadata", handleDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("loadedmetadata", handleDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [playNext, setDuration, setCurrentTime, setIsPlaying]);

  return <audio ref={audioRef} />;
};

export default AudioPlayer;
