// backend/routes/aiPlaylist.routes.js

import { Router } from 'express';
import {
  generateAIPlaylist,
  analyzeNaturalRequest, // NEW
  getAIPlaylist,
  incrementPlayCount,
  toggleSavePlaylist,
  importSpotifyPlaylist,
  importYouTubePlaylist,
} from '../controller/aiPlaylist.controller.js';
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

// Generate new AI playlist
router.post('/generate', protectRoute, generateAIPlaylist);

// NEW: Analyze natural language request
router.post('/analyze', protectRoute, analyzeNaturalRequest);

// Get playlist by ID
router.get('/:id', protectRoute, getAIPlaylist);

// Increment play count
router.post('/:id/play', protectRoute, incrementPlayCount);

// Save/unsave playlist
router.post('/:id/save', protectRoute, toggleSavePlaylist);

// Import Spotify playlist
router.post('/import/spotify', protectRoute, importSpotifyPlaylist);

// Import YouTube playlist
router.post('/import/youtube', protectRoute, importYouTubePlaylist);

export default router;