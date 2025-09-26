import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getAllUsers, getMessages,likeSong, unlikeSong, getLikedSongs } from "../controller/user.controller.js";

const router = Router();

router.get("/", protectRoute, getAllUsers);
router.get("/messages/:userId", protectRoute, getMessages);
router.get("/me/liked-songs", protectRoute, getLikedSongs);
router.post("/me/like/:songId", protectRoute, likeSong);
router.delete("/me/unlike/:songId", protectRoute, unlikeSong);

export default router;