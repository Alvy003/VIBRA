// controller/stream.controller.js
import { PlayHistory } from "../models/playHistory.model.js";
import { Song } from "../models/song.model.js";
import { jiosaavn, youtube } from "../lib/streamProviders.js";
import fetch from "node-fetch";
import { pipeline } from "stream/promises";
import { 
  fetchLastFmArtistTopTracks, 
  fetchLastFmSimilarTracks 
} from "../services/lastfm.service.js";
import { generatePlaylistMetadata } from "../services/groq.service.js";
import AIPlaylist from "../models/AIPlaylist.model.js";

// ============================================================================
// EXISTING ENDPOINTS (kept as-is with minor cleanup)
// ============================================================================

export const searchExternal = async (req, res) => {
  try {
    const { q, source, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ results: [] });
    }

    const query = q.trim();
    const maxResults = Math.min(parseInt(limit) || 20, 50);

    if (source === "jiosaavn") {
      const results = await jiosaavn.search(query, maxResults);
      return res.json({ results, source: "jiosaavn" });
    }

    if (source === "youtube") {
      const results = await youtube.search(query, maxResults);
      return res.json({ results, source: "youtube" });
    }

    // Search both in parallel
    const [jiosaavnResults, youtubeResults] = await Promise.allSettled([
      jiosaavn.search(query, Math.ceil(maxResults * 0.6)),
      youtube.search(query, Math.ceil(maxResults * 0.4)),
    ]);

    const results = [];
    if (jiosaavnResults.status === "fulfilled") {
      results.push(...jiosaavnResults.value);
    }
    if (youtubeResults.status === "fulfilled") {
      results.push(...youtubeResults.value);
    }

    const deduplicated = deduplicateResults(results);

    res.json({
      results: deduplicated.slice(0, maxResults),
      sources: {
        jiosaavn:
          jiosaavnResults.status === "fulfilled"
            ? jiosaavnResults.value.length
            : 0,
        youtube:
          youtubeResults.status === "fulfilled"
            ? youtubeResults.value.length
            : 0,
      },
    });
  } catch (error) {
    console.error("[Stream] Search error:", error);
    res.status(500).json({ message: "Search failed", results: [] });
  }
};

export const getStreamUrl = async (req, res) => {
  try {
    const { source, id } = req.params;

    if (source === "jiosaavn") {
      const song = await jiosaavn.getSong(id);
      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }
      if (!song.streamUrl) {
        return res.status(404).json({ message: "No stream URL available" });
      }
      return res.json({ url: song.streamUrl, expiresIn: null });
    }

    if (source === "youtube" || source === "yt") {
      const stream = await youtube.getStreamUrl(id);
      if (!stream) {
        return res.status(404).json({ message: "Stream not available" });
      }
      return res.json({
        url: stream.url,
        mimeType: stream.mimeType,
        bitrate: stream.bitrate,
        expiresIn: stream.expiresIn,
      });
    }

    res.status(400).json({ message: "Invalid source" });
  } catch (error) {
    console.error("[Stream] Stream URL error:", error);
    res.status(500).json({ message: "Failed to get stream URL" });
  }
};

/**
 * Redirect to stream URL (Used by mobile for stable tracks)
 * GET /api/stream/play/:source/:id
 */
export const redirectStream = async (req, res) => {
  try {
    const { source, id } = req.params;

    if (source === "jiosaavn") {
      const cleanId = id.replace("jiosaavn_", "");
      const song = await jiosaavn.getSong(cleanId);
      if (song && song.streamUrl) {
        // Use our robust proxy to bypass CDN blocks
        return res.redirect(`/api/stream/proxy/audio?url=${encodeURIComponent(song.streamUrl)}`);
      }
    }

    if (source === "youtube" || source === "yt") {
      const stream = await youtube.getStreamUrl(id);
      if (stream && stream.url) {
        return res.redirect(stream.url);
      }
    }

    res.status(404).json({ message: "Stream not found" });
  } catch (error) {
    console.error("[Stream] Redirect error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Redirect failed" });
    }
  }
};

export const proxyAudio = async (req, res) => {
  let controller = new AbortController();
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ message: "URL required" });
    }

    const allowedDomains = [
      "saavncdn.com",
      "jiosaavn.com",
      "saavn.com",
      "aac.saavncdn.com",
      "web.saavncdn.com",
      "c.saavncdn.com",
    ];

    const urlObj = new URL(url);
    const isAllowed = allowedDomains.some((d) => urlObj.hostname.endsWith(d));

    if (!isAllowed) {
      return res.status(403).json({ message: "Domain not allowed" });
    }

    const requestHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Referer": "https://www.jiosaavn.com/",
      "Accept": "*/*",
      "Connection": "keep-alive",
    };

    console.log(`[Proxy] Requesting: ${url}`);
    if (req.headers.range) console.log(`[Proxy] Range: ${req.headers.range}`);

    const response = await fetch(url, {
      headers: requestHeaders,
      signal: controller.signal,
    });

    console.log(`[Proxy] Upstream Status: ${response.status}`);

    if (!response.ok && response.status !== 206) {
      console.error(`[Proxy] Upstream Failure: ${response.status}`);
      return res.status(response.status).json({ message: "Upstream failure" });
    }

    // Set response headers precisely as received from upstream
    const headersToForward = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
    ];

    res.status(response.status);
    headersToForward.forEach((h) => {
      const val = response.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    // Ensure standard streaming headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!res.getHeader("Accept-Ranges")) res.setHeader("Accept-Ranges", "bytes");

    // Robust piping using pipeline (handles backpressure and errors)
    await pipeline(response.body, res);

  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error("[Proxy] Critical Stream Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: "Proxy stream failed" });
    }
  } finally {
    controller.abort();
  }
};

export const getSongDetails = async (req, res) => {
  try {
    const { source, id } = req.params;

    if (source === "jiosaavn") {
      const song = await jiosaavn.getSong(id);
      if (!song) return res.status(404).json({ message: "Song not found" });
      return res.json(song);
    }

    if (source === "youtube" || source === "yt") {
      const stream = await youtube.getStreamUrl(id);
      if (!stream) return res.status(404).json({ message: "Song not found" });
      return res.json({
        externalId: `yt_${id}`,
        source: "youtube",
        title: stream.title,
        artist: stream.artist,
        duration: stream.duration,
        imageUrl: stream.thumbnail,
        streamUrl: stream.url,
      });
    }

    res.status(400).json({ message: "Invalid source" });
  } catch (error) {
    console.error("[Stream] Song details error:", error);
    res.status(500).json({ message: "Failed to get song details" });
  }
};

export const searchExternalAlbums = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q) return res.json({ results: [] });
    const results = await jiosaavn.searchAlbums(q, parseInt(limit) || 10);
    res.json({ results });
  } catch (error) {
    console.error("[Stream] Album search error:", error);
    res.json({ results: [] });
  }
};

export const getExternalAlbum = async (req, res) => {
  try {
    const { source, id } = req.params;

    if (source === "jiosaavn") {
      const album = await jiosaavn.getAlbum(id);
      if (!album) return res.status(404).json({ message: "Album not found" });
      return res.json(album);
    }

    res
      .status(400)
      .json({ message: "Album details only supported for JioSaavn" });
  } catch (error) {
    console.error("[Stream] Album details error:", error);
    res.status(500).json({ message: "Failed to get album" });
  }
};

// ============================================================================
// NEW ENDPOINTS
// ============================================================================

/**
 * Unified search: returns songs + albums + playlists + artists
 * GET /api/stream/search/all?q=xxx&limit=10
 */
export const searchAll = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({
        songs: [],
        albums: [],
        playlists: [],
        artists: [],
      });
    }

    const query = q.trim();
    const songLimit = Math.min(parseInt(limit) || 10, 25);
    const otherLimit = Math.min(parseInt(limit) || 6, 10);

    // console.log(`[Stream] Unified search: "${query}"`);

    // Search all categories in parallel
    const [songs, albums, playlists, artists] = await Promise.allSettled([
      jiosaavn.search(query, songLimit),
      jiosaavn.searchAlbums(query, otherLimit),
      jiosaavn.searchPlaylists(query, otherLimit),
      jiosaavn.searchArtists(query, otherLimit),
    ]);

    const result = {
      songs: songs.status === "fulfilled" ? songs.value : [],
      albums: albums.status === "fulfilled" ? albums.value : [],
      playlists: playlists.status === "fulfilled" ? playlists.value : [],
      artists: artists.status === "fulfilled" ? artists.value : [],
    };

    // console.log(
    //   `[Stream] Unified search results: ${result.songs.length} songs, ${result.albums.length} albums, ${result.playlists.length} playlists, ${result.artists.length} artists`
    // );

    res.json(result);
  } catch (error) {
    console.error("[Stream] Search all error:", error);
    res.json({ songs: [], albums: [], playlists: [], artists: [] });
  }
};

/**
 * Get recommendations for a song
 * GET /api/stream/recommendations/:source/:id?limit=20
 */
export const getRecommendations = async (req, res) => {
  try {
    const { source, id } = req.params;
    const { limit = 20 } = req.query;

    // console.log(`[Stream] Getting recommendations: source=${source}, id=${id}`);

if (source === "jiosaavn") {
      // Get language preferences from query params
      const languages = req.query.languages || "hindi,english";
      // console.log(`[Stream] Getting jiosaavn recommendations for ${id} (langs: ${languages})`);

      const results = await jiosaavn.getRecommendations(
        id,
        parseInt(limit) * 2,
        languages
      );
      
      // *** DEDUPLICATE HERE ***
      const deduplicated = deduplicateSongs(results, 90);
      
      console.log(`[Stream] JioSaavn Recs: Found ${results.length} raw, ${deduplicated.length} after dedup`);
      
      return res.json({ 
        results: deduplicated.slice(0, parseInt(limit)) 
      });
    }

    // YouTube fallback...
    if (source === "youtube" || source === "yt") {
      try {
        const details = await youtube.getStreamUrl(id);
        if (details) {
          const query = `${details.artist} similar songs`;
          const results = await youtube.search(query, parseInt(limit) * 2);
          
          const filtered = results.filter(r => !r.externalId?.includes(id));
          const deduplicated = deduplicateSongs(filtered, 90);
          
          return res.json({ 
            results: deduplicated.slice(0, parseInt(limit)) 
          });
        }
      } catch (err) {
        console.error("[Stream] YouTube recommendations error:", err);
      }
    }

    res.json({ results: [] });
  } catch (error) {
    console.error("[Stream] Recommendations error:", error);
    res.json({ results: [] });
  }
};

/**
 * Get playlist details
 * GET /api/stream/playlists/:source/:id
 */
export const getExternalPlaylist = async (req, res) => {
  try {
    const { source, id } = req.params;

    if (source === "jiosaavn") {
      const playlist = await jiosaavn.getPlaylist(id);
      if (!playlist)
        return res.status(404).json({ message: "Playlist not found" });
      return res.json(playlist);
    }

    res
      .status(400)
      .json({ message: "Playlists only supported for JioSaavn" });
  } catch (error) {
    console.error("[Stream] Playlist error:", error);
    res.status(500).json({ message: "Failed to get playlist" });
  }
};

/**
 * Get artist details with top songs and albums
 * GET /api/stream/artists/:source/:id
 */
export const getExternalArtist = async (req, res) => {
  try {
    const { source, id } = req.params;

    if (source === "jiosaavn") {
      const artist = await jiosaavn.getArtist(id);
      if (!artist)
        return res.status(404).json({ message: "Artist not found" });
      return res.json(artist);
    }

    res
      .status(400)
      .json({ message: "Artist details only supported for JioSaavn" });
  } catch (error) {
    console.error("[Stream] Artist error:", error);
    res.status(500).json({ message: "Failed to get artist" });
  }
};

/**
 * Get homepage discovery data (trending, new releases, charts, playlists)
 * GET /api/stream/home
 */

// In-memory cache for homepage data (keyed by language)
const homepageCache = new Map();
const HOMEPAGE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const getHomepageData = async (req, res) => {
  try {
    const { languages } = req.query;
    const langKey = languages || "hindi,english";

    // Check cache first
    const cached = homepageCache.get(langKey);
    if (cached && Date.now() - cached.time < HOMEPAGE_CACHE_TTL) {
     // console.log(`[Stream] Homepage cache hit for: ${langKey}`);
      return res.json(cached.data);
    }

    // console.log(`[Stream] Fetching homepage for languages: ${langKey}`);

    // Use search-based approach for accurate language results
    const data = await jiosaavn.getHomepageBySearch(langKey);

    if (data) {
      homepageCache.set(langKey, { data, time: Date.now() });

      // Clean up old cache entries (keep max 10 language combos)
      if (homepageCache.size > 10) {
        const oldest = [...homepageCache.entries()]
          .sort((a, b) => a[1].time - b[1].time)[0];
        if (oldest) homepageCache.delete(oldest[0]);
      }
    }

    res.json(
      data || {
        newAlbums: [],
        topPlaylists: [],
        charts: [],
        trending: [],
      }
    );
  } catch (error) {
    console.error("[Stream] Homepage error:", error);
    res.json({
      newAlbums: [],
      topPlaylists: [],
      charts: [],
      trending: [],
    });
  }
};

/**
 * Get Quick Picks (weighted by play count and completion)
 * GET /api/stream/quick-picks
 */
export const getQuickPicks = async (req, res) => {
  try {
    const userId = req.auth.userId;

    // 1. Aggregate play history to find top tracks
    // Score = (PlayCount * 2) + (AvgCompletion * 1.5)
    const stats = await PlayHistory.aggregate([
      { $match: { userId: userId.toString() } },
      {
        $group: {
          _id: "$songId",
          playCount: { $sum: 1 },
          avgCompletion: { $avg: "$completionPercentage" },
          lastPlayed: { $max: "$playedAt" },
          isExternal: { $first: "$isExternal" },
          externalData: { $first: "$externalData" },
        },
      },
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ["$playCount", 2] },
              { $multiply: [{ $divide: ["$avgCompletion", 10] }, 1.5] },
            ],
          },
        },
      },
      { $sort: { score: -1 } },
      { $limit: 20 },
    ]);

    if (!stats || stats.length === 0) {
      // Fallback: If no history, return trending from JioSaavn
      const languages = req.query.languages || "hindi,english";
      const homepage = await jiosaavn.getHomepageBySearch(languages);
      return res.json(homepage?.trending?.slice(0, 8) || []);
    }

    // 2. Map to song format
    const results = stats.map((s) => ({
      _id: s._id,
      title: s.externalData?.title || "Unknown",
      artist: s.externalData?.artist || "Unknown",
      imageUrl: s.externalData?.imageUrl || "",
      duration: s.externalData?.duration || 0,
      externalId: s.externalData?.externalId || s._id,
      source: s.externalData?.source || "jiosaavn",
      playCount: s.playCount,
      score: s.score,
    }));

    // 3. Shuffle slightly to keep it fresh
    const shuffled = results.sort(() => Math.random() - 0.5);

    res.json(shuffled.slice(0, 8));
  } catch (error) {
    console.error("[Stream] Quick picks error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get Daily Mix (personalized recommendations based on history)
 * GET /api/stream/daily-mix
 */
export const getDailyMix = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { languages = "hindi,english", limit = 20 } = req.query;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Check for existing mix in DB
    const existingMix = await AIPlaylist.findOne({
      userId,
      "metadata.discoveryType": "daily",
      createdAt: { $gte: todayStart }
    }).lean();

    if (existingMix) {
      // Return cached mix
      // console.log(`[Stream] Daily Mix cache hit from DB for user: ${userId}`);
      return res.json({
        title: existingMix.name,
        description: existingMix.description,
        results: existingMix.tracks,
        isPersonalized: existingMix.metadata.aiGenerated || false,
        source: 'database',
        id: existingMix._id
      });
    }

    // 2. Generate New Mix (Previous logic)
    const today = new Date().toISOString().split('T')[0];
    const seed = `${userId}_${today}`;

    // Get recent high-completion tracks
    let seeds = await PlayHistory.find({ 
      userId, 
      completionPercentage: { $gte: 50 }
    })
      .sort({ playedAt: -1 })
      .limit(6)
      .lean();

    if (!seeds || seeds.length === 0) {
      seeds = await PlayHistory.find({ userId })
        .sort({ playedAt: -1 })
        .limit(6)
        .lean();
    }

    let results = [];
    let isPersonalized = false;

    if (seeds && seeds.length > 0) {
      const recommendationTasks = seeds.map(play => {
        const source = play.externalData?.source || "jiosaavn";
        const id = play.externalData?.externalId?.replace("jiosaavn_", "") || play.songId;
        
        if (source === "jiosaavn") {
          return jiosaavn.getRecommendations(id, 10, languages);
        }
        return Promise.resolve([]);
      });

      const taskResults = await Promise.allSettled(recommendationTasks);
      let allRecs = [];
      taskResults.forEach(r => {
        if (r.status === "fulfilled") allRecs.push(...r.value);
      });

      const uniqueRecs = deduplicateSongs(allRecs, 90);
      results = uniqueRecs;
      isPersonalized = results.length > 0;
    }

    const shuffledRaw = seededShuffle(results, seed);
    
    // 2.5 Resolve and Verify Tracks (Ensures no 404s)
    const verifiedTracks = await resolveDiscoveryTracks(shuffledRaw, parseInt(limit));
    results = verifiedTracks;
    isPersonalized = results.length > 0;

    // 3. Persist to DB for the rest of the day
    const newMix = new AIPlaylist({
      name: "Daily Mix",
      description: isPersonalized 
        ? "A personalized mix based on your recent activity" 
        : "Trending hits tailored for you",
      userId,
      vibe: 'any',
      language: 'multi',
      era: 'mixed',
      size: results.length,
      tracks: results.map(s => ({
        externalId: s.externalId || s.id,
        title: s.title,
        artist: s.artist,
        imageUrl: s.imageUrl,
        streamUrl: s.streamUrl || null,
        duration: s.duration || 0,
        source: s.source || 'jiosaavn',
        album: s.album || ''
      })),
      metadata: {
        discoveryType: "daily",
        aiGenerated: isPersonalized,
        generatedAt: new Date()
      },
      expiresAt: new Date(new Date().setHours(23, 59, 59, 999)) // Reset at Midnight
    });

    await newMix.save();

    res.json({
      title: newMix.name,
      description: newMix.description,
      results: newMix.tracks,
      isPersonalized,
      source: 'generated',
      id: newMix._id
    });
  } catch (error) {
    console.error("[Stream] Daily Mix error:", error);
    res.json({ results: [], isPersonalized: false });
  }
};

/**
 * Autocomplete suggestions
 * GET /api/stream/autocomplete?q=xxx
 */
export const getAutocomplete = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await jiosaavn.autocomplete(q.trim());
    res.json({ suggestions });
  } catch (error) {
    console.error("[Stream] Autocomplete error:", error);
    res.json({ suggestions: [] });
  }
};

// ============================================================================
// STABILITY & SEEDING HELPERS
// ============================================================================

function getSeededRandom(seed) {
  let h = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  
  return function() {
    h = (Math.imul(48271, h) & 2147483647);
    return (h - 1) / 2147483646;
  };
}

function seededShuffle(array, seed) {
  if (!array || !Array.isArray(array)) return [];
  const rng = getSeededRandom(seed);
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// SMART DEDUPLICATION HELPERS
// ============================================================================

/**
 * Normalize song title for comparison
 * Removes brackets, parentheses, featured artists, etc.
 */
function normalizeSongTitle(title) {
  if (!title) return "";
  
  return title
    .toLowerCase()
    // Remove content in parentheses and brackets
    .replace(/\s*[\(\[].+?[\)\]]\s*/g, " ")
    // Remove common suffixes
    .replace(/\s*-\s*(remaster|remix|reprise|version|edit|acoustic|live|radio|edit)\s*$/gi, "")
    // Remove featured artists
    .replace(/\s*feat\.?.+$/gi, "")
    .replace(/\s*ft\.?.+$/gi, "")
    .replace(/\s*featuring.+$/gi, "")
    // Remove special chars
    .replace(/[^\w\s]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize artist name (handle multiple artists, remove "Various Artists", etc.)
 */
function normalizeArtistName(artist) {
  if (!artist) return "";
  
  return artist
    .toLowerCase()
    .split(/[,&\/]/)
    .map(a => a.trim())
    .filter(a => !["various artists", "various", "unknown"].includes(a))
    [0] || artist.toLowerCase(); // Take first non-various artist
}

/**
 * Calculate similarity score between two songs (0-100)
 */
function calculateSongSimilarity(song1, song2) {
  const title1 = normalizeForDedup(song1.title);
  const title2 = normalizeForDedup(song2.title);
  const artist1 = normalizeForDedup(song1.artist);
  const artist2 = normalizeForDedup(song2.artist);
  
  // Exact title + artist match = duplicate
  if (title1 === title2 && artist1 === artist2) {
    return 100;
  }
  
  // Check if one title contains the other (e.g., "Song" vs "Song (From Film)")
  const titleContains = title1.includes(title2) || title2.includes(title1);
  const artistMatch = artist1 === artist2;
  
  if (titleContains && artistMatch) {
    return 95; // Very likely duplicate
  }
  
  // Duration-based check (within 5 seconds = likely same song)
  const duration1 = song1.duration || 0;
  const duration2 = song2.duration || 0;
  const durationDiff = Math.abs(duration1 - duration2);
  
  if (titleContains && durationDiff <= 5) {
    return 90; // Likely duplicate with different artist credit
  }
  
  return 0; // Not a duplicate
}

/**
 * Remove duplicate songs intelligently
 */
function deduplicateSongs(songs, threshold = 90) {
  if (!Array.isArray(songs) || songs.length === 0) return [];
  
  const unique = [];
  const seen = new Map(); // title_artist -> song
  
  for (const song of songs) {
    const key = `${normalizeForDedup(song.title)}_${normalizeForDedup(song.artist)}`;
    
    // Check exact key match
    if (seen.has(key)) {
      const existing = seen.get(key);
      
      // Prefer songs with:
      // 1. Higher play count
      // 2. Better image quality
      // 3. Verified stream URL
      const shouldReplace =
        (song.playCount || 0) > (existing.playCount || 0) ||
        (song.imageUrl && !existing.imageUrl) ||
        (song.streamUrl && !existing.streamUrl);
      
      if (shouldReplace) {
        // Replace existing with better quality version
        const idx = unique.findIndex(s => s.externalId === existing.externalId);
        if (idx !== -1) {
          unique[idx] = song;
          seen.set(key, song);
        }
      }
      continue;
    }
    
    // Check similarity with existing songs
    let isDuplicate = false;
    for (const existingSong of unique) {
      const similarity = calculateSongSimilarity(song, existingSong);
      if (similarity >= threshold) {
        isDuplicate = true;
        
        // If current song is better quality, replace
        if ((song.playCount || 0) > (existingSong.playCount || 0)) {
          const idx = unique.findIndex(s => s.externalId === existingSong.externalId);
          if (idx !== -1) {
            unique[idx] = song;
            seen.set(key, song);
          }
        }
        break;
      }
    }
    
    if (!isDuplicate) {
      unique.push(song);
      seen.set(key, song);
    }
  }
  
  return unique;
}

// ============================================================================
// HELPERS
// ============================================================================

function deduplicateResults(results) {
  const seen = new Map();

  return results.filter((item) => {
    const key =
      normalizeForDedup(item.title) + "||" + normalizeForDedup(item.artist);

    if (seen.has(key)) {
      const existing = seen.get(key);
      if (item.source === "jiosaavn" && existing.source === "youtube") {
        seen.set(key, item);
        return true;
      }
      return false;
    }

    seen.set(key, item);
    return true;
  });
}

function normalizeForDedup(str) {
  return (str || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Helper to resolve raw metadata (from Last.fm or other) into valid streaming tracks
 */
async function resolveDiscoveryTracks(rawTracks, limit = 25) {
  const verifiedTracks = [];
  const processedIds = new Set();

  // Process in chunks to avoid overwhelming APIs and maintain speed
  const chunkSize = 6;
  for (let i = 0; i < rawTracks.length && verifiedTracks.length < limit; i += chunkSize) {
    const chunk = rawTracks.slice(i, i + chunkSize);
    
    const resolvedChunk = await Promise.all(chunk.map(async (track, index) => {
      try {
        const query = `${track.title} ${track.artist}`;
        
        // Force resolution to get the latest 'streamUrl' and 'duration'
        const songId = track.externalId?.replace("jiosaavn_", "") || track.id;
        if (songId) {
          const detailed = await jiosaavn.getSong(songId);
          if (detailed && detailed.streamUrl) {
            return { ...detailed, source: 'jiosaavn' };
          }
        }

        // 2. Search JioSaavn
        const jioResults = await jiosaavn.search(query, 1);
        if (jioResults && jioResults.length > 0) {
          // IMPORTANT: Full detail fetch to get real 'duration' (Search doesn't provide it)
          const detailed = await jiosaavn.getSong(jioResults[0].id || jioResults[0].externalId?.replace("jiosaavn_", ""));
          if (detailed) {
            const matched = { ...detailed, source: 'jiosaavn' };
            return matched;
          }
        }

        // 3. Skip if not on JioSaavn (User requested no YT fallback)
        return null;
      } catch (err) {
        return null;
      }
    }));

    for (const track of resolvedChunk) {
      if (track && track.externalId && !processedIds.has(track.externalId)) {
        verifiedTracks.push(track);
        processedIds.add(track.externalId);
        if (verifiedTracks.length >= limit) break;
      }
    }
  }

  return verifiedTracks;
}

/**
 * Get Weekly Mix (Weekend Vibe)
 * GET /api/stream/weekly-mix
 */
export const getWeeklyMix = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    // 1. Calculate stats for the last 7 days
    const stats = await PlayHistory.aggregate([
      { 
        $match: { 
          userId: userId.toString(),
          playedAt: { $gte: startOfWeek }
        } 
      },
      {
        $group: {
          _id: null,
          totalSongs: { $sum: 1 },
          totalDuration: { 
            $sum: { 
              $multiply: [
                { $ifNull: ["$duration", 0] }, 
                { $divide: [{ $ifNull: ["$completionPercentage", 0] }, 100] }
              ] 
            } 
          },
          topArtists: { $push: "$externalData.artist" },
          topTracks: { $push: { title: "$externalData.title", artist: "$externalData.artist" } }
        }
      }
    ]);

    if (!stats || stats.length === 0 || !stats[0]) {
      return res.json({ eligible: false, progress: { count: 0, minutes: 0 } });
    }

    const data = stats[0];
    const totalSongs = data.totalSongs || 0;
    const totalDuration = data.totalDuration || 0;
    const topArtists = (data.topArtists || []).filter(Boolean);
    const topTracks = (data.topTracks || []).filter(t => t && t.title);
    const totalMinutes = Math.floor(totalDuration / 60);

    // 2. Eligibility Check: 20 songs OR 60 minutes
    const isEligible = totalSongs >= 20 || totalMinutes >= 60;

    if (!isEligible) {
      return res.json({ 
        eligible: false, 
        progress: { count: totalSongs, minutes: totalMinutes },
        requirements: { count: 20, minutes: 60 }
      });
    }

    // 3. Extract Top artists and a seed track
    const artistCounts = {};
    topArtists.forEach(a => { if(a) artistCounts[a] = (artistCounts[a] || 0) + 1; });
    const sortedArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const top3 = sortedArtists.slice(0, 3);

    // 4. Discovery (Hybrid: Last.fm + JioSaavn for Regional)
    let discoverySongs = [];
    
    // a. Similar to top track (Primary: JioSaavn for Indian, fallback: Last.fm)
    if (topTracks.length > 0) {
      const topTrack = topTracks[0];
      try {
        const historyDoc = await PlayHistory.findOne({ 
          userId: userId.toString(), 
          "externalData.title": topTrack.title 
        }).sort({ playedAt: -1 });

        if (historyDoc?.externalData?.source === "jiosaavn") {
          const rawId = historyDoc.externalData.externalId?.replace("jiosaavn_", "");
          if (rawId) {
            const jiosaavnRecs = await jiosaavn.getRecommendations(rawId, 15);
            if (Array.isArray(jiosaavnRecs)) discoverySongs.push(...jiosaavnRecs);
          }
        }
      } catch (err) {
        console.error("[Stream] JioSaavn recommendation fallback error:", err);
      }

      if (topTrack.artist && topTrack.title && discoverySongs.length < 5) {
        try {
          const similar = await fetchLastFmSimilarTracks(topTrack.artist, topTrack.title, 15);
          if (Array.isArray(similar)) discoverySongs.push(...similar);
        } catch (err) {
          console.error("[Stream] Last.fm similar error:", err);
        }
      }
    }

    // b. Top tracks from top artists
    for (const artist of top3) {
      if (discoverySongs.length > 40) break;
      try {
        const artistTop = await fetchLastFmArtistTopTracks(artist, 10);
        if (Array.isArray(artistTop)) discoverySongs.push(...artistTop);
      } catch (err) {
        console.error("[Stream] Last.fm artist top error:", err);
      }
    }

    // 5. AI Metadata (Name and Description)
    // 5. Seeded Shuffle to ensure stability for the week
    const now = new Date();
    const weekNum = Math.ceil((now.getDate() + 6 - now.getDay()) / 7);
    const weekSeed = `${userId}_${now.getFullYear()}_W${weekNum}`;

    // ─── NEW: Check for existing weekly mix in DB ───
    const existingWeekly = await AIPlaylist.findOne({
      userId,
      "metadata.discoveryType": "weekly",
      "metadata.weekSeed": weekSeed
    }).lean();

    if (existingWeekly) {
      return res.json({
        eligible: true,
        metadata: {
          name: existingWeekly.name,
          description: existingWeekly.description,
          id: existingWeekly._id
        },
        results: existingWeekly.tracks,
        seed: weekSeed,
        source: 'database'
      });
    }
    
    // 3. Prepare for resolution

    const uniqueSongs = deduplicateSongs(discoverySongs);
    const shuffledRaw = seededShuffle(uniqueSongs, weekSeed);

    // 4. Resolve and Verify Tracks (The "No-Hacks" Fix for 404s)
    const verifiedTracks = await resolveDiscoveryTracks(shuffledRaw, 30);
    const shuffled = verifiedTracks;

    // 5. AI Metadata (Name and Description)
    const aiParams = {
      vibe: "weekly-recap",
      language: req.query.languages || "multi",
      era: "mix",
      moodKeywords: top3
    };

    let metadata = { 
      name: `Your Weekly Recap ⚡`, 
      description: `A personalized mix based on your last 7 days of listening.` 
    };

    try {
      const aiMeta = await generatePlaylistMetadata(aiParams, topTracks.slice(0, 5));
      if (aiMeta && aiMeta.name) {
         metadata.name = `${aiMeta.name}`;
         metadata.description = aiMeta.description || metadata.description;
      }
    } catch (err) {
      console.error("[Stream] Weekly Mix AI Metadata failed:", err);
    }

    // Expiration: Next Sunday at Midnight
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (7 - expiresAt.getDay()) % 7);
    expiresAt.setHours(23, 59, 59, 999);

    const newWeekly = new AIPlaylist({
      name: metadata.name,
      description: metadata.description,
      userId,
      vibe: 'imported', 
      language: 'multi',
      era: 'mixed',
      size: shuffled.length,
      tracks: shuffled.map(s => ({
        externalId: s.externalId || s.id,
        title: s.title,
        artist: s.artist,
        imageUrl: s.imageUrl,
        streamUrl: s.streamUrl || null,
        duration: s.duration || 0,
        source: s.source || 'jiosaavn',
        album: s.album || ''
      })),
      metadata: {
        discoveryType: "weekly",
        weekSeed: weekSeed,
        aiGenerated: true,
        generatedAt: new Date()
      },
      expiresAt
    });

    await newWeekly.save();

    res.json({
      eligible: true,
      metadata,
      results: newWeekly.tracks,
      seed: weekSeed,
      source: 'generated',
      id: newWeekly._id
    });

  } catch (error) {
    console.error("[Stream] Weekly Mix critical failure:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};