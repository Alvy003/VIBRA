//user.route.js
import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getAllUsers,
  getMessages,
  likeSong,
  unlikeSong,
  getLikedSongs,
  getUnreadCounts,       // NEW
  markMessagesRead,      // NEW
} from "../controller/user.controller.js";

const router = Router();

router.get("/", protectRoute, getAllUsers);
router.get("/messages/:userId", protectRoute, getMessages);

// NEW: unread counts for current user
router.get("/unread-counts", protectRoute, getUnreadCounts);

// NEW: mark messages (from otherUserId) as read
router.post("/messages/mark-read", protectRoute, markMessagesRead);

router.get("/me/liked-songs", protectRoute, getLikedSongs);
router.post("/me/like/:songId", protectRoute, likeSong);
router.delete("/me/unlike/:songId", protectRoute, unlikeSong);

export default router;