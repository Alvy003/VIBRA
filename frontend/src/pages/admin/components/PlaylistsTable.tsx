// // src/components/PlaylistsTable.tsx
// import { Button } from "@/components/ui/button";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { usePlaylistStore } from "@/stores/usePlaylistStore";
// import { Music, Trash2 } from "lucide-react";

// const PlaylistsTable = () => {
//   const { playlists, deletePlaylist } = usePlaylistStore();

//   if (!Array.isArray(playlists) || playlists.length === 0) {
//     return <p className="text-zinc-400">No playlists found. Create one to get started.</p>;
//   }

//   return (
//     <Table>
//       <TableHeader>
//         <TableRow className="hover:bg-zinc-800/50">
//           <TableHead className="w-[50px]"></TableHead>
//           <TableHead>Name</TableHead>
//           <TableHead>Description</TableHead>
//           <TableHead>Songs</TableHead>
//           <TableHead>Featured</TableHead>
//           <TableHead className="text-right">Actions</TableHead>
//         </TableRow>
//       </TableHeader>
//       <TableBody>
//         {playlists.map((playlist) => (
//           <TableRow key={playlist._id} className="hover:bg-zinc-800/50">
//             <TableCell>
//               {playlist.imageUrl ? (
//                 <img
//                   src={playlist.imageUrl}
//                   alt={playlist.name}
//                   className="w-10 h-10 rounded object-cover"
//                 />
//               ) : (
//                 <div className="w-10 h-10 rounded bg-zinc-700 flex items-center justify-center text-xs text-white">
//                   No Img
//                 </div>
//               )}
//             </TableCell>
//             <TableCell className="font-medium">{playlist.name}</TableCell>
//             <TableCell>{playlist.description || "—"}</TableCell>
//             <TableCell>
//               <span className="inline-flex items-center gap-1 text-zinc-400">
//                 <Music className="h-4 w-4" />
//                 {playlist.songs?.length || 0} songs
//               </span>
//             </TableCell>
//             {/* <TableCell>{playlist.isFeatured ? "Yes" : "No"}</TableCell> */}
//             <TableCell className="text-right">
//               <div className="flex gap-2 justify-end">
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   onClick={() => deletePlaylist(playlist._id)}
//                   className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
//                 >
//                   <Trash2 className="h-4 w-4" />
//                 </Button>
//               </div>
//             </TableCell>
//           </TableRow>
//         ))}
//       </TableBody>
//     </Table>
//   );
// };

// export default PlaylistsTable;
