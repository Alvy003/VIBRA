// controller/history.controller.js
import { PlayHistory } from "../models/playHistory.model.js";
import { Song } from "../models/song.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Album } from "../models/album.model.js";
import AIPlaylist from "../models/AIPlaylist.model.js";
import { getPlayableMatch } from "../config/features.js";
import mongoose from "mongoose";
import { redis, isConfigured } from "../lib/redisClient.js";
import { jiosaavn } from "../lib/streamProviders.js";

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
      return res.status(200).json({ success: true, historyId: existing._id });
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

    const created = await PlayHistory.create(entry);

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

    // Invalidate Rediscover Favorites cache if the song played was in the cached list
    try {
      const { getCache, deleteCache } = await import("../lib/cacheService.js");
      const cacheKey = `vibra:recommendations:rediscover-favorites:${userId}`;
      const cached = await getCache(cacheKey);
      if (cached && Array.isArray(cached.tracks)) {
        const hasSong = cached.tracks.some(t => String(t.id || t._id || t.externalId) === String(songId));
        if (hasSong) {
          await deleteCache(cacheKey);
        }
      }
    } catch (err) {
      console.warn("[Cache Invalidation] Failed to check rediscover-favorites cache:", err.message);
    }

    res.status(200).json({ success: true, historyId: created._id });
  } catch (error) {
    console.error("Error tracking play:", error);
    next(error);
  }
};

// Update progress of a play session
export const updatePlayProgress = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { historyId, playDuration, completionPercentage } = req.body;

    if (!historyId) {
      return res.status(400).json({ message: "historyId required" });
    }

    if (!mongoose.Types.ObjectId.isValid(historyId)) {
      return res.status(400).json({ message: "Invalid historyId format" });
    }

    const updateFields = {};
    if (typeof playDuration === "number") {
      updateFields.playDuration = playDuration;
    }
    if (typeof completionPercentage === "number") {
      updateFields.completionPercentage = completionPercentage;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const result = await PlayHistory.updateOne(
      { _id: historyId, userId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Play history record not found or unauthorized" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating play progress:", error);
    next(error);
  }
};

// Get recently played songs (mixed local + external)
export const getRecentlyPlayed = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const limit = parseInt(req.query.limit) || 20;

    // Get recent history entries
    const recentPlays = await PlayHistory.find(getPlayableMatch({ userId }))
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
    const recentPlays = await PlayHistory.find(getPlayableMatch({ userId }))
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

// Helper to check if an image URL is a valid image (not a streaming audio URL)
const isImageValid = (url) => {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  if (
    lower.includes("blank-audio") ||
    lower.endsWith(".mp3") ||
    lower.endsWith(".m4a") ||
    lower.endsWith(".wav") ||
    lower.includes("/stream/")
  ) {
    return false;
  }
  return true;
};

// Get frequently played collections (most-played albums/playlists/artists)
// Helper to identify discovery mixes, featured playlists, top charts, and trending collections
const DISCOVERY_KEYWORDS = [
  "daily mix", "weekly mix", "featured", "trending", "top chart", 
  "top hit", "editor", "editorial", "popular", "discover", "mix",
  "chart", "hits"
];

function isDiscoveryOrGeneric(contextId, contextTitle) {
  const id = (contextId || "").toLowerCase();
  const title = (contextTitle || "").toLowerCase();
  
  if (id.includes("daily-mix") || id.includes("weekly-mix") || id.includes("trending") || id.includes("chart")) {
    return true;
  }
  
  for (const keyword of DISCOVERY_KEYWORDS) {
    if (title.includes(keyword)) {
      return true;
    }
  }
  return false;
}

function getCollectionTier(item, title) {
  const isDisc = isDiscoveryOrGeneric(item._id.id, title);
  const playCount = item.playCount;
  const avgCompletion = item.avgCompletion || 0;
  const distinctDaysCount = item.playedDays?.length || 0;

  if (!isDisc) {
    if (playCount >= 3 && avgCompletion >= 50 && distinctDaysCount >= 2) {
      return 1; // Tier 1: Strict Personal Repeat
    }
    if (playCount >= 2 && avgCompletion >= 30 && distinctDaysCount >= 1) {
      return 2; // Tier 2: Relaxed Personal Repeat
    }
    return 3; // Tier 3: Any Personal Activity
  } else {
    if (playCount >= 3 && avgCompletion >= 50 && distinctDaysCount >= 2) {
      return 4; // Tier 4: Strict Discovery/Generic Repeat
    }
    if (playCount >= 2 && avgCompletion >= 30) {
      return 5; // Tier 5: Relaxed Discovery/Generic Repeat
    }
    return 6; // Tier 6: Any Discovery/Generic Activity
  }
}

// Get frequently played collections (most-played albums/playlists/artists)
export const getFrequentCollections = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const limit = parseInt(req.query.limit) || 8;

    // 1. Aggregate play history to find top collections
    const stats = await PlayHistory.aggregate([
      { 
        $match: getPlayableMatch({ 
          userId,
          "context.id": { $exists: true, $ne: null, $nin: ["daily-mix", "weekly-mix"] },
          "context.type": { $in: ["album", "playlist", "artist"] }
        }) 
      },
      { $sort: { playedAt: -1 } },
      {
        $group: {
          _id: {
            id: "$context.id",
            type: "$context.type",
          },
          playCount: { $sum: 1 },
          avgCompletion: { $avg: "$completionPercentage" },
          lastPlayedAt: { $max: "$playedAt" },
          playedDays: { 
            $addToSet: { 
              $dateToString: { format: "%Y-%m-%d", date: "$playedAt" } 
            } 
          }
        }
      },
      { $limit: 100 }
    ]);

    // 2. Separate local and external resolution targets
    const localAlbums = [];
    const localPlaylists = [];
    const externalQueries = [];

    stats.forEach(s => {
      const { id, type } = s._id;
      const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
      
      if (isObjectId) {
        if (type === 'album') localAlbums.push(id);
        if (type === 'playlist') localPlaylists.push(id);
      } else {
        // Strip out existing jiosaavn prefixes to avoid double prefixing
        const cleanId = String(id).replace(/^(jiosaavn_album_|jiosaavn_playlist_|jiosaavn_artist_)/, "");
        externalQueries.push({ id: cleanId, rawId: id, type, source: 'jiosaavn' });
      }
    });

    // 3. Resolve Local Metadata (MongoDB)
    const localMap = {};
    if (localAlbums.length > 0 || localPlaylists.length > 0) {
      const [albumsCursor, playlistsCursor, aiPlaylistsCursor] = await Promise.all([
        localAlbums.length > 0 ? Album.find({ _id: { $in: localAlbums } }, 'title artist imageUrl') : [],
        localPlaylists.length > 0 ? Playlist.find({ _id: { $in: localPlaylists } }, 'name imageUrl') : [],
        localPlaylists.length > 0 ? AIPlaylist.find({ _id: { $in: localPlaylists } }, 'name coverArt') : []
      ]);
      
      albumsCursor.forEach(a => localMap[a._id.toString()] = { title: a.title, subtitle: a.artist || 'Various Artists', artwork: a.imageUrl, isExternal: false, source: 'local' });
      playlistsCursor.forEach(p => localMap[p._id.toString()] = { title: p.name, subtitle: 'Playlist', artwork: p.imageUrl, isExternal: false, source: 'local' });
      aiPlaylistsCursor.forEach(p => localMap[p._id.toString()] = { title: p.name, subtitle: 'AI Playlist', artwork: p.coverArt, isExternal: false, source: 'local' });
    }

    // 4. Resolve External Metadata (Redis MGET + JioSaavn Fallback)
    const externalMap = {};
    const cacheKeys = externalQueries.map(q => `collection_meta:${q.source}_${q.type}_${q.id}`);
    let cachedResults = [];
    
    if (isConfigured && redis && cacheKeys.length > 0) {
      try {
        const rawCache = await redis.mget(cacheKeys);
        cachedResults = rawCache.map(r => {
          if (!r) return null;
          return typeof r === 'string' ? JSON.parse(r) : r;
        });
      } catch (err) {
        console.warn("[Redis] MGET Error in frequent collections:", err.message);
        cachedResults = new Array(cacheKeys.length).fill(null);
      }
    } else {
      cachedResults = new Array(cacheKeys.length).fill(null);
    }

    const misses = [];
    externalQueries.forEach((q, idx) => {
      if (cachedResults[idx]) {
        externalMap[q.rawId] = cachedResults[idx];
      } else {
        misses.push(q);
      }
    });

    // Fetch Cache Misses sequentially or concurrently (JioSaavn API handles concurrent okay in small batches)
    const missPromises = misses.map(async (q) => {
      try {
        let meta = null;
        if (q.type === 'album') {
          const res = await jiosaavn.getAlbum(q.id);
          if (res) meta = { title: res.title, subtitle: res.artist, artwork: res.imageUrl, isExternal: true, source: 'jiosaavn' };
        } else if (q.type === 'playlist') {
          const res = await jiosaavn.getPlaylist(q.id);
          if (res) meta = { title: res.title, subtitle: res.description || 'Playlist', artwork: res.imageUrl, isExternal: true, source: 'jiosaavn' };
        } else if (q.type === 'artist') {
          const res = await jiosaavn.getArtist(q.id, 0, 0, false);
          if (res) meta = { title: res.name, subtitle: 'Artist', artwork: res.imageUrl, isExternal: true, source: 'jiosaavn' };
        }
        
        if (meta) {
          externalMap[q.rawId] = meta;
          // Cache the miss
          if (isConfigured && redis) {
            await redis.set(`collection_meta:${q.source}_${q.type}_${q.id}`, JSON.stringify(meta), { ex: 172800 }); // 48 hours
          }
        }
      } catch (e) {
        console.warn("[FrequentCollections] External miss resolve error:", e.message);
      }
    });

    if (missPromises.length > 0) {
      await Promise.all(missPromises);
    }

    // 5. Merge and prepare canonical sorting
    const processedStats = stats.map(s => {
      const { id, type } = s._id;
      const isObjectId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
      const meta = isObjectId ? localMap[id] : externalMap[id];
      
      if (!meta) return null; // Skip if resolution failed or container was deleted

      let artwork = meta.artwork || "";
      if (artwork && !isImageValid(artwork)) artwork = "";

      return {
        id: isObjectId ? id : id.replace(/^(jiosaavn_album_|jiosaavn_playlist_|jiosaavn_artist_)/, ""), // Provide clean ID
        type,
        source: meta.source,
        isExternal: meta.isExternal,
        title: meta.title,
        subtitle: meta.subtitle,
        artwork,
        playCount: s.playCount,
        avgCompletion: s.avgCompletion || 0,
        distinctDaysCount: s.playedDays?.length || 0,
        lastPlayedAt: s.lastPlayedAt,
        tier: getCollectionTier(s, meta.title)
      };
    }).filter(Boolean);

    processedStats.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.distinctDaysCount !== b.distinctDaysCount) return b.distinctDaysCount - a.distinctDaysCount;
      if (a.avgCompletion !== b.avgCompletion) return b.avgCompletion - a.avgCompletion;
      if (a.playCount !== b.playCount) return b.playCount - a.playCount;
      return new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime();
    });

    // 6. Output canonical response
    const currentTimestamp = Date.now();
    const results = processedStats.slice(0, limit).map(item => ({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      artwork: item.artwork,
      type: item.type,
      source: item.source,
      isExternal: item.isExternal,
      playCount: item.playCount,
      lastPlayedAt: item.lastPlayedAt,
      updatedAt: currentTimestamp
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error("[FrequentCollections] Aggregation error:", error);
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

// Get Continue Listening candidates
export const getContinueListening = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch ALL recent play history for the user in the last 30 days
    const allHistory = await PlayHistory.find(getPlayableMatch({
      userId,
      playedAt: { $gte: thirtyDaysAgo },
    })).sort({ playedAt: -1 }).lean();

    // 2. Identify the most recent play strictly by songId
    const latestPlayByKey = new Map();
    for (const record of allHistory) {
      if (!latestPlayByKey.has(record.songId)) {
        latestPlayByKey.set(record.songId, record);
      }
    }

    // 3. Filter candidates: only keep those whose latest play has 10 <= completion <= 90
    const uniqueCandidates = [];
    for (const record of latestPlayByKey.values()) {
      const completion = record.completionPercentage || 0;
      if (completion >= 10 && completion <= 90) {
        uniqueCandidates.push(record);
      }
      if (uniqueCandidates.length >= 12) {
        break;
      }
    }

    // 4. Resolve metadata for the unique candidates and format to Track interface
    const results = await Promise.all(
      uniqueCandidates.map(async (record) => {
        let trackInfo = null;

        if (record.isExternal && record.externalData) {
          trackInfo = {
            id: record.songId,
            title: record.externalData.title || "Unknown Song",
            artist: record.externalData.artist || "Unknown Artist",
            artwork: record.externalData.imageUrl || "",
            duration: record.externalData.duration || 0,
            source: record.externalData.source || "jiosaavn",
            streamUrl: record.externalData.streamUrl || "",
            audioUrl: record.externalData.streamUrl || "",
            isExternal: true,
          };
        } else {
          try {
            if (mongoose.Types.ObjectId.isValid(record.songId)) {
              const song = await Song.findById(record.songId);
              if (song) {
                trackInfo = {
                  id: song._id.toString(),
                  title: song.title || "Unknown Song",
                  artist: song.artist || "Unknown Artist",
                  artwork: song.imageUrl || "",
                  duration: song.duration || 0,
                  source: "local",
                  streamUrl: song.audioUrl || song.streamUrl || "",
                  audioUrl: song.audioUrl || song.streamUrl || "",
                  isExternal: false,
                };
              }
            }
          } catch (e) {
            console.error(`[ContinueListening] Failed to fetch local song ${record.songId}:`, e);
          }
        }

        if (!trackInfo) return null;

        return {
          ...trackInfo,
          progress: record.completionPercentage || 0,
          position: record.playDuration || 0,
          updatedAt: record.playedAt || new Date()
        };
      })
    );

    // Filter out invalid items where we couldn't even load song metadata
    const filteredResults = results.filter((item) => item !== null);

    res.status(200).json(filteredResults);
  } catch (error) {
    console.error("Error fetching continue listening list:", error);
    next(error);
  }
};