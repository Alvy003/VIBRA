// controller/history.controller.js
import { PlayHistory } from "../models/playHistory.model.js";
import { Song } from "../models/song.model.js";
import mongoose from "mongoose";

// Track a song play
export const trackPlay = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { songId, completionPercentage, playDuration, isExternal, externalData } = req.body;

    if (!songId) {
      return res.status(400).json({ message: "songId required" });
    }

    // Don't duplicate if same song played within 30 seconds
    const recentCutoff = new Date(Date.now() - 30 * 1000);
    const existing = await PlayHistory.findOne({
      userId,
      songId: String(songId),
      playedAt: { $gte: recentCutoff },
    });

    if (existing) {
      existing.playedAt = new Date();
      existing.completionPercentage = completionPercentage || existing.completionPercentage;
      existing.playDuration = playDuration || existing.playDuration;
      await existing.save();
      return res.status(200).json({ success: true });
    }

    // Build entry
    const entry = {
      userId,
      songId: String(songId),
      isExternal: isExternal || false,
      completionPercentage: completionPercentage || 100,
      playDuration: playDuration || 0,
    };

    // Store external song data
    if (isExternal && externalData) {
      entry.externalData = {
        title: externalData.title || "",
        artist: externalData.artist || "",
        imageUrl: externalData.imageUrl || "",
        duration: externalData.duration || 0,
        source: externalData.source || "jiosaavn",
        externalId: externalData.externalId || songId,
        album: externalData.album || "",
        streamUrl: externalData.streamUrl || "",
      };
    }

    await PlayHistory.create(entry);

    // Keep only last 50 records per user
    const MAX_HISTORY = 50;
    const historyCount = await PlayHistory.countDocuments({ userId });

    if (historyCount > MAX_HISTORY) {
      const recordsToDelete = await PlayHistory.find({ userId })
        .sort({ playedAt: 1 })
        .limit(historyCount - MAX_HISTORY)
        .select("_id");

      await PlayHistory.deleteMany({
        _id: { $in: recordsToDelete.map((r) => r._id) },
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error tracking play:", error);
    next(error);
  }
};

// Get recently played songs (mixed local + external)
export const getRecentlyPlayed = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const limit = parseInt(req.query.limit) || 20;

    // Get recent history entries
    const recentPlays = await PlayHistory.find({ userId })
      .sort({ playedAt: -1 })
      .limit(limit * 3) // Extra for dedup
      .lean();

    // Deduplicate by songId
    const seenIds = new Set();
    const dedupedPlays = [];
    for (const play of recentPlays) {
      if (!seenIds.has(play.songId)) {
        seenIds.add(play.songId);
        dedupedPlays.push(play);
      }
      if (dedupedPlays.length >= limit) break;
    }

    // Separate local and external entries
    const localIds = [];
    const results = [];

    for (const play of dedupedPlays) {
      if (play.isExternal && play.externalData) {
        // External song - use stored data directly
        results.push({
          _play: play, // Keep reference for ordering
          _id: play.songId,
          title: play.externalData.title || "Unknown",
          artist: play.externalData.artist || "Unknown",
          imageUrl: play.externalData.imageUrl || "",
          audioUrl: play.externalData.streamUrl || "",
          duration: play.externalData.duration || 0,
          albumId: null,
          source: play.externalData.source || "jiosaavn",
          externalId: play.externalData.externalId || play.songId,
          streamUrl: play.externalData.streamUrl || "",
          album: play.externalData.album || "",
          lastPlayedAt: play.playedAt,
        });
      } else {
        // Local song - need to fetch from DB
        // Check if songId is a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(play.songId)) {
          localIds.push({ play, id: play.songId });
        }
      }
    }

    // Batch fetch local songs
    if (localIds.length > 0) {
      const ids = localIds.map((l) => l.id);
      const localSongs = await Song.find({ _id: { $in: ids } })
        .select("_id title artist imageUrl audioUrl duration albumId")
        .lean();

      const songMap = new Map();
      localSongs.forEach((song) => {
        songMap.set(song._id.toString(), song);
      });

      for (const { play, id } of localIds) {
        const song = songMap.get(id);
        if (song) {
          results.push({
            _play: play,
            ...song,
            _id: song._id.toString(),
            lastPlayedAt: play.playedAt,
          });
        }
      }
    }

    // Sort by playedAt (most recent first) to maintain original order
    results.sort((a, b) => {
      const timeA = a._play?.playedAt || a.lastPlayedAt || 0;
      const timeB = b._play?.playedAt || b.lastPlayedAt || 0;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    // Clean up internal fields
    const cleaned = results.map(({ _play, ...rest }) => rest);

    res.json(cleaned);
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