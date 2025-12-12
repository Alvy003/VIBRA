import Topbar from "@/components/Topbar";
import { useMusicStore } from "@/stores/useMusicStore";
import { useEffect, useMemo, useState } from "react";
import FeaturedSection from "./components/FeaturedSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import SectionGrid from "./components/SectionGrid";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { motion } from "framer-motion";
import { axiosInstance } from "@/lib/axios";
import { Song } from "@/types";
import { useUser } from "@clerk/clerk-react";
import RecentlyPlayedSection from "./components/RecentlyPlayedSection";

const HomePage = () => {
  const {
    fetchFeaturedSongs,
    fetchMadeForYouSongs,
    fetchTrendingSongs,
    isLoading,
    madeForYouSongs,
    featuredSongs,
    trendingSongs,
  } = useMusicStore();

  const { isSignedIn, isLoaded } = useUser();
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Time-based greeting
  const greetingData = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning" };
    if (hour < 18) return { text: "Good afternoon" };
    return { text: "Good evening" };
  }, []);

  const { initializeQueue, currentSong } = usePlayerStore();

  // Fetch history
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      setIsLoadingHistory(false);
      return;
    }

    const fetchRecent = async () => {
      try {
        const { data } = await axiosInstance.get('/history/recently-played?limit=6');
        setRecentSongs(data);
      } catch (error) {
        console.error('Failed to fetch recently played:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchRecent();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!currentSong && madeForYouSongs.length && featuredSongs.length && trendingSongs.length) {
      const allSongs = [...featuredSongs, ...madeForYouSongs, ...trendingSongs];
      initializeQueue(allSongs);
    }
  }, [initializeQueue, currentSong, madeForYouSongs, featuredSongs, trendingSongs]);

  useEffect(() => {
    fetchFeaturedSongs();
    fetchMadeForYouSongs();
    fetchTrendingSongs();
  }, [fetchFeaturedSongs, fetchMadeForYouSongs, fetchTrendingSongs]);

  // Show history if available, else show featured
  const showHistory = isSignedIn && recentSongs.length > 0 && !isLoadingHistory;

  return (
    <main className="rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-800 via-zinc-900/80 to-zinc-900">
      <Topbar />
      <ScrollArea className="h-[calc(100vh-130px)] sm:h-[calc(100vh-150px)]">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Animated Greeting Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent flex items-center gap-3">
              {greetingData.text}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </motion.div>

          {/* ✅ CONDITIONAL: Recently Played OR Featured Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {showHistory ? (
              <RecentlyPlayedSection songs={recentSongs} />
            ) : (
              <FeaturedSection />
            )}
          </motion.div>

          {/* Content Sections */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-8 pb-6"
          >
            <SectionGrid title="Made For You" songs={madeForYouSongs} isLoading={isLoading} />
            <SectionGrid title="Trending" songs={trendingSongs} isLoading={isLoading} />
          </motion.div>
        </div>
      </ScrollArea>
    </main>
  );
};

export default HomePage;