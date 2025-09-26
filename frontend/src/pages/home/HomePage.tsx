import Topbar from "@/components/Topbar";
import { useMusicStore } from "@/stores/useMusicStore";
import { useEffect, useMemo } from "react";
import FeaturedSection from "./components/FeaturedSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import SectionGrid from "./components/SectionGrid";
import { usePlayerStore } from "@/stores/usePlayerStore";

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

	// 👉 Time-based greeting using useMemo
	const greeting = useMemo(() => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good morning";
		if (hour < 18) return "Good afternoon";
		return "Good evening";
	}, []);

	const { initializeQueue, currentSong  } = usePlayerStore();

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
	  

	return (
		<main className='rounded-md overflow-hidden h-full bg-gradient-to-b from-zinc-800 to-zinc-900'>
			<Topbar />
			<ScrollArea className='h-[calc(100vh-150px)]'>
				<div className='p-4 sm:p-6'>
					<h1 className='text-2xl sm:text-3xl font-bold mb-6'>{greeting}</h1>
					<FeaturedSection />

					<div className='space-y-8'>
						<SectionGrid title='Made For You' songs={madeForYouSongs} isLoading={isLoading} />
						<SectionGrid title='Trending' songs={trendingSongs} isLoading={isLoading} />
					</div>
				</div>
			</ScrollArea>
		</main>
	);
};

export default HomePage;
