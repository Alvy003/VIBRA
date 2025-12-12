// routes/admin.route.js
import { Router } from "express";
import {
  checkAdmin,
  createAlbum,
  createSong,
  deleteAlbum,
  deleteSong,
  patchAlbumSongs,   
  updateSong,
  changeSongAlbum,
  updateAlbum,
  updateSongImage,
  updateSongAudio, 
} from "../controller/admin.controller.js";
import {
  createPlaylist,
  deletePlaylist,
  updatePlaylist,
} from "../controller/playlist.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/check", protectRoute, checkAdmin);

// SONGS
router.post("/songs", protectRoute, requireAdmin, createSong);
router.delete("/songs/:id", protectRoute, requireAdmin, deleteSong);
router.patch("/songs/:id", protectRoute, requireAdmin, updateSong);
router.patch("/songs/:id/album", protectRoute, requireAdmin, changeSongAlbum);
router.patch("/songs/:id/image", protectRoute, requireAdmin, updateSongImage);
router.patch("/songs/:id/audio", protectRoute, requireAdmin, updateSongAudio);

// ALBUMS
router.post("/albums", protectRoute, requireAdmin, createAlbum);
router.patch("/albums/:id", protectRoute, requireAdmin, updateAlbum);
router.delete("/albums/:id", protectRoute, requireAdmin, deleteAlbum);
router.patch("/albums/:id/songs", protectRoute, requireAdmin, patchAlbumSongs); 

// PLAYLISTS
router.post("/playlists", protectRoute, requireAdmin, createPlaylist);
router.put("/playlists/:id", protectRoute, requireAdmin, updatePlaylist);
router.delete("/playlists/:id", protectRoute, requireAdmin, deletePlaylist);

export default router;
