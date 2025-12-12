// controller/history.controller.js
import { PlayHistory } from "../models/playHistory.model.js";

// Track a song play
export const trackPlay = async (req, res, next) => {
    try {
      const userId = req.auth.userId;
      const { songId, completionPercentage, playDuration } = req.body;
  
      if (!songId) {
        return res.status(400).json({ message: "songId required" });
      }
  
      // Create the new play record
      await PlayHistory.create({
        userId,
        songId,
        completionPercentage: completionPercentage || 100,
        playDuration: playDuration || 0,
      });
  
      // ✅ LIMIT: Keep only the most recent 20 records per user
      const MAX_HISTORY = 20;
      
      const historyCount = await PlayHistory.countDocuments({ userId });
      
      if (historyCount > MAX_HISTORY) {
        // Find the oldest records to delete
        const recordsToDelete = await PlayHistory.find({ userId })
          .sort({ playedAt: 1 }) // oldest first
          .limit(historyCount - MAX_HISTORY)
          .select('_id');
        
        const idsToDelete = recordsToDelete.map(r => r._id);
        await PlayHistory.deleteMany({ _id: { $in: idsToDelete } });
      }
  
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error tracking play:", error);
      next(error);
    }
  };

// Get recently played songs
export const getRecentlyPlayed = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const limit = parseInt(req.query.limit) || 20;

    const recentPlays = await PlayHistory.find({ userId })
      .sort({ playedAt: -1 })
      .limit(limit * 3) // Get more to deduplicate
      .populate({
        path: 'songId',
        select: '_id title artist imageUrl audioUrl duration albumId'
      })
      .lean();

    // Deduplicate - keep only most recent play of each song
    const uniqueSongs = [];
    const seenIds = new Set();

    for (const play of recentPlays) {
      if (play.songId && !seenIds.has(play.songId._id.toString())) {
        uniqueSongs.push({
          ...play.songId,
          lastPlayedAt: play.playedAt,
        });
        seenIds.add(play.songId._id.toString());
        if (uniqueSongs.length >= limit) break;
      }
    }

    res.json(uniqueSongs);
  } catch (error) {
    console.error("Error fetching recently played:", error);
    next(error);
  }
};

// Clear history
export const clearHistory = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    await PlayHistory.deleteMany({ userId });
    res.json({ message: "History cleared" });
  } catch (error) {
    next(error);
  }
};