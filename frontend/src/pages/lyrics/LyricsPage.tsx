// src/pages/lyrics/LyricsPage.tsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLyricsStore } from "@/stores/useLyricsStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import LyricsContainer from "@/components/LyricsContainer";
import { MicVocal, Music } from "lucide-react";
import Topbar from "@/components/Topbar";
import { useDominantColor, prefetchDominantColor } from "@/hooks/useDominantColor";
import LyricsOptionsMenu from "@/components/LyricsOptionsMenu";

const LyricsPage = () => {
  const navigate = useNavigate();
  const { currentSong, queue, currentIndex } = usePlayerStore();
  const {
    setLyricsVisible,
    prefetchForSong,
    hasLyrics,
    isLoading,
  } = useLyricsStore();

  const dominantColor = useDominantColor(currentSong?.imageUrl);
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLyricsVisible(true);
    return () => setLyricsVisible(false);
  }, [setLyricsVisible]);

  useEffect(() => {
    if (!currentSong) {
      navigate(-1);
    }
  }, [currentSong, navigate]);

  useEffect(() => {
    if (!currentSong || currentIndex < 0 || queue.length === 0) return;

    const prefetchTimer = setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex < queue.length) {
        const nextSong = queue[nextIndex];
        if (nextSong && !prefetchedRef.current.has(nextSong._id)) {
          prefetchedRef.current.add(nextSong._id);
          prefetchForSong(nextSong._id, nextSong.title, nextSong.artist);
          prefetchDominantColor(nextSong.imageUrl);
        }
      }
    }, 3000);

    return () => clearTimeout(prefetchTimer);
  }, [currentSong?._id, currentIndex, queue]);

  if (!currentSong) return null;

  // Show "no lyrics" state when loading is done and no lyrics found
  const showNoLyrics = !isLoading && !hasLyrics;

  return (
    <div className="h-full rounded-lg overflow-hidden relative flex flex-col">
      {/* Background — full dominant color */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          background: `
            radial-gradient(circle at top, ${dominantColor} 0%, transparent 55%),
            linear-gradient(to bottom, ${dominantColor}, #000 140%)
          `,
        }}
      >
        <div className="absolute inset-0 bg-black/35" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Topbar */}
      <div className="relative z-20 shrink-0">
        <Topbar className="bg-transparent backdrop-blur-none" />
        {!showNoLyrics && (
          <div className="absolute right-4 z-[120]">
            <LyricsOptionsMenu variant="desktop" />
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col">
        {showNoLyrics ? (
          /* ── No Lyrics Available ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
            {/* Album art */}
            <div className="relative">
              <img
                src={currentSong.imageUrl}
                alt={currentSong.title}
                className="w-48 h-48 rounded-2xl object-cover shadow-2xl shadow-black/50"
              />
              <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                <Music className="w-5 h-5 text-white/60" />
              </div>
            </div>

            {/* Song info */}
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold text-white">
                {currentSong.title}
              </h2>
              <p className="text-sm text-white/50">
                {currentSong.artist}
              </p>
            </div>

            {/* Message */}
            <div className="text-center space-y-1.5 max-w-xs">
              <p className="text-base text-white/70 font-medium">
                No lyrics available
              </p>
              <p className="text-sm text-white/35">
                Lyrics for this song couldn't be found
              </p>
            </div>
          </div>
        ) : (
          /* ── Lyrics Container ── */
          <LyricsContainer
            variant="desktop"
            dominantColor={dominantColor}
          />
        )}
      </div>

      <div className="relative z-10 flex items-center justify-center gap-1.5 py-3 shrink-0">
        <MicVocal className="w-3 h-3 text-white/15" />
        <span className="text-[10px] text-white/15 font-medium uppercase tracking-widest">
          Lyrics
        </span>
      </div>
    </div>
  );
};

export default LyricsPage;