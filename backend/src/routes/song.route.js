import { Router } from "express";
import { getAllSongs, getFeaturedSongs, getMadeForYouSongs, getTrendingSongs, searchSongs, getRandomSongs } from "../controller/song.controller.js";
// import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

//protectRoute, requireAdmin,  - for admin routes only
router.get("/", getAllSongs);
router.get("/featured", getFeaturedSongs);
router.get("/made-for-you", getMadeForYouSongs);
router.get("/trending", getTrendingSongs);
router.get("/search", searchSongs);
router.get("/random", getRandomSongs);


export default router;