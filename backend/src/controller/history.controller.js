// controller/history.controller.js
import { PlayHistory } from "../models/playHistory.model.js";
import { Song } from "../models/song.model.js";
import mongoose from "mongoose";

// Track a song play
export const trackPlay = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { songId, completionPercentage, playDuration, isExternal, externalData, context } = req.body;

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
      existing.context = context || existing.context;
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
      context: context || null,
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
        albumId: externalData.albumId || "",
        streamUrl: externalData.streamUrl || "",
      };
    }

    await PlayHistory.create(entry);

    // Keep last 200 entries for better recommendations
    const MAX_HISTORY = 200;
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

// Get recently played collections (albums/playlists identified from song history)
export const getRecentCollections = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    
    // 1. Get recent plays to extract albums/playlists
    const recentPlays = await PlayHistory.find({ userId })
      .sort({ playedAt: -1 })
      .limit(100)
      .lean();

    const collections = new Map();

    // 2. Extract from history
    for (const play of recentPlays) {
      // 2a. Priority: Playback Context (Accurate Playlist/Album context)
      if (play.context && (play.context.type === 'album' || play.context.type === 'playlist')) {
        const type = play.context.type;
        const id = play.context.id;
        const title = play.context.title || "Untitled Collection";
        const source = (id && id.includes('yt_')) ? 'youtube' : 'jiosaavn';
        const key = `${source}_${type}_${id}`;

        if (!collections.has(key)) {
          collections.set(key, {
            _id: id,
            type,
            source,
            title,
            artist: type === 'album' ? (play.externalData?.artist || "Various Artists") : "Playlist",
            imageUrl: play.externalData?.imageUrl || "",
            lastPlayedAt: play.playedAt,
          });
        }
        continue; // Context is the most accurate, skip album-name fallback if context exists
      }

      // 2b. Fallback: Album name from track metadata (Backward compatibility)
      if (play.isExternal && play.externalData && play.externalData.album) {
        const albumName = play.externalData.album;
        const albumId = play.externalData.albumId || "";
        const source = play.externalData.source || "jiosaavn";
        
        // Prioritize albumId if it exists, otherwise use name as key
        const key = albumId ? `${source}_album_${albumId}` : `${source}_album_${albumName}`;
        
        if (!collections.has(key)) {
          collections.set(key, {
            _id: albumId || albumName, // Prefer the real ID
            type: "album",
            source,
            title: albumName,
            artist: play.externalData.artist || "Various Artists",
            imageUrl: play.externalData.imageUrl || "",
            lastPlayedAt: play.playedAt,
          });
        }
      }
    }

    // 3. Get Saved Items (Playlists/Albums)
    const { SavedItem } = await import("../models/savedItem.model.js");
    const savedItems = await SavedItem.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    for (const item of savedItems) {
      const key = `${item.source}_${item.type}_${item.externalId}`;
      if (!collections.has(key)) {
        collections.set(key, {
            _id: item.externalId,
            type: item.type,
            source: item.source,
            title: item.title,
            artist: item.artist,
            imageUrl: item.imageUrl,
            lastPlayedAt: item.createdAt, // Use creation as fallback
            isSaved: true
        });
      }
    }

    // 4. Resolve IDs for items that only have names (backward compatibility)
    const { jiosaavn } = await import("../lib/streamProviders.js");
    
    const resolveList = Array.from(collections.values()).sort((a, b) => {
        return new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime();
    }).slice(0, 8); // Only the top 8

    for (let i = 0; i < resolveList.length; i++) {
        const item = resolveList[i];
        if (item.source === "jiosaavn" && item.type === "album" && (!item._id || item._id === item.title)) {
            // It's a name-only ID, resolve it
            try {
                const results = await jiosaavn.searchAlbums(item.title, 1);
                if (results && results.length > 0) {
                    item._id = results[0]._id; // This is the numeric ID
                }
            } catch (err) {
                console.error("Resolve failed for:", item.title);
            }
        }
    }

    res.json(resolveList);
  } catch (error) {
    console.error("Error fetching recent collections:", error);
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