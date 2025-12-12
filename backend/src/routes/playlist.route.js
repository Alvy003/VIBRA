// routes/playlist.route.js
import express from "express";
import {
  createPlaylist,
  getUserPlaylists,
  getFeaturedPlaylists,
  getPlaylistById,
  updatePlaylist,
  patchPlaylistSongs,
  deletePlaylist,
} from "../controller/playlist.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/my-playlists", getUserPlaylists);
router.get("/featured", getFeaturedPlaylists);
router.post("/", createPlaylist);
router.get("/:id", getPlaylistById);
router.put("/:id", updatePlaylist);
router.patch("/:id/songs", patchPlaylistSongs);
router.delete("/:id", deletePlaylist);

export default router;