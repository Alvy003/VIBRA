// // components/RecentlyPlayed.tsx
// import { Song } from "@/types";
// import { usePlayerStore } from "@/stores/usePlayerStore";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// import { Play } from "lucide-react";

// interface RecentlyPlayedProps {
//   songs: Song[];
// }

// export const RecentlyPlayed = ({ songs }: RecentlyPlayedProps) => {
//   const { playAlbum } = usePlayerStore();

//   if (songs.length === 0) return null;

//   return (
//     <div className="relative pl-4 sm:pl-6 mb-6">
//       <h2 className="text-xl font-bold mb-4 text-white">Recently Played</h2>
      
//       <ScrollArea className="w-full whitespace-nowrap rounded-md">
//         <div className="flex w-max space-x-4 pb-4">
//           {songs.map((song, index) => (
//             <div
//               key={song._id}
//               onClick={() => playAlbum(songs, index)}
//               className="relative group cursor-pointer w-[120px]"
//             >
//               <div className="relative overflow-hidden rounded-md aspect-square mb-2 bg-zinc-800">
//                 <img
//                   src={song.imageUrl}
//                   alt={song.title}
//                   className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
//                 />
//                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
//                   <div className="bg-violet-500 rounded-full p-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
//                     <Play className="w-5 h-5 text-white fill-current pl-0.5" />
//                   </div>
//                 </div>
//               </div>
//               <div className="space-y-1">
//                 <h3 className="font-medium text-sm text-white truncate" title={song.title}>
//                   {song.title}
//                 </h3>
//                 <p className="text-xs text-zinc-400 truncate" title={song.artist}>
//                     {song.artist}
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>
//         <ScrollBar orientation="horizontal" />
//       </ScrollArea>
//     </div>
//   );
// };