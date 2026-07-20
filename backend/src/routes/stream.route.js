// routes/stream.route.js
import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { searchRateLimiter } from "../middleware/rateLimiter.js";
import {
  searchExternal,
  getStreamUrl,
  getSongDetails,
  searchExternalAlbums,
  getExternalAlbum,
  proxyAudio,
  searchAll,
  getRecommendations,
  getExternalPlaylist,
  getExternalArtist,
  getHomepageData,
  getAutocomplete,
  getDailyMix,
  getQuickPicks,
  getWeeklyMix,
  redirectStream,
  getLyrics,
  getArtistInfo,
  getBecauseYouPlayed,
  getRediscoverFavorites,
  getFollowedArtistsRecommendations,
} from "../controller/stream.controller.js";
import { recognizeSong } from "../controller/recognizeSong.controller.js";

const router = Router();

// ─── Existing routes ───
router.get("/search", searchRateLimiter, searchExternal);
router.get("/stream-url/:source/:id", getStreamUrl);
router.get("/song/:source/:id", getSongDetails);
router.get("/albums/search", searchExternalAlbums);
router.get("/albums/:source/:id", getExternalAlbum);
router.get("/proxy/audio", proxyAudio); // No auth for audio proxy (needed for player)

// ─── NEW routes ───
router.get("/search/all", searchRateLimiter, searchAll);
router.get("/recommendations/:source/:id", getRecommendations);
router.get("/playlists/:source/:id", getExternalPlaylist);
router.get("/artists/:source/:id", getExternalArtist);
router.get("/home", getHomepageData);
router.get("/daily-mix", protectRoute, getDailyMix);
router.get("/quick-picks", protectRoute, getQuickPicks);
router.get("/weekly-mix", protectRoute, getWeeklyMix);
router.get("/recommendations/because-you-played", protectRoute, getBecauseYouPlayed);
router.get("/recommendations/rediscover-favorites", protectRoute, getRediscoverFavorites);
router.get("/recommendations/followed-artists", protectRoute, getFollowedArtistsRecommendations);
router.get("/play/:source/:id", redirectStream);
router.get("/autocomplete", searchRateLimiter, getAutocomplete);
router.get("/lyrics", getLyrics);
router.get("/artist/info", getArtistInfo);

// ─── Song Recognition ───
router.post("/recognize-song", searchRateLimiter, recognizeSong);

export default router;