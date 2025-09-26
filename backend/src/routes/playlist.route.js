import express from "express";
import {
  createPlaylist,
  getAllPlaylists,
  getPlaylistById,
  updatePlaylist,
  patchPlaylistSongs,
  deletePlaylist,
} from "../controller/playlist.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/", getAllPlaylists);
router.post("/", requireAdmin, createPlaylist);
router.get("/:id", getPlaylistById);
router.put("/:id", requireAdmin, updatePlaylist);
router.patch("/:id/songs", requireAdmin, patchPlaylistSongs);
router.delete("/:id", requireAdmin, deletePlaylist);

export default router;
