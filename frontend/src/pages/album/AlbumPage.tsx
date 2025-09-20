import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMusicStore } from "@/stores/useMusicStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { Clock, Pause, Play } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

export const formatDuration = (seconds: number) => {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const AlbumPage = () => {
	const { albumId } = useParams();
	const { fetchAlbumById, currentAlbum, isLoading } = useMusicStore();
	const { currentSong, isPlaying, playAlbum, togglePlay } = usePlayerStore();

	useEffect(() => {
		if (albumId) fetchAlbumById(albumId);
	}, [fetchAlbumById, albumId]);

	if (isLoading) return null;

	const handlePlayAlbum = () => {
		if (!currentAlbum) return;
		const isCurrentAlbumPlaying = currentAlbum?.songs.some((song) => song._id === currentSong?._id);
		if (isCurrentAlbumPlaying) togglePlay();
		else playAlbum(currentAlbum?.songs, 0);
	};

	const handlePlaySong = (index: number) => {
		if (!currentAlbum) return;
		playAlbum(currentAlbum?.songs, index);
	};

	return (
		<div className="h-full">
			<ScrollArea className="h-full rounded-md">
				<div className="relative min-h-full">
					{/* Static Gradient Background */}
					<div
						className="absolute inset-0 bg-gradient-to-b from-[#5038a0]/80 via-zinc-900/80 to-zinc-900 pointer-events-none"
						aria-hidden="true"
					/>

					<div className="relative z-10">
						{/* Album Header */}
						<div className="flex flex-col md:flex-row p-6 gap-6 pb-8">
							<img
								src={currentAlbum?.imageUrl}
								alt={currentAlbum?.title}
								className="w-[240px] h-[240px] shadow-xl rounded mx-auto md:mx-0 md:w-[180px] md:h-[180px] sm:w-[150px] sm:h-[150px]"
							/>
							<div className="flex flex-col justify-end md:ml-6 text-center md:text-left">
								<p className="text-sm font-medium">Album</p>
								<h1 className="text-4xl sm:text-2xl md:text-7xl font-bold my-4">{currentAlbum?.title}</h1>
								<div className="flex flex-wrap justify-center md:justify-start gap-2 text-sm text-zinc-100">
									<span className="font-medium text-white">{currentAlbum?.artist}</span>
									<span>• {currentAlbum?.songs.length} songs</span>
									<span className="hidden sm:inline">• {currentAlbum?.releaseYear}</span>
								</div>
							</div>
						</div>

						{/* Play Button */}
						<div className="px-6 pb-4 flex items-center justify-center md:justify-start gap-6">
							<Button
								onClick={handlePlayAlbum}
								size="icon"
								className="w-14 h-14 rounded-full bg-violet-500 hover:bg-violet-400 hover:scale-105 transition-all"
							>
								{isPlaying && currentAlbum?.songs.some((song) => song._id === currentSong?._id) ? (
									<Pause className="h-7 w-7 text-black" />
								) : (
									<Play className="h-7 w-7 text-black" />
								)}
							</Button>
						</div>

						{/* Table Section */}
						<div className="bg-black/20 backdrop-blur-sm">
							{/* Table Header */}
							<div
								className="grid grid-cols-[16px_4fr_2fr_1fr] gap-4 px-10 py-2 text-sm 
                text-zinc-400 border-b border-white/5"
							>
								<div>#</div>
								<div>Title</div>
								<div className="hidden md:block">Released Date</div>
								<div className="hidden md:block">
									<Clock className="h-4 w-4" />
								</div>
							</div>

							{/* Songs List */}
							<div className="px-6">
								<div className="space-y-2 py-4">
									{currentAlbum?.songs.map((song, index) => {
										const isCurrentSong = currentSong?._id === song._id;
										return (
											<div
												key={song._id}
												onClick={() => handlePlaySong(index)}
												className={`group cursor-pointer rounded-md hover:bg-white/5 
											px-4 py-2 text-sm text-zinc-400
											grid md:grid-cols-[16px_4fr_2fr_1fr] grid-cols-[16px_1fr] gap-4`}
											>
												{/* Index / Icon */}
												<div className="flex items-center justify-center">
													{isCurrentSong && isPlaying ? (
														<div className="size-4 text-violet-500">♫</div>
													) : (
														<span className="group-hover:hidden">{index + 1}</span>
													)}
													{!isCurrentSong && (
														<Play className="h-4 w-4 hidden group-hover:block" />
													)}
												</div>

												{/* Title & Artist */}
												<div className="flex items-center gap-3 overflow-hidden">
													<img src={song.imageUrl} alt={song.title} className="size-10 shrink-0" />
													<div className="flex flex-col grow max-w-full">
														<div className="font-medium text-white text-sm leading-tight line-clamp-1 md:line-clamp-none">{song.title}</div>
														<div className="text-xs text-zinc-400 leading-tight line-clamp-1 md:line-clamp-none">{song.artist}</div>
													</div>
												</div>

												{/* Released Date (hidden on small screens) */}
												<div className="hidden md:flex items-center">{song.createdAt.split("T")[0]}</div>

												{/* Duration (hidden on small screens) */}
												<div className="hidden md:flex items-center">{formatDuration(song.duration)}</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				</div>
			</ScrollArea>
		</div>
	);
};

export default AlbumPage;
