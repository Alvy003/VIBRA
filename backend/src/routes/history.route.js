// routes/history.route.js
import express from "express";
import {
  trackPlay,
  getRecentlyPlayed,
  clearHistory,
} from "../controller/history.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.post("/track", trackPlay);
router.get("/recently-played", getRecentlyPlayed);
router.delete("/clear", clearHistory);

export default router;