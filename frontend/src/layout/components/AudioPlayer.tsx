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

  // load new song
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    const audio = audioRef.current;

    // only reset src if it's a new song
    if (audio.src !== currentSong.audioUrl) {
      audio.src = currentSong.audioUrl;
      audio.currentTime = 0;
    }

    // ✅ Media Session API for lockscreen/notification
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

  // play/pause state sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  // attach listeners once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTime = () => setCurrentTime(audio.currentTime);
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
