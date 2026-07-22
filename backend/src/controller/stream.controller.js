// controller/stream.controller.js
import { PlayHistory } from "../models/playHistory.model.js";
import { Song } from "../models/song.model.js";
import { FEATURES, getPlayableMatch } from "../config/features.js";
import { jiosaavn, youtube } from "../lib/streamProviders.js";
import fetch from "node-fetch";
import { pipeline } from "stream/promises";
import {
  fetchLastFmArtistTopTracks,
  fetchLastFmSimilarTracks
} from "../services/lastfm.service.js";
import { generatePlaylistMetadata } from "../services/groq.service.js";
import AIPlaylist from "../models/AIPlaylist.model.js";
import { User } from "../models/user.model.js";
import { SavedItem } from "../models/savedItem.model.js";
import { getCache, setCache, normalizeQueryKey } from "../lib/cacheService.js";


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
    const { bitrate } = req.query;

    const allowedBitrates = ["320", "160", "96", "48"];
    const validatedBitrate = allowedBitrates.includes(bitrate) ? bitrate : "320";

    if (source === "jiosaavn") {
      const song = await jiosaavn.getSong(id, validatedBitrate);
      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }
      if (!song.streamUrl) {
        return res.status(404).json({ message: "No stream URL available" });
      }

      const isFallback = song.streamResolvedBitrate && song.streamResolvedBitrate !== validatedBitrate;
      // console.log(`\n[Stream]\nSong: ${song.title}\nRequested: ${validatedBitrate}\nResolved: ${song.streamResolvedBitrate || "unknown"}\nCache: ${song.streamCache}${isFallback ? " (Fallback Used)" : ""}\n`);

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
    const { bitrate } = req.query;

    const allowedBitrates = ["320", "160", "96", "48"];
    const validatedBitrate = allowedBitrates.includes(bitrate) ? bitrate : "320";

    if (source === "jiosaavn") {
      const cleanId = id.replace("jiosaavn_", "");
      const song = await jiosaavn.getSong(cleanId, validatedBitrate);
      if (song && song.streamUrl) {
        const isFallback = song.streamResolvedBitrate && song.streamResolvedBitrate !== validatedBitrate;
        // console.log(`\n[Stream]\nSong: ${song.title}\nRequested: ${validatedBitrate}\nResolved: ${song.streamResolvedBitrate || "unknown"}\nCache: ${song.streamCache}${isFallback ? " (Fallback Used)" : ""}\n`);

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

    // console.log(`[Proxy] Requesting: ${url}`);
    if (req.headers.range) console.log(`[Proxy] Range: ${req.headers.range}`);

    const response = await fetch(url, {
      headers: requestHeaders,
      signal: controller.signal,
    });

    // console.log(`[Proxy] Upstream Status: ${response.status}`);

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
      const cacheKey = `album:v1:${id}`;

      let cachedData = null;
      try {
        cachedData = await getCache(cacheKey);
      } catch (err) {
        console.warn(`[Cache Fallback] album: ${id} (Redis read error, falling back to live fetch)`);
      }

      if (cachedData) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Album Cache HIT] album: ${id}`);
        }
        return res.json(cachedData);
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`[Album Cache MISS] album: ${id}`);
      }

      const album = await jiosaavn.getAlbum(id);
      if (!album) return res.status(404).json({ message: "Album not found" });

      try {
        const cacheObject = {
          ...album,
          version: 1,
          cachedAt: new Date().toISOString()
        };
        // TTL is 30 days = 2592000 seconds
        await setCache(cacheKey, cacheObject, 2592000);
      } catch (err) {
        console.warn(`[Cache Fallback] album: ${id} (Redis write error, failed to write cache)`);
      }

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

    const normalizedQuery = normalizeQueryKey(query);
    const cacheKey = `vibra:search:${normalizedQuery}:${songLimit}`;

    let cachedData = null;
    try {
      cachedData = await getCache(cacheKey);
    } catch (err) {
      console.warn(`[Cache Fallback] search: "${query}" (Redis read error, falling back to live fetch)`);
    }

    if (cachedData) {
      // console.log(`[Cache Hit] search: "${query}" (limit: ${songLimit})`);
      return res.json(cachedData);
    }

    // console.log(`[Cache Miss] search: "${query}" (limit: ${songLimit})`);

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

    try {
      // TTL is 5 minutes = 300 seconds
      await setCache(cacheKey, result, 300);
    } catch (err) {
      console.warn(`[Cache Fallback] search: "${query}" (Redis write error, failed to write cache)`);
    }

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
      const languages = req.query.languages || "hindi,english";
      // Normalize language order
      const langArray = languages.split(",").map(l => l.trim().toLowerCase());
      langArray.sort();
      const normalizedLanguages = langArray.join(",");

      const cacheKey = `recommendation:v1:jiosaavn:${id}:${normalizedLanguages}`;

      let cachedData = null;
      try {
        cachedData = await getCache(cacheKey);
      } catch (err) {
        console.warn(`[Cache Fallback] jiosaavn recommendations: ${id} (Redis read error, falling back to live fetch)`);
      }

      if (cachedData) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Cache Hit] jiosaavn recommendations endpoint: ${id}:${normalizedLanguages}`);
        }
        return res.json({ results: cachedData.slice(0, parseInt(limit)) });
      }
      if (process.env.NODE_ENV === "development") {
        console.log(`[Cache Miss] jiosaavn recommendations endpoint: ${id}:${normalizedLanguages}`);
      }

      const results = await jiosaavn.getRecommendations(
        id,
        parseInt(limit) * 2,
        languages
      );

      // *** DEDUPLICATE HERE ***
      const deduplicated = deduplicateSongs(results, 90);

      const finalTracks = deduplicated.map(song => {
        const rawId = song.externalId || song._id || song.id;
        const cleanId = String(rawId).replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/, "");
        const redirectUrl = `/api/stream/play/jiosaavn/${cleanId}`;
        return {
          ...song,
          streamUrl: redirectUrl,
          audioUrl: redirectUrl,
        };
      });

      try {
        // Cache results for 36 hours (129600 seconds)
        await setCache(cacheKey, finalTracks, 129600);
      } catch (err) {
        console.warn(`[Cache Fallback] jiosaavn recommendations: ${id} (Redis write error, failed to write cache)`);
      }

      return res.json({
        results: finalTracks.slice(0, parseInt(limit))
      });
    }

    // YouTube fallback...
    if (source === "youtube" || source === "yt") {
      const cacheKey = `recommendation:v1:youtube:${id}`;

      let cachedData = null;
      try {
        cachedData = await getCache(cacheKey);
      } catch (err) {
        console.warn(`[Cache Fallback] youtube recommendations: ${id} (Redis read error, falling back to live fetch)`);
      }

      if (cachedData) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Cache Hit] youtube recommendations endpoint: ${id}`);
        }
        return res.json({ results: cachedData.slice(0, parseInt(limit)) });
      }
      if (process.env.NODE_ENV === "development") {
        console.log(`[Cache Miss] youtube recommendations endpoint: ${id}`);
      }

      try {
        const details = await youtube.getStreamUrl(id);
        if (details) {
          const query = `${details.artist} similar songs`;
          const results = await youtube.search(query, parseInt(limit) * 2);

          const filtered = results.filter(r => !r.externalId?.includes(id));
          const deduplicated = deduplicateSongs(filtered, 90);

          const finalTracks = deduplicated.map(song => {
            const rawId = song.externalId || song._id || song.id;
            const cleanId = String(rawId).replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/, "");
            const redirectUrl = `/api/stream/play/youtube/${cleanId}`;
            return {
              ...song,
              streamUrl: redirectUrl,
              audioUrl: redirectUrl,
            };
          });

          try {
            // Cache results for 36 hours (129600 seconds)
            await setCache(cacheKey, finalTracks, 129600);
          } catch (err) {
            console.warn(`[Cache Fallback] youtube recommendations: ${id} (Redis write error, failed to write cache)`);
          }

          return res.json({
            results: finalTracks.slice(0, parseInt(limit))
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
      const metadataCacheKey = `artist:v1:${id}`;
      const topSongsCacheKey = `artist-top-songs:v1:${id}`;

      let cachedMetadata = null;
      let cachedTopSongs = null;

      try {
        cachedMetadata = await getCache(metadataCacheKey);
        cachedTopSongs = await getCache(topSongsCacheKey);
      } catch (err) {
        console.warn(`[Cache Fallback] artist details: "${id}" (Redis read error, falling back to live fetch)`);
      }

      if (cachedMetadata && cachedTopSongs) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Artist Cache HIT] artist: "${id}"`);
          console.log(`[Artist Top Songs Cache HIT] artist-top-songs: "${id}"`);
        }
        return res.json({
          ...cachedMetadata,
          topSongs: cachedTopSongs
        });
      }

      if (process.env.NODE_ENV === "development") {
        if (!cachedMetadata) {
          console.log(`[Artist Cache MISS] artist: "${id}"`);
        }
        if (!cachedTopSongs) {
          console.log(`[Artist Top Songs Cache MISS] artist-top-songs: "${id}"`);
        }
      }

      const artist = await jiosaavn.getArtist(id);
      if (!artist) {
        return res.status(404).json({ message: "Artist not found" });
      }

      const { topSongs, ...metadata } = artist;

      try {
        const cacheArtistObject = {
          ...metadata,
          version: 1,
          cachedAt: new Date().toISOString()
        };
        // TTL is 30 days = 2592000 seconds
        await setCache(metadataCacheKey, cacheArtistObject, 2592000);
        await setCache(topSongsCacheKey, topSongs || [], 2592000);
      } catch (err) {
        console.warn(`[Cache Fallback] artist details: "${id}" (Redis write error, failed to write cache)`);
      }

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
export const getHomepageData = async (req, res) => {
  try {
    const { languages, refresh } = req.query;
    const langKey = languages || "hindi,english";
    const cacheKey = `vibra:homepage:${langKey}`;
    const forceRefresh = refresh === "true";

    let cachedData = null;
    if (!forceRefresh) {
      try {
        cachedData = await getCache(cacheKey);
      } catch (err) {
        console.warn(`[Cache Fallback] homepage: ${langKey} (Redis read error, falling back to live fetch)`);
      }
    }

    if (cachedData) {
      // console.log(`[Cache Hit] homepage: ${langKey}`);
      return res.json(cachedData);
    }

    // console.log(`[Cache Miss] homepage: ${langKey}${forceRefresh ? " (force refresh)" : ""}`);

    // Use official launch data with correct language cookies to get genuine, high-quality homepage
    const data = await jiosaavn.getHomepage(langKey);

    const homepageResponse = data || {
      newAlbums: [],
      topPlaylists: [],
      charts: [],
      trending: [],
    };

    if (data) {
      try {
        // TTL is 30 hours = 108000 seconds
        await setCache(cacheKey, homepageResponse, 108000);
      } catch (err) {
        console.warn(`[Cache Fallback] homepage: ${langKey} (Redis write error, failed to write cache)`);
      }
    }

    res.json(homepageResponse);
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
    const cacheKey = `vibra:quick-picks:${userId}`;
    let cachedResults = null;
    try {
      cachedResults = await getCache(cacheKey);
    } catch (err) {
      console.warn(`[Cache Fallback] quick-picks: ${userId} (Redis read error)`);
    }

    let results = cachedResults;

    if (!results) {
      // 1. Aggregate play history to find top tracks
      // Score = (PlayCount * 2) + (AvgCompletion * 1.5)
      const stats = await PlayHistory.aggregate([
        { $match: getPlayableMatch({ userId: userId.toString() }) },
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
        { $limit: 40 },
        {
          $lookup: {
            from: "songs",
            let: { idStr: "$_id" },
            pipeline: [
              { 
                $match: { 
                  $expr: { 
                    $and: [
                      { $eq: [{ $type: "$$idStr" }, "string"] },
                      { $eq: [{ $strLenCP: "$$idStr" }, 24] },
                      { $eq: [{ $toString: "$_id" }, "$$idStr"] }
                    ]
                  }
                }
              },
              { $project: { title: 1, artist: 1, imageUrl: 1, duration: 1 } }
            ],
            as: "localSong"
          }
        }
      ]);

      if (!stats || stats.length === 0) {
        // Fallback: If no history, return a rich mix of trending, viral, and editor's picks
        const languages = req.query.languages || "hindi,english";
        const homepage = await jiosaavn.getHomepageBySearch(languages);
        
        const fallbackMix = [];
        if (homepage?.trending) fallbackMix.push(...homepage.trending.slice(0, 5));
        
        if (homepage?.charts && homepage.charts.length > 0) {
            const topChart = homepage.charts[0];
            if (topChart && topChart.id) {
                try {
                    const chartData = await jiosaavn.getPlaylist(topChart.id);
                    if (chartData?.tracks) fallbackMix.push(...chartData.tracks.slice(0, 4));
                } catch(e) {}
            }
        }
        
        if (homepage?.new_trending) fallbackMix.push(...homepage.new_trending.slice(0, 3));
        
        // Ensure unique and limit to 12
        const uniqueFallback = Array.from(new Map(fallbackMix.filter(t => t && t.id).map(t => [t.id, t])).values()).slice(0, 12);
        
        return res.json(uniqueFallback.length > 0 ? uniqueFallback : (homepage?.trending?.slice(0, 12) || []));
      }

      // 2. Map to song format and filter out incomplete metadata
      const validResults = [];
      for (const s of stats) {
        const localSong = s.localSong && s.localSong[0];
        const isExternal = s.isExternal;
        
        let title = "Unknown";
        let artist = "Unknown";
        let imageUrl = "";
        let duration = 0;
        
        if (isExternal && s.externalData) {
          title = s.externalData.title || title;
          artist = s.externalData.artist || artist;
          imageUrl = s.externalData.imageUrl || imageUrl;
          duration = s.externalData.duration || duration;
        } else if (localSong) {
          title = localSong.title || title;
          artist = localSong.artist || artist;
          imageUrl = localSong.imageUrl || imageUrl;
          duration = localSong.duration || duration;
        }

        if (title === "Unknown" || title.trim() === "") {
          console.log(`[Quick Picks] Excluded track (missing metadata). ID: ${s._id}, isExternal: ${isExternal}`);
          continue;
        }

        validResults.push({
          id: s._id,
          _id: s._id,
          title,
          artist,
          imageUrl,
          artwork: imageUrl,
          duration,
          externalId: isExternal ? (s.externalData?.externalId || s._id) : s._id,
          source: isExternal ? (s.externalData?.source || "jiosaavn") : "local",
          playCount: s.playCount,
          score: s.score,
        });
      }

      // 3. Shuffle slightly to keep it fresh and slice to 12
      results = [...validResults].sort(() => Math.random() - 0.5).slice(0, 12);

      try {
        await setCache(cacheKey, results, 54000); // 15 hours Redis cache
      } catch (err) {
        console.warn(`[Cache Fallback] quick-picks: ${userId} (Redis write error)`);
      }
    }

    res.json(results);
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
    const { languages: queryLanguages, limit = 20 } = req.query;

    const cacheKey = `vibra:daily-mix:${userId}`;
    let cachedMix = null;
    try {
      cachedMix = await getCache(cacheKey);
    } catch (err) {
      console.warn(`[Cache Fallback] daily-mix: ${userId} (Redis read error)`);
    }
    if (cachedMix) {
      return res.json(cachedMix);
    }

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
      const responseData = {
        title: existingMix.name,
        description: existingMix.description,
        results: existingMix.tracks,
        isPersonalized: existingMix.metadata.aiGenerated || false,
        source: 'database',
        id: existingMix._id
      };
      try {
        await setCache(cacheKey, responseData, 108000); // 30 hours Redis cache
      } catch (err) {
        console.warn(`[Cache Fallback] daily-mix: ${userId} (Redis write error)`);
      }
      return res.json(responseData);
    }

    const today = new Date().toISOString().split('T')[0];
    const seed = `${userId}_${today}`;

    // 2. Fetch user preferences and liked songs
    const user = await User.findOne({ clerkId: userId }).populate("likedSongs");
    const userLanguages = user?.preferences?.languages?.join(",") || "hindi,english";
    const targetLanguages = queryLanguages || userLanguages;

    // 3. Gather Familiar Candidates

    // A. Heavy Rotation aggregation (similar to getQuickPicks)
    const heavyRotationStats = await PlayHistory.aggregate([
      { $match: getPlayableMatch({ userId: userId.toString() }) },
      {
        $group: {
          _id: "$songId",
          playCount: { $sum: 1 },
          avgCompletion: { $avg: "$completionPercentage" },
          lastPlayed: { $max: "$playedAt" },
          isExternal: { $first: "$isExternal" },
          externalData: { $first: "$externalData" }
        }
      },
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ["$playCount", 2] },
              { $multiply: [{ $divide: ["$avgCompletion", 10] }, 1.5] }
            ]
          }
        }
      },
      { $sort: { score: -1 } },
      { $limit: 30 }
    ]);

    const heavyRotationTracks = heavyRotationStats.map(s => ({
      externalId: s.externalData?.externalId || s._id,
      title: s.externalData?.title || "Unknown",
      artist: s.externalData?.artist || "Unknown",
      imageUrl: s.externalData?.imageUrl || "",
      duration: s.externalData?.duration || 0,
      source: s.externalData?.source || "jiosaavn",
      album: s.externalData?.album || ""
    }));

    // B. Recent Favorites (past 14 days, high completion)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentFavoritesStats = await PlayHistory.find(getPlayableMatch({
      userId: userId.toString(),
      completionPercentage: { $gte: 30 },
      playedAt: { $gte: fourteenDaysAgo }
    }))
      .sort({ playedAt: -1 })
      .limit(40)
      .lean();

    const recentFavoritesTracks = recentFavoritesStats.map(s => ({
      externalId: s.externalData?.externalId || s.songId,
      title: s.externalData?.title || "Unknown",
      artist: s.externalData?.artist || "Unknown",
      imageUrl: s.externalData?.imageUrl || "",
      duration: s.externalData?.duration || 0,
      source: s.externalData?.source || "jiosaavn",
      album: s.externalData?.album || ""
    }));

    // C. Liked Songs (local and external)
    const likedSongs = [];
    if (user) {
      const local = (user.likedSongs || [])
        .filter(s => s && s._id)
        .map(s => ({
          externalId: s._id.toString(),
          title: s.title,
          artist: s.artist,
          imageUrl: s.coverArt || s.imageUrl || "",
          duration: s.duration || 0,
          source: s.source || "local",
          album: s.album || ""
        }));
      const external = (user.likedExternalSongs || []).map(s => ({
        externalId: s.externalId,
        title: s.title,
        artist: s.artist || "",
        imageUrl: s.imageUrl || "",
        duration: s.duration || 0,
        source: s.source || "jiosaavn",
        album: s.album || ""
      }));
      likedSongs.push(...local, ...external);
    }

    // 4. Apply Dedup + Curation Quality Rules
    const selectedIds = new Set();
    const selectedNormKeys = new Set();
    const artistCounts = new Map();
    const albumCounts = new Map();

    function getNormKey(title, artist) {
      return `${normalizeForDedup(title)}_${normalizeForDedup(artist)}`;
    }

    function tryAddTrack(track, list) {
      if (!track.externalId) return false;
      const normKey = getNormKey(track.title, track.artist);
      if (selectedIds.has(track.externalId) || selectedNormKeys.has(normKey)) {
        return false;
      }

      // Quality Filter: Max 3 tracks per artist
      const primaryArtist = extractPrimaryArtist(track.artist).toLowerCase();
      const currentArtistCount = artistCounts.get(primaryArtist) || 0;
      if (currentArtistCount >= 3) {
        return false;
      }

      // Quality Filter: Max 2 tracks per album
      if (track.album) {
        const albumKey = track.album.toLowerCase().trim();
        const currentAlbumCount = albumCounts.get(albumKey) || 0;
        if (currentAlbumCount >= 2) {
          return false;
        }
      }

      // Add to lists and maps
      selectedIds.add(track.externalId);
      selectedNormKeys.add(normKey);
      artistCounts.set(primaryArtist, currentArtistCount + 1);
      if (track.album) {
        const albumKey = track.album.toLowerCase().trim();
        albumCounts.set(albumKey, (albumCounts.get(albumKey) || 0) + 1);
      }
      list.push(track);
      return true;
    }

    // A. Fill Heavy Rotation (Target: 7 tracks)
    const finalHeavy = [];
    for (const track of heavyRotationTracks) {
      if (finalHeavy.length >= 7) break;
      tryAddTrack(track, finalHeavy);
    }

    // B. Fill Recent Favorites (Target: 7 tracks)
    const finalRecent = [];
    for (const track of recentFavoritesTracks) {
      if (finalRecent.length >= 7) break;
      tryAddTrack(track, finalRecent);
    }

    // C. Fill Liked Songs (Target: 2 tracks)
    const shuffledLikes = seededShuffle(likedSongs, `${userId}_likes_${today}`);
    const finalLiked = [];
    for (const track of shuffledLikes) {
      if (finalLiked.length >= 2) break;
      tryAddTrack(track, finalLiked);
    }

    // D. Fetch Discovery Recommendations (Target: 4 tracks)
    // Seed using top 2 unique tracks from Heavy Rotation / Recent Favorites
    const seedTracks = [...finalHeavy, ...finalRecent].slice(0, 2);
    let allRecs = [];
    if (seedTracks.length > 0) {
      const recPromises = seedTracks.map(track => {
        const source = track.source || "jiosaavn";
        const cleanId = track.externalId?.replace("jiosaavn_", "");
        if (source === "jiosaavn" && cleanId) {
          return jiosaavn.getRecommendations(cleanId, 15, targetLanguages);
        }
        return Promise.resolve([]);
      });

      const settled = await Promise.allSettled(recPromises);
      settled.forEach(r => {
        if (r.status === "fulfilled" && r.value) {
          allRecs.push(...r.value);
        }
      });
    }

    // Build the user-familiar lookup set to ensure discovery items are TRULY discovery
    const userFamiliarIds = new Set();
    const userFamiliarNormKeys = new Set();

    const allHistory = await PlayHistory.find(getPlayableMatch({ userId: userId.toString() })).select("songId externalData").lean();
    for (const h of allHistory) {
      userFamiliarIds.add(h.songId);
      if (h.externalData?.externalId) userFamiliarIds.add(h.externalData.externalId);
      if (h.externalData?.title) {
        userFamiliarNormKeys.add(getNormKey(h.externalData.title, h.externalData.artist));
      }
    }
    for (const l of likedSongs) {
      userFamiliarIds.add(l.externalId);
      userFamiliarNormKeys.add(getNormKey(l.title, l.artist));
    }

    const filteredDiscovery = allRecs.filter(track => {
      const id = track.externalId || track.id;
      const normKey = getNormKey(track.title, track.artist);
      return !userFamiliarIds.has(id) && !userFamiliarNormKeys.has(normKey);
    });

    const shuffledDiscovery = seededShuffle(filteredDiscovery, `${userId}_discovery_${today}`);
    // Resolve up to 10 candidates to ensure we can get 4 fully verified/playable tracks
    const resolvedDiscovery = await resolveDiscoveryTracks(shuffledDiscovery, 10);

    const finalDiscovery = [];
    for (const track of resolvedDiscovery) {
      if (finalDiscovery.length >= 4) break;
      tryAddTrack(track, finalDiscovery);
    }

    // 5. Merge and Handle Fallbacks
    let results = [...finalHeavy, ...finalRecent, ...finalLiked, ...finalDiscovery];
    let isPersonalized = results.length > 0;

    // Fallback Padding: if list is < 20 tracks, pull remaining liked/history items
    if (results.length < 20) {
      const remainingFamiliar = [
        ...shuffledLikes,
        ...heavyRotationTracks,
        ...recentFavoritesTracks
      ];
      for (const track of remainingFamiliar) {
        if (results.length >= 20) break;
        tryAddTrack(track, results);
      }
    }

    // Full Fallback: If still < 20 (e.g. brand new user with no history/likes)
    if (results.length < 20) {
      try {
        const trendingData = await jiosaavn.getHomepageBySearch(targetLanguages);
        const trendingSongs = trendingData?.trending || trendingData?.newAlbums || [];
        const shuffledTrending = seededShuffle(trendingSongs, `${userId}_trending_${today}`);
        const resolvedTrending = await resolveDiscoveryTracks(shuffledTrending, 25);

        for (const track of resolvedTrending) {
          if (results.length >= 20) break;
          tryAddTrack(track, results);
        }
      } catch (trendingError) {
        console.warn("[Stream] Daily Mix trending fallback failed:", trendingError.message);
      }
    }

    // Final slice to limit
    results = results.slice(0, parseInt(limit));
    isPersonalized = results.length > 0 && (finalHeavy.length > 0 || finalRecent.length > 0 || finalLiked.length > 0);

    // 6. Persist to DB for the rest of the day
    const newMix = new AIPlaylist({
      name: "Daily Mix",
      description: isPersonalized
        ? "80% Familiar favorites & 20% fresh discovery recommendations"
        : "Trending regional hits tailored for you",
      userId,
      vibe: 'any',
      language: 'multi',
      era: 'mixed',
      size: results.length,
      tracks: results.map(s => {
        const rawId = s.externalId || s.id;
        const cleanId = rawId
          ? String(rawId).replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/, "")
          : null;
        const source = s.source || 'jiosaavn';
        const redirectUrl = cleanId && source !== 'local' ? `/api/stream/play/${source}/${cleanId}` : null;
        return {
          externalId: s.externalId || s.id,
          title: s.title,
          artist: s.artist,
          imageUrl: s.imageUrl || "",
          streamUrl: redirectUrl,
          audioUrl: redirectUrl,
          duration: s.duration || 0,
          source,
          album: s.album || ''
        };
      }),
      metadata: {
        discoveryType: "daily",
        aiGenerated: isPersonalized,
        generatedAt: new Date()
      },
      expiresAt: new Date(new Date().setHours(23, 59, 59, 999)) // Reset at Midnight
    });

    await newMix.save();

    const responseData = {
      title: newMix.name,
      description: newMix.description,
      results: newMix.toObject().tracks,
      isPersonalized,
      source: 'generated',
      id: newMix._id
    };

    try {
      await setCache(cacheKey, responseData, 108000); // 30 hours Redis cache
    } catch (err) {
      console.warn(`[Cache Fallback] daily-mix: ${userId} (Redis write error)`);
    }

    res.json(responseData);
  } catch (error) {
    console.error("[Stream] Daily Mix error:", error);
    res.json({ results: [], isPersonalized: false });
  }
};

/**
 * Helper to normalize song titles for robust deduplication
 */
export const normalizeSongTitle = (title) => {
  return normalizeForDedup(title);
};

/**
 * Get "Because You Played" recommendations
 * GET /api/stream/recommendations/because-you-played
 */
export const getBecauseYouPlayed = async (req, res) => {
  try {
    const userId = req.auth.userId;
    // Default limit is 8 (fits the target range 6-8 tracks)
    const { languages: queryLanguages, limit = 8 } = req.query;
    const targetLimit = Math.max(6, Math.min(Number(limit), 8));

    const cacheKey = `vibra:recommendations:because-you-played:${userId}`;

    // 1. Check Redis Cache (TTL 6 Hours)
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        // console.log(`[Cache Hit] because-you-played for user: ${userId}`);
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        return res.json(parsed);
      }
    } catch (err) {
      console.warn(`[Cache Fallback] because-you-played: ${userId} (Redis read error)`);
    }

    // 2. Fetch User Languages
    const user = await User.findOne({ clerkId: userId }).populate("likedSongs");
    const userLanguages = user?.preferences?.languages?.join(",") || "hindi,english";
    const targetLanguages = queryLanguages || userLanguages;

    // 3. Fetch User History
    // A. 30 Days Ago (for artist ranking)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const playHistory = await PlayHistory.find(getPlayableMatch({
      userId: userId.toString(),
      playedAt: { $gte: thirtyDaysAgo }
    })).lean();

    // B. 7 Days Ago (for familiarity frequency filtering)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentPlays = playHistory.filter(p => p.playedAt >= sevenDaysAgo);

    const recentPlayCounts = {};
    recentPlays.forEach(p => {
      if (p.songId) {
        recentPlayCounts[p.songId] = (recentPlayCounts[p.songId] || 0) + 1;
      }
    });

    // C. Current Active Track (played in last 30 minutes)
    const latestPlay = await PlayHistory.findOne(getPlayableMatch({ userId: userId.toString() })).sort({ playedAt: -1 }).lean();
    const currentPlayingId = latestPlay && (new Date() - latestPlay.playedAt < 30 * 60 * 1000) ? latestPlay.songId : null;

    // Calculate score per artist name
    const artistScores = {};
    const artistDetails = {}; // Keep map of artistName -> artistId (if available)

    // Helper: parse date to age in days
    const getDaysAgo = (date) => {
      const diffMs = new Date() - new Date(date);
      return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
    };

    // Calculate exponential time decay (half-life of 7 days: lambda = ln(2)/7 = 0.099)
    const decayLambda = 0.099;

    playHistory.forEach(play => {
      let artistsStr = play.externalData?.artist || play.context?.title || "";
      if (!artistsStr) return;

      // Split primary artist
      const primaryArtist = artistsStr.split(',')[0].trim();
      if (!primaryArtist) return;

      const key = primaryArtist.toLowerCase();

      // Completion percentage factor
      let completionFactor = 1.0;
      if (play.completionPercentage >= 70) completionFactor = 1.2;
      else if (play.completionPercentage < 20) completionFactor = 0.2;

      // Recency decay factor
      const ageDays = getDaysAgo(play.playedAt);
      const recencyFactor = Math.exp(-decayLambda * ageDays);

      const playScore = 1.0 * completionFactor * recencyFactor;

      if (!artistScores[key]) {
        artistScores[key] = 0;
        artistDetails[key] = {
          name: primaryArtist,
          // Extract jiosaavn artist ID if available
          externalId: play.externalData?.albumId?.includes('artist') ? play.externalData.albumId : null,
          playedSongs: []
        };
      }

      artistScores[key] += playScore;
      
      // Collect played song IDs for deduplication
      if (play.songId) {
        artistDetails[key].playedSongs.push(play.songId);
      }
    });

    // 4. Boost scores with Likes & Follows
    // A. Likes Boost (+10 points per liked track, capped at +50)
    const likedSongs = user?.likedSongs || [];
    const likedExternalSongs = user?.likedExternalSongs || [];

    const incrementArtistLike = (artistName) => {
      const key = artistName.toLowerCase().trim();
      if (artistScores[key] !== undefined) {
        // Boost up to a maximum
        if (!artistDetails[key].likesCount) artistDetails[key].likesCount = 0;
        if (artistDetails[key].likesCount < 5) {
          artistDetails[key].likesCount++;
          artistScores[key] += 10;
        }
      }
    };

    likedSongs.forEach(song => {
      if (song.artist) {
        const primary = song.artist.split(',')[0].trim();
        incrementArtistLike(primary);
      }
    });

    likedExternalSongs.forEach(song => {
      if (song.artist) {
        const primary = song.artist.split(',')[0].trim();
        incrementArtistLike(primary);
      }
    });

    // B. Follows Boost (+15 points for followed artists)
    const followedArtists = await SavedItem.find({
      userId,
      type: "artist"
    }).lean();

    followedArtists.forEach(follow => {
      const name = follow.name || follow.title;
      if (name) {
        const key = name.toLowerCase().trim();
        if (artistScores[key] !== undefined) {
          artistScores[key] += 15;
          // Store externalId if missing
          if (!artistDetails[key].externalId && follow.externalId) {
            artistDetails[key].externalId = follow.externalId;
          }
        } else {
          // If followed but no play history in past 30 days, initialize with 15 points
          artistScores[key] = 15;
          artistDetails[key] = {
            name: name,
            externalId: follow.externalId,
            playedSongs: []
          };
        }
      }
    });

    // Convert to array and sort by score
    const sortedArtists = Object.keys(artistScores)
      .map(key => ({
        key,
        name: artistDetails[key].name,
        externalId: artistDetails[key].externalId,
        score: artistScores[key],
        playedSongs: [...new Set(artistDetails[key].playedSongs)]
      }))
      .sort((a, b) => b.score - a.score);

    // 5. Select artist via Daily Rotation (select from top 3)
    let selectedArtist = null;
    let seedTrackId = null;
    let artistNameForUI = "Unknown";
    let artistImage = "";

    const today = new Date();
    const dayIndex = today.getDate() + today.getMonth() + today.getFullYear(); // Safe daily index

    // Check if we have candidates
    if (sortedArtists.length > 0) {
      const poolSize = Math.min(3, sortedArtists.length);
      const chosenIdx = dayIndex % poolSize;
      selectedArtist = sortedArtists[chosenIdx];
      artistNameForUI = selectedArtist.name;
    }

    // 6. Gather Recommendations
    let recommendedTracks = [];

    // Find a seed track for the selected artist
    if (selectedArtist) {
      // Find the most played track of this artist
      const songPlayCounts = {};
      playHistory.forEach(play => {
        const primary = (play.externalData?.artist || "").split(',')[0].trim().toLowerCase();
        if (primary === selectedArtist.key && play.songId) {
          songPlayCounts[play.songId] = (songPlayCounts[play.songId] || 0) + 1;
        }
      });

      // Get the highest play count songId
      const sortedSongs = Object.keys(songPlayCounts).sort((a, b) => songPlayCounts[b] - songPlayCounts[a]);
      if (sortedSongs.length > 0) {
        seedTrackId = sortedSongs[0];
      }

      // If no history seed, try a liked external song by this artist
      if (!seedTrackId) {
        const likedSong = likedExternalSongs.find(s => 
          (s.artist || "").split(',')[0].trim().toLowerCase() === selectedArtist.key
        );
        if (likedSong && likedSong.externalId) {
          seedTrackId = likedSong.externalId;
        }
      }

      // Clean ID format (remove jiosaavnPrefix)
      const cleanSeedId = seedTrackId ? seedTrackId.replace('jiosaavn_artist_', '').replace('jiosaavn_', '') : null;

      if (cleanSeedId) {
        // Fetch recommendations from JioSaavn
        try {
          const reco = await jiosaavn.getRecommendations(cleanSeedId, 35, targetLanguages); // Request 35 for better diversity filtering
          if (reco && reco.length > 0) {
            recommendedTracks = reco;
          }
        } catch (err) {
          console.warn("[Stream] Failed to fetch JioSaavn recommendations:", err.message);
        }
      }
    }

    // Fallback: If JioSaavn recommendation failed or returned too few tracks, fetch artist page
    if (recommendedTracks.length < 15 && selectedArtist) {
      let artistIdToQuery = selectedArtist.externalId;
      
      // If we don't have artistId, search JioSaavn for this artist
      if (!artistIdToQuery) {
        try {
          const searchRes = await jiosaavn.searchArtists(selectedArtist.name, 1);
          if (searchRes && searchRes.length > 0) {
            artistIdToQuery = searchRes[0].externalId;
            artistImage = searchRes[0].imageUrl;
          }
        } catch (err) {
          console.warn("[Stream] Artist search fallback failed:", err.message);
        }
      }

      if (artistIdToQuery) {
        const cleanArtistId = artistIdToQuery.replace('jiosaavn_artist_', '').replace('jiosaavn_', '');
        try {
          const artistPage = await jiosaavn.getArtist(cleanArtistId);
          if (artistPage) {
            artistImage = artistPage.imageUrl || artistImage;
            const topSongs = artistPage.topSongs || [];
            
            // Mix/Interleave top songs to recommendations
            const existingIds = new Set(recommendedTracks.map(t => t.externalId));
            topSongs.forEach(song => {
              if (!existingIds.has(song.externalId)) {
                recommendedTracks.push(song);
              }
            });
          }
        } catch (err) {
          console.warn("[Stream] JioSaavn getArtist page fallback failed:", err.message);
        }
      }
    }

    // Global Fallback for new/insufficient history users
    if (recommendedTracks.length < 5) {
      // Find fallback artist by language
      const lang = targetLanguages.toLowerCase();
      let fallbackArtistName = "Arijit Singh"; // default
      if (lang.includes("english")) fallbackArtistName = "Taylor Swift";
      else if (lang.includes("punjabi")) fallbackArtistName = "Diljit Dosanjh";

      artistNameForUI = fallbackArtistName;

      try {
        const searchRes = await jiosaavn.searchArtists(fallbackArtistName, 1);
        if (searchRes && searchRes.length > 0) {
          const artistIdToQuery = searchRes[0].externalId;
          artistImage = searchRes[0].imageUrl;
          const cleanArtistId = artistIdToQuery.replace('jiosaavn_artist_', '').replace('jiosaavn_', '');
          const artistPage = await jiosaavn.getArtist(cleanArtistId);
          if (artistPage && artistPage.topSongs) {
            recommendedTracks = artistPage.topSongs;
          }
        }
      } catch (err) {
        console.error("[Stream] Global fallback recommendation fetch failed:", err);
      }
    }

    // Resolve artist image if we still don't have it
    if (!artistImage && selectedArtist) {
      if (selectedArtist.externalId) {
        const cleanArtistId = selectedArtist.externalId.replace('jiosaavn_artist_', '').replace('jiosaavn_', '');
        const artistPage = await jiosaavn.getArtist(cleanArtistId);
        artistImage = artistPage?.imageUrl || "";
      } else {
        const searchRes = await jiosaavn.searchArtists(selectedArtist.name, 1);
        artistImage = searchRes?.[0]?.imageUrl || "";
      }
    }

    // 7. Deduplication & Filtering
    // Get daily mix tracks
    let dailyMixTracks = [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existingMix = await AIPlaylist.findOne({
      userId,
      "metadata.discoveryType": "daily",
      createdAt: { $gte: todayStart }
    }).lean();
    if (existingMix) {
      dailyMixTracks = existingMix.tracks || [];
    }
    const dailyMixIds = new Set(dailyMixTracks.map(t => t.externalId || t._id));

    // Get continue listening tracks (completion between 10% and 90% in 30 days)
    const resumeTracks = playHistory.filter(p => p.completionPercentage >= 10 && p.completionPercentage <= 90);
    const resumeIds = new Set(resumeTracks.map(t => t.songId));

    // A. Title Normalization Deduplication
    const titleGroups = {};
    recommendedTracks.forEach((track, idx) => {
      const normTitle = normalizeSongTitle(track.title);
      if (!normTitle) return;

      const hasImg = !!track.imageUrl && !track.imageUrl.includes("jiosaavn");
      const rawLen = track.title.length;
      const normLen = normTitle.length;
      const titleRatio = rawLen > 0 ? (rawLen - normLen) / rawLen : 0;
      
      const selectionScore = (150 - idx) + (hasImg ? 50 : 0) + (30 * (1 - titleRatio));

      if (!titleGroups[normTitle]) {
        titleGroups[normTitle] = [];
      }
      titleGroups[normTitle].push({ track, score: selectionScore, originalIndex: idx });
    });

    const uniqueTracks = Object.keys(titleGroups).map(normTitle => {
      const group = titleGroups[normTitle];
      group.sort((a, b) => b.score - a.score);
      const minOriginalIndex = Math.min(...group.map(g => g.originalIndex));
      return {
        ...group[0].track,
        originalIndex: minOriginalIndex
      };
    });

    // B. Familiarity Filtering
    const filteredTracksPool = uniqueTracks.filter(track => {
      const id = track.externalId;
      if (dailyMixIds.has(id)) return false;
      if (resumeIds.has(id)) return false;
      if (currentPlayingId && id === currentPlayingId) return false;
      if (recentPlayCounts[id] >= 5) return false;
      return true;
    });

    // C. Quality Score Calculation & Ranking
    const scoredPool = filteredTracksPool.map(track => {
      let score = 100 - track.originalIndex;

      const primaryArtist = (track.artist || "").split(',')[0].trim().toLowerCase();
      
      // Discovery boost based on last 30 days listening
      const artistPlayCount = playHistory.filter(p => {
        const pArtist = (p.externalData?.artist || "").split(',')[0].trim().toLowerCase();
        return pArtist === primaryArtist;
      }).length;

      if (artistPlayCount === 0) {
        score += 25; // High discovery boost
      } else if (artistPlayCount < 3) {
        score += 15; // Moderate boost
      }

      if (track.imageUrl) {
        score += 15; // Metadata boost
      }

      return {
        track,
        score,
        primaryArtist
      };
    });

    // D. Artist Diversity Slotting Interleaver
    const artistGroups = {};
    scoredPool.forEach(item => {
      if (!artistGroups[item.primaryArtist]) {
        artistGroups[item.primaryArtist] = [];
      }
      artistGroups[item.primaryArtist].push(item);
    });

    // Sort each group by Quality Score descending
    Object.keys(artistGroups).forEach(artist => {
      artistGroups[artist].sort((a, b) => b.score - a.score);
    });

    // Collect helper with artist and album diversity caps
    const collectTracks = (maxPerArtist, maxPerAlbum = 999) => {
      const collected = [];
      const albumCounts = {};
      const pickedIds = new Set();
      
      for (let round = 0; round < maxPerArtist; round++) {
        Object.keys(artistGroups).forEach(artist => {
          const group = artistGroups[artist];
          
          // Find the first track in the group that hasn't been picked
          // and doesn't violate the album cap
          const nextValid = group.find(item => {
            const trackId = item.track.externalId;
            if (pickedIds.has(trackId)) return false;
            
            const albumName = item.track.album || item.track.more_info?.album || "";
            const albumKey = albumName.toLowerCase().trim();
            if (albumKey && albumCounts[albumKey] >= maxPerAlbum) {
              return false;
            }
            return true;
          });

          if (nextValid) {
            collected.push(nextValid.track);
            pickedIds.add(nextValid.track.externalId);
            
            const albumName = nextValid.track.album || nextValid.track.more_info?.album || "";
            const albumKey = albumName.toLowerCase().trim();
            if (albumKey) {
              albumCounts[albumKey] = (albumCounts[albumKey] || 0) + 1;
            }
          }
        });
      }
      return collected;
    };

    // First pass: Max 2 tracks per artist, max 1 track per album
    let finalSelection = collectTracks(2, 1);

    // If first pass has fewer than 6 tracks, backfill the remaining slots by running a relaxed pass
    if (finalSelection.length < 6) {
      const selectedIds = new Set(finalSelection.map(t => t.externalId || t._id));
      const relaxedSelection = collectTracks(5, 999);
      
      for (const track of relaxedSelection) {
        const id = track.externalId || track._id;
        if (!selectedIds.has(id)) {
          finalSelection.push(track);
          selectedIds.add(id);
        }
        if (finalSelection.length >= 6) {
          break;
        }
      }
    }

    // Limit to output target range of 6-8 tracks
    const finalTracks = finalSelection.slice(0, targetLimit);

    const result = {
      artist: {
        externalId: selectedArtist?.externalId || null,
        name: artistNameForUI,
        imageUrl: artistImage || ""
      },
      tracks: finalTracks,
      reason: `Because you played ${artistNameForUI}`,
      generatedAt: new Date(),
      updatedAt: Date.now() // Deterministic fingerprint for silent refresh
    };

    // Save to Redis Cache (30 Hours)
    try {
      await setCache(cacheKey, JSON.stringify(result), 108000); // 30 Hours in seconds
    } catch (err) {
      console.warn(`[Cache Fallback] because-you-played: ${userId} (Redis write error)`);
    }

    res.json(result);
  } catch (error) {
    console.error("[Stream] because-you-played error:", error);
    res.json({
      artist: { externalId: null, name: "Popular Artists", imageUrl: "" },
      tracks: [],
      reason: "Popular recommendations",
      generatedAt: new Date(),
      updatedAt: Date.now()
    });
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

    const query = q.trim();
    const normalizedQuery = normalizeQueryKey(query);
    const cacheKey = `vibra:autocomplete:${normalizedQuery}`;

    let cachedData = null;
    try {
      cachedData = await getCache(cacheKey);
    } catch (err) {
      console.warn(`[Cache Fallback] autocomplete: "${query}" (Redis read error, falling back to live fetch)`);
    }

    if (cachedData) {
      // console.log(`[Cache Hit] autocomplete: "${query}"`);
      return res.json(cachedData);
    }

    // console.log(`[Cache Miss] autocomplete: "${query}"`);

    const suggestions = await jiosaavn.autocomplete(query);
    const responseData = { suggestions: suggestions || [] };

    // Do not cache empty responses
    if (suggestions && suggestions.length > 0) {
      try {
        // TTL is 15 minutes = 900 seconds
        await setCache(cacheKey, responseData, 900);
      } catch (err) {
        console.warn(`[Cache Fallback] autocomplete: "${query}" (Redis write error, failed to write cache)`);
      }
    }

    res.json(responseData);
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

  return function () {
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

// Use the exported normalizeSongTitle helper defined above for all comparisons

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
  if (!str) return "";
  let clean = str.toLowerCase();

  // 1. Strip parenthesized/bracketed content with suffixes
  const bracketRegex = /[\(\[][^\)\]]*(?:from|remaster|live|acoustic|version|extended|official|audio|lyrics|ost|soundtrack|hits|original|motion|picture)[^\)\]]*[\)\]]/gi;
  clean = clean.replace(bracketRegex, "");

  // 2. Remove standard parentheses and brackets contents
  clean = clean.replace(/\([^)]*\)/g, "");
  clean = clean.replace(/\[[^\]]*\]/g, "");

  // 3. Common suffixes
  const suffixTerms = [
    "original motion picture soundtrack",
    "original motion picture",
    "motion picture soundtrack",
    "motion picture",
    "soundtrack",
    "remastered",
    "remaster",
    "live",
    "acoustic",
    "version",
    "extended",
    "official",
    "audio",
    "lyrics",
    "ost",
    "greatest hits",
    "greatest hit",
    "from"
  ];

  // 4. Split on hyphen/dash/colon
  const splitMatch = clean.split(/[-–:]/);
  if (splitMatch.length > 1) {
    const rightSide = splitMatch.slice(1).join(" ");
    if (suffixTerms.some(term => rightSide.includes(term))) {
      clean = splitMatch[0];
    }
  }

  // 5. Strip suffix words using regex with boundary
  suffixTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    clean = clean.replace(regex, ' ');
  });

  // 6. Unicode-safe punctuation removal (regex property escape u flag)
  clean = clean.replace(/[^\p{L}\p{N}\s]/gu, " ");

  // 7. Collapse spaces and trim
  clean = clean.replace(/\s+/g, " ").trim();

  return clean;
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

        // Force resolution to get the latest 'duration' and confirm the track exists
        const songId = track.externalId?.replace("jiosaavn_", "") || track.id;
        if (songId) {
          const detailed = await jiosaavn.getSong(songId);
          if (detailed) {
            // Phase 1: replace any CDN streamUrl with a stable redirector URL
            const rawId = detailed.externalId || songId;
            const cleanId = String(rawId).replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/, "");
            const redirectUrl = `/api/stream/play/jiosaavn/${cleanId}`;
            return {
              ...detailed,
              streamUrl: redirectUrl,
              audioUrl: redirectUrl,
              source: 'jiosaavn'
            };
          }
        }

        // 2. Search JioSaavn
        const jioResults = await jiosaavn.search(query, 1);
        if (jioResults && jioResults.length > 0) {
          // search() already returns redirector URLs via the updated resolveStreamUrls()
          const matched = { ...jioResults[0], source: 'jiosaavn' };
          return matched;
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

    const now = new Date();
    const weekNum = Math.ceil((now.getDate() + 6 - now.getDay()) / 7);
    const weekSeed = `${userId}_${now.getFullYear()}_W${weekNum}`;

    const cacheKey = `vibra:weekly-mix:${userId}:${weekSeed}`;
    let cachedMix = null;
    try {
      cachedMix = await getCache(cacheKey);
    } catch (err) {
      console.warn(`[Cache Fallback] weekly-mix: ${userId} (Redis read error)`);
    }
    if (cachedMix) {
      return res.json(cachedMix);
    }

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 30); // Look at last 30 days for existing user history

    // 1. Calculate stats for the last 7 days
    const stats = await PlayHistory.aggregate([
      {
        $match: getPlayableMatch({
          userId: userId.toString(),
          playedAt: { $gte: startOfWeek }
        })
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

    // 2. Eligibility Check: 10 songs OR 30 minutes
    const isEligible = totalSongs >= 10 || totalMinutes >= 30;

    if (!isEligible) {
      return res.json({
        eligible: false,
        progress: { count: totalSongs, minutes: totalMinutes },
        requirements: { count: 10, minutes: 30 }
      });
    }

    // 3. Extract Top artists and a seed track
    const artistCounts = {};
    topArtists.forEach(a => { if (a) artistCounts[a] = (artistCounts[a] || 0) + 1; });
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

    // ─── NEW: Check for existing weekly mix in DB ───
    const existingWeekly = await AIPlaylist.findOne({
      userId,
      "metadata.discoveryType": "weekly",
      "metadata.weekSeed": weekSeed
    }).lean();

    if (existingWeekly) {
      const responseData = {
        eligible: true,
        metadata: {
          name: existingWeekly.name,
          description: existingWeekly.description,
          id: existingWeekly._id
        },
        results: existingWeekly.tracks,
        seed: weekSeed,
        source: 'database'
      };
      try {
        await setCache(cacheKey, responseData, 691200); // 8 days Redis cache (8 * 24 * 3600 = 691,200s)
      } catch (err) {
        console.warn(`[Cache Fallback] weekly-mix: ${userId} (Redis write error)`);
      }
      return res.json(responseData);
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
      tracks: shuffled.map(s => {
        const rawId = s.externalId || s.id;
        const cleanId = rawId
          ? String(rawId).replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/, "")
          : null;
        const source = s.source || 'jiosaavn';
        const redirectUrl = cleanId && source !== 'local' ? `/api/stream/play/${source}/${cleanId}` : null;
        return {
          externalId: s.externalId || s.id,
          title: s.title,
          artist: s.artist,
          imageUrl: s.imageUrl,
          streamUrl: redirectUrl,
          audioUrl: redirectUrl,
          duration: s.duration || 0,
          source,
          album: s.album || ''
        };
      }),
      metadata: {
        discoveryType: "weekly",
        weekSeed: weekSeed,
        aiGenerated: true,
        generatedAt: new Date()
      },
      expiresAt
    });

    await newWeekly.save();

    const responseData = {
      eligible: true,
      metadata,
      results: newWeekly.toObject().tracks,
      seed: weekSeed,
      source: 'generated',
      id: newWeekly._id
    };

    try {
      await setCache(cacheKey, responseData, 691200); // 8 days Redis cache
    } catch (err) {
      console.warn(`[Cache Fallback] weekly-mix: ${userId} (Redis write error)`);
    }

    res.json(responseData);

  } catch (error) {
    console.error("[Stream] Weekly Mix critical failure:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ============================================================================
// PHASE 2 REDIS CACHING: LYRICS & ARTIST METADATA
// ============================================================================

function cleanLyricsTitle(title) {
  return title
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*\[.*?\]\s*/g, ' ')
    .replace(/\s*-\s*(Official|Music|Video|Audio|Lyric|Lyrics|HD|HQ|4K).*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanLyricsArtist(artist) {
  return artist
    .split(/[,&]/)[0]
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseLRC(lrc) {
  if (!lrc) return null;
  const lines = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/;

  for (const line of lrc.split('\n')) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0'), 10);
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4].trim();
      if (text) {
        lines.push({ time, text });
      }
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

async function fetchLyricsBackend(title, artist, duration) {
  const cleanedTitle = cleanLyricsTitle(title);
  const cleanedArtist = cleanLyricsArtist(artist);

  // 1. Try exact match first from LrcLib
  try {
    const params = new URLSearchParams({
      artist_name: cleanedArtist,
      track_name: cleanedTitle,
      ...(duration ? { duration: String(Math.round(duration)) } : {}),
    });

    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: { 'User-Agent': 'Vibra Music App v1.0' },
      timeout: 5000,
    });

    if (res.ok) {
      const data = await res.json();
      return {
        syncedLyrics: data.syncedLyrics ? parseLRC(data.syncedLyrics) : null,
        plainLyrics: data.plainLyrics || null,
        source: 'lrclib',
      };
    }
  } catch (e) {
    console.error('[Lyrics Backend] Exact match failed:', e.message);
  }

  // 2. Try search fallback from LrcLib
  try {
    const params = new URLSearchParams({
      q: `${cleanedArtist} ${cleanedTitle}`,
    });

    const res = await fetch(`https://lrclib.net/api/search?${params}`, {
      headers: { 'User-Agent': 'Vibra Music App v1.0' },
      timeout: 6000,
    });

    if (res.ok) {
      const results = await res.json();
      if (results.length > 0) {
        const best = results[0];
        return {
          syncedLyrics: best.syncedLyrics ? parseLRC(best.syncedLyrics) : null,
          plainLyrics: best.plainLyrics || null,
          source: 'lrclib',
        };
      }
    }
  } catch (e) {
    console.error('[Lyrics Backend] Search failed:', e.message);
  }

  // 3. Try lyrics.ovh fallback
  try {
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanedArtist)}/${encodeURIComponent(cleanedTitle)}`,
      { timeout: 5000 }
    );

    if (res.ok) {
      const data = await res.json();
      if (data.lyrics) {
        return {
          syncedLyrics: null,
          plainLyrics: data.lyrics,
          source: 'lyrics.ovh',
        };
      }
    }
  } catch (e) {
    console.error('[Lyrics Backend] lyrics.ovh fallback failed:', e.message);
  }

  return { syncedLyrics: null, plainLyrics: null, source: '' };
}

export const getLyrics = async (req, res) => {
  try {
    const { trackId, title, artist, duration } = req.query;
    if (!title || !artist) {
      return res.status(400).json({ message: "Title and artist are required" });
    }

    const songId = trackId || `${normalizeQueryKey(artist)}:${normalizeQueryKey(title)}`;
    const cacheKey = `lyrics:v1:${songId}`;

    let cachedData = null;
    try {
      cachedData = await getCache(cacheKey);
    } catch (err) {
      console.warn(`[Cache Fallback] lyrics: ${songId} (Redis read error, falling back to live fetch)`);
    }

    if (cachedData) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Lyrics Cache HIT] lyrics: ${songId}`);
      }
      return res.json(cachedData);
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[Lyrics Cache MISS] lyrics: ${songId}`);
    }

    const result = await fetchLyricsBackend(title, artist, duration);

    // Skip caching empty/invalid responses
    if (result && (result.syncedLyrics || result.plainLyrics)) {
      try {
        const cacheObject = {
          ...result,
          version: 1,
          cachedAt: new Date().toISOString()
        };
        // TTL is 90 days = 7776000 seconds
        await setCache(cacheKey, cacheObject, 7776000);
      } catch (err) {
        console.warn(`[Cache Fallback] lyrics: ${songId} (Redis write error, failed to write cache)`);
      }
    }

    res.json(result);
  } catch (error) {
    console.error("[Stream] Lyrics controller error:", error);
    res.json({ syncedLyrics: null, plainLyrics: null, source: "" });
  }
};

function extractPrimaryArtist(artistString) {
  return artistString
    .split(/\s*(?:,|\bfeat\b\.?|\bft\b\.?|&|\+|\/|;|\|)\s*/i)[0]
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .trim();
}

function cleanBio(bio) {
  if (!bio) return "";
  return bio
    .replace(/<a href=".*?">Read more on Last\.fm<\/a>\.?/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s*\.\s*$/, '')
    .trim();
}

async function fetchArtistInfoBackend(primaryArtist, originalName) {
  // Try JioSaavn search and details fetch first
  try {
    const saavnArtists = await jiosaavn.searchArtists(primaryArtist, 1);
    if (saavnArtists && saavnArtists.length > 0) {
      const saavnArtist = saavnArtists[0];
      const rawId = saavnArtist._id || saavnArtist.id;
      if (rawId) {
        const details = await jiosaavn.getArtist(rawId);
        if (details) {
          console.log(`[Artist Backend] Resolved artist name "${primaryArtist}" to JioSaavn ID "${rawId}"`);
          return {
            name: details.name || saavnArtist.name || primaryArtist,
            imageUrl: details.imageUrl || saavnArtist.imageUrl,
            listeners: details.followerCount || details.listeners || saavnArtist.followerCount,
            followerCount: details.followerCount || saavnArtist.followerCount,
            bio: details.bio ? (details.bio.substring(0, 120) + (details.bio.length > 120 ? '…' : '')) : undefined,
            fullBio: details.bio,
            externalId: `jiosaavn_artist_${rawId}`,
            topSongs: details.topSongs,
            topAlbums: details.topAlbums,
          };
        }
      }
    }
  } catch (saavnError) {
    console.warn('[Artist Backend] JioSaavn resolution failed, falling back to Deezer/Last.fm:', saavnError.message);
  }

  let artistInfo = { name: primaryArtist };
  let imageUrl;

  // Deezer search for image
  try {
    const deezerResponse = await fetch(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(primaryArtist)}&limit=1`,
      { timeout: 5000 }
    );
    if (deezerResponse.ok) {
      const deezerData = await deezerResponse.json();
      if (deezerData.data?.[0]) {
        const deezerArtist = deezerData.data[0];
        imageUrl = deezerArtist.picture_xl || deezerArtist.picture_big || deezerArtist.picture_medium;
        if (imageUrl?.includes('d.radio.net') || imageUrl?.includes('/images/artist//')) {
          imageUrl = undefined;
        }
      }
    }
  } catch (deezerError) {
    console.warn('[Artist Backend] Deezer fetch failed:', deezerError.message);
  }

  // Last.fm search for bio & statistics
  const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
  if (LASTFM_API_KEY) {
    try {
      const lastfmResponse = await fetch(
        `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(primaryArtist)}&api_key=${LASTFM_API_KEY}&format=json`,
        { timeout: 5000 }
      );
      if (lastfmResponse.ok) {
        const lastfmData = await lastfmResponse.json();
        if (lastfmData.artist) {
          const artist = lastfmData.artist;
          let shortBio;
          let fullBio;

          if (artist.bio?.summary) {
            fullBio = cleanBio(artist.bio.summary);
            const sentences = fullBio.match(/[^.!?]+[.!?]+/g);
            if (sentences && sentences.length > 0) {
              shortBio = sentences.slice(0, 2).join(' ').substring(0, 120).trim();
              if (fullBio.length > 120) shortBio += '…';
            } else {
              shortBio = fullBio.substring(0, 120).trim();
              if (fullBio.length > 120) shortBio += '…';
            }
          }

          artistInfo = {
            name: artist.name || originalName,
            bio: shortBio,
            fullBio: fullBio,
            imageUrl: imageUrl,
            listeners: artist.stats?.listeners ? parseInt(artist.stats.listeners, 10) : undefined,
          };
        } else {
          artistInfo = { name: originalName, imageUrl };
        }
      }
    } catch (lastfmError) {
      console.warn('[Artist Backend] Last.fm fetch failed:', lastfmError.message);
      artistInfo = { name: originalName, imageUrl };
    }
  } else {
    artistInfo = { name: originalName, imageUrl };
  }

  return artistInfo;
}

export const getArtistInfo = async (req, res) => {
  try {
    const { artistName } = req.query;
    if (!artistName) {
      return res.status(400).json({ message: "Artist name is required" });
    }

    const primaryArtist = extractPrimaryArtist(artistName);
    const normalizedArtist = normalizeQueryKey(primaryArtist);
    const cacheKey = `artist:v1:${normalizedArtist}`;

    let cachedData = null;
    try {
      cachedData = await getCache(cacheKey);
    } catch (err) {
      console.warn(`[Cache Fallback] artist: "${artistName}" (Redis read error, falling back to live fetch)`);
    }

    if (cachedData) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Artist Cache HIT] artist: "${artistName}"`);
      }
      return res.json(cachedData);
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[Artist Cache MISS] artist: "${artistName}"`);
    }

    const result = await fetchArtistInfoBackend(primaryArtist, artistName);

    // Skip caching failed/empty responses
    if (result && result.name) {
      try {
        const cacheObject = {
          ...result,
          version: 1,
          cachedAt: new Date().toISOString()
        };
        // TTL is 30 days = 2592000 seconds
        await setCache(cacheKey, cacheObject, 2592000);
      } catch (err) {
        console.warn(`[Cache Fallback] artist: "${artistName}" (Redis write error, failed to write cache)`);
      }
    }

    res.json(result);
  } catch (error) {
    console.error("[Stream] Artist info controller error:", error);
    res.json({ name: artistName });
  }
};

/**
 * Get "Rediscover Favorites" recommendations
 * GET /api/stream/recommendations/rediscover-favorites
 */
export const getRediscoverFavorites = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const cacheKey = `vibra:recommendations:rediscover-favorites:${userId}`;

    // 1. Check Redis Cache (TTL 6 Hours = 21600 seconds)
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        return res.json(parsed);
      }
    } catch (err) {
      console.warn(`[Cache Fallback] rediscover-favorites: ${userId} (Redis read error)`);
    }

    // 2. Fetch User & Liked Songs
    const user = await User.findOne({ clerkId: userId }).populate("likedSongs");
    if (!user) {
      return res.json({ title: "Rediscover Favorites", tracks: [] });
    }

    // 3. Fetch user's entire PlayHistory aggregation stats
    const playStats = await PlayHistory.aggregate([
      { $match: getPlayableMatch({ userId: userId.toString() }) },
      {
        $group: {
          _id: "$songId",
          playCount: { $sum: 1 },
          avgCompletion: { $avg: "$completionPercentage" },
          lastPlayed: { $max: "$playedAt" },
          isExternal: { $first: "$isExternal" },
          externalData: { $first: "$externalData" },
          playDates: { $addToSet: { $dateToString: { format: "%Y-%m-%d", date: "$playedAt" } } }
        }
      }
    ]);

    const candidateMap = new Map();

    const addCandidate = (songId, info) => {
      if (!candidateMap.has(songId)) {
        candidateMap.set(songId, {
          songId,
          title: info.title || "",
          artist: info.artist || "",
          imageUrl: info.imageUrl || "",
          audioUrl: info.audioUrl || info.streamUrl || "",
          duration: info.duration || 0,
          source: info.source || "jiosaavn",
          album: info.album || "",
          externalId: info.externalId || (info.source !== "local" ? songId : undefined),
          isLiked: false,
          playCount: 0,
          avgCompletion: 0,
          playDates: new Set(),
          lastPlayed: null
        });
      }
    };

    // Populate from explicit Liked Songs (local)
    if (Array.isArray(user.likedSongs)) {
      user.likedSongs.forEach(song => {
        if (song && song._id) {
          const id = song._id.toString();
          addCandidate(id, {
            title: song.title,
            artist: song.artist,
            imageUrl: song.imageUrl,
            audioUrl: song.audioUrl,
            duration: song.duration,
            source: "local"
          });
          candidateMap.get(id).isLiked = true;
        }
      });
    }

    // Populate from explicit Liked Songs (external)
    if (Array.isArray(user.likedExternalSongs)) {
      user.likedExternalSongs.forEach(song => {
        if (song && song.externalId) {
          const id = song.externalId;
          addCandidate(id, {
            title: song.title,
            artist: song.artist,
            imageUrl: song.imageUrl,
            audioUrl: song.audioUrl || song.streamUrl,
            duration: song.duration,
            source: song.source || "jiosaavn",
            album: song.album,
            externalId: song.externalId
          });
          candidateMap.get(id).isLiked = true;
        }
      });
    }

    // Populate from PlayHistory aggregation
    playStats.forEach(stat => {
      const id = stat._id;
      if (!id) return;

      let details = {};
      if (stat.isExternal && stat.externalData) {
        details = {
          title: stat.externalData.title,
          artist: stat.externalData.artist,
          imageUrl: stat.externalData.imageUrl,
          audioUrl: stat.externalData.streamUrl,
          duration: stat.externalData.duration,
          source: stat.externalData.source || "jiosaavn",
          album: stat.externalData.album,
          externalId: stat.externalData.externalId
        };
      }

      // Add if playCount >= 3 (minimum for favorite history)
      if (stat.playCount >= 3) {
        addCandidate(id, details);
      }

      // Merge play history stats
      const cand = candidateMap.get(id);
      if (cand) {
        if (!cand.title && details.title) {
          cand.title = details.title;
          cand.artist = details.artist;
          cand.imageUrl = details.imageUrl;
          cand.audioUrl = details.audioUrl;
          cand.duration = details.duration;
          cand.source = details.source;
          cand.album = details.album;
          cand.externalId = details.externalId;
        }
        cand.playCount = stat.playCount;
        cand.avgCompletion = stat.avgCompletion || 0;
        cand.lastPlayed = stat.lastPlayed ? new Date(stat.lastPlayed) : null;
        if (stat.playDates) {
          cand.playDates = new Set(stat.playDates);
        }
      }
    });

    // 4. Exclusions (Recency Filtering & Co-occurrence)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Fetch play logs in the last 30 days
    const recentHistory = await PlayHistory.find({
      userId,
      playedAt: { $gte: thirtyDaysAgo }
    }).select("songId playedAt completionPercentage").lean();

    const playedInLast30Days = new Set();
    const currentSongIds = new Set();
    const continueListeningIds = new Set();

    recentHistory.forEach(h => {
      playedInLast30Days.add(String(h.songId));
      if (h.playedAt >= thirtyMinutesAgo) {
        currentSongIds.add(String(h.songId));
      }
      if (h.completionPercentage >= 10 && h.completionPercentage <= 90) {
        continueListeningIds.add(String(h.songId));
      }
    });

    // Fetch Daily Mix exclusions
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dailyMix = await AIPlaylist.findOne({
      userId,
      "metadata.discoveryType": "daily",
      createdAt: { $gte: todayStart }
    }).lean();
    const dailyMixIds = new Set(dailyMix?.tracks?.map(t => String(t.id || t._id || t.externalId)) || []);

    // Fetch Because You Played exclusions from Redis cache
    const becauseYouPlayedIds = new Set();
    try {
      const cachedByPlayed = await getCache(`vibra:recommendations:because-you-played:${userId}`);
      if (cachedByPlayed && Array.isArray(cachedByPlayed.tracks)) {
        cachedByPlayed.tracks.forEach(t => becauseYouPlayedIds.add(String(t.id || t._id || t.externalId)));
      }
    } catch (err) {
      console.warn("[Rediscover] Failed to read because-you-played cache for exclusions:", err.message);
    }

    const eligibleCandidates = [];

    for (const [songId, cand] of candidateMap.entries()) {
      const sId = String(songId);

      if (playedInLast30Days.has(sId)) continue;
      if (currentSongIds.has(sId)) continue;
      if (continueListeningIds.has(sId)) continue;
      if (dailyMixIds.has(sId)) continue;
      if (becauseYouPlayedIds.has(sId)) continue;
      if (!cand.title || !cand.artist) continue;

      eligibleCandidates.push(cand);
    }

    // 5. Scoring & Reasoning Metadata
    eligibleCandidates.forEach(cand => {
      let score = 0;
      const reasons = [];

      // A. Like status (LikeBoost 40-50: we choose 45)
      if (cand.isLiked) {
        score += 45;
        reasons.push("explicitly liked");
      }

      // B. Play count points (+10 per play, max 100)
      const playPoints = Math.min(cand.playCount * 10, 100);
      score += playPoints;
      if (cand.playCount > 0) {
        reasons.push(`played ${cand.playCount} times historically`);
      }

      // C. Completion rate bonus/penalty
      if (cand.playCount > 0) {
        if (cand.avgCompletion >= 80) {
          score += 30;
          reasons.push("high completion rate");
        } else if (cand.avgCompletion < 30) {
          score -= 50;
          reasons.push("frequently skipped");
        }
      }

      // D. Repeat sessions (+15 per distinct day, max 75)
      const repeatPoints = Math.min(cand.playDates.size * 15, 75);
      score += repeatPoints;
      if (cand.playDates.size > 1) {
        reasons.push(`listened on ${cand.playDates.size} separate days`);
      }

      // E. Nostalgia recency weight
      if (cand.lastPlayed) {
        const daysSinceLastPlay = (Date.now() - cand.lastPlayed.getTime()) / (24 * 60 * 60 * 1000);
        if (daysSinceLastPlay > 180) {
          score += 50;
          reasons.push("last played over 6 months ago");
        } else if (daysSinceLastPlay > 60) {
          score += 30;
          reasons.push("last played over 2 months ago");
        } else if (daysSinceLastPlay > 30) {
          score += 10;
          reasons.push("last played over a month ago");
        }
      } else {
        // Liked but 0 play history (long-time favorite baseline)
        score += 50;
        reasons.push("liked but not yet played");
      }

      cand.favoriteScore = score;
      cand.recommendationReason = reasons.length > 0 
        ? reasons.join(", ") 
        : "nostalgic favorite";
    });

    // Sort descending by score
    eligibleCandidates.sort((a, b) => b.favoriteScore - a.favoriteScore);

    // 6. Rotation segmenting (3-way partition based on day of year)
    const getDayOfYear = () => {
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now - start;
      const oneDay = 1000 * 60 * 60 * 24;
      return Math.floor(diff / oneDay);
    };

    const dayOfYear = getDayOfYear();
    const rotationSegment = dayOfYear % 3;

    const getSongHash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return Math.abs(hash);
    };

    const rotatedCandidates = eligibleCandidates.filter(cand => {
      const hashVal = getSongHash(cand.songId);
      return hashVal % 3 === rotationSegment;
    });

    let finalCandidates = rotatedCandidates;
    if (finalCandidates.length < 6) {
      finalCandidates = eligibleCandidates;
    }

    // 7. Interleaving slotting for diversity
    const artistGroups = {};
    finalCandidates.forEach(cand => {
      const primaryArtist = cand.artist.split(",")[0].trim().toLowerCase();
      if (!artistGroups[primaryArtist]) {
        artistGroups[primaryArtist] = [];
      }
      artistGroups[primaryArtist].push(cand);
    });

    const processedArtistGroups = {};
    Object.keys(artistGroups).forEach(art => {
      const group = artistGroups[art];
      group.sort((a, b) => b.favoriteScore - a.favoriteScore);

      // Max 2 tracks per album within each artist group
      const albumCounts = {};
      const filteredGroup = [];
      group.forEach(cand => {
        const albumKey = (cand.album || "no_album").toLowerCase().trim();
        albumCounts[albumKey] = (albumCounts[albumKey] || 0) + 1;
        if (albumCounts[albumKey] <= 2) {
          filteredGroup.push(cand);
        }
      });
      processedArtistGroups[art] = filteredGroup;
    });

    const interleaved = [];
    const activeArtists = Object.keys(processedArtistGroups);

    let maxTracksPerArtist = 2;
    let simulatedCount = 0;
    activeArtists.forEach(art => {
      simulatedCount += Math.min(processedArtistGroups[art].length, maxTracksPerArtist);
    });

    if (simulatedCount < 6) {
      maxTracksPerArtist = 4;
    }

    for (let round = 0; round < maxTracksPerArtist; round++) {
      activeArtists.forEach(art => {
        const group = processedArtistGroups[art];
        if (group && group.length > round) {
          interleaved.push(group[round]);
        }
      });
    }

    const finalTracks = interleaved.slice(0, 8);

    // Map response tracks format
    const formattedTracks = finalTracks.map(cand => ({
      id: cand.songId,
      title: cand.title,
      artist: cand.artist,
      imageUrl: cand.imageUrl,
      audioUrl: cand.audioUrl,
      duration: cand.duration,
      source: cand.source,
      album: cand.album,
      externalId: cand.externalId,
      recommendationReason: cand.recommendationReason
    }));

    const responseData = {
      title: "Rediscover Favorites",
      tracks: formattedTracks,
      updatedAt: Date.now() // Deterministic fingerprint for silent refresh
    };

    // Cache results in Redis for 30 hours = 108000 seconds
    try {
      await setCache(cacheKey, responseData, 108000);
    } catch (err) {
      console.warn(`[Cache Fallback] Failed to write rediscover-favorites: ${userId} (Redis error)`);
    }

    res.json(responseData);
  } catch (error) {
    console.error("[Stream] Rediscover Favorites controller error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/stream/recommendations/followed-artists
export const getFollowedArtistsRecommendations = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const cacheKey = `vibra:recommendations:followed-artists:${userId}`;

    // 1. Check Redis Cache (TTL 6 Hours = 21600 seconds)
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        return res.json(parsed);
      }
    } catch (err) {
      console.warn(`[Cache Fallback] followed-artists: ${userId} (Redis read error)`);
    }

    // 2. Fetch User followed artists
    const follows = await SavedItem.find({
      userId,
      type: "artist"
    }).lean();

    if (!follows || follows.length === 0) {
      return res.json({ title: "New from Artists You Follow", tracks: [] });
    }

    // 3. Rank followed artists to select the top 15:
    // Rank by recent listening activity (plays in last 30 days) and then most recently followed (createdAt desc)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentArtistPlays = await PlayHistory.aggregate([
      { 
        $match: getPlayableMatch({ 
          userId: userId.toString(), 
          playedAt: { $gte: thirtyDaysAgo },
          "context.type": "artist"
        })
      },
      { $group: { _id: "$context.id", count: { $sum: 1 } } }
    ]);
    const artistPlayMap = new Map(recentArtistPlays.map(ap => [String(ap._id), ap.count]));

    const sortedFollows = [...follows].sort((a, b) => {
      const cleanA = String(a.externalId);
      const cleanB = String(b.externalId);
      
      const countA = artistPlayMap.get(cleanA) || 0;
      const countB = artistPlayMap.get(cleanB) || 0;
      
      if (countA !== countB) {
        return countB - countA; // Higher play count first
      }
      
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const topFollows = sortedFollows.slice(0, 15);

    // 4. Gather Exclusions
    // A. Daily Mix (today's)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailyMix = await AIPlaylist.findOne({
      userId,
      "metadata.discoveryType": "daily",
      createdAt: { $gte: todayStart }
    }).lean();
    const dailyMixIds = new Set(dailyMix?.tracks?.map(t => String(t.externalId || t.id || t._id)) || []);

    // B. Because You Played (Redis cache)
    const becauseYouPlayedIds = new Set();
    try {
      const cachedByPlayed = await getCache(`vibra:recommendations:because-you-played:${userId}`);
      if (cachedByPlayed) {
        const parsed = typeof cachedByPlayed === 'string' ? JSON.parse(cachedByPlayed) : cachedByPlayed;
        const tracks = parsed.tracks || parsed.results || [];
        tracks.forEach(t => becauseYouPlayedIds.add(String(t.externalId || t.id || t._id)));
      }
    } catch (err) {
      console.warn("[ArtistsFollowed] Failed to read because-you-played cache for exclusions:", err.message);
    }

    // C. Rediscover Favorites (Redis cache)
    const rediscoverFavoritesIds = new Set();
    try {
      const cachedRediscover = await getCache(`vibra:recommendations:rediscover-favorites:${userId}`);
      if (cachedRediscover) {
        const parsed = typeof cachedRediscover === 'string' ? JSON.parse(cachedRediscover) : cachedRediscover;
        const tracks = parsed.tracks || parsed.results || [];
        tracks.forEach(t => rediscoverFavoritesIds.add(String(t.externalId || t.id || t._id)));
      }
    } catch (err) {
      console.warn("[ArtistsFollowed] Failed to read rediscover-favorites cache for exclusions:", err.message);
    }

    // D. Play History exclusions (last 7 days, currently playing (last 30 mins), and continue listening (10%-90% in 30 days))
    const recentHistory = await PlayHistory.find({
      userId,
      playedAt: { $gte: thirtyDaysAgo }
    }).select("songId playedAt completionPercentage").lean();

    const playedInLast7Days = new Set();
    const currentlyPlayingIds = new Set();
    const continueListeningIds = new Set();

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    recentHistory.forEach(h => {
      const sId = String(h.songId);
      if (h.playedAt >= sevenDaysAgo) {
        playedInLast7Days.add(sId);
      }
      if (h.playedAt >= thirtyMinutesAgo) {
        currentlyPlayingIds.add(sId);
      }
      if (h.completionPercentage >= 10 && h.completionPercentage <= 90) {
        continueListeningIds.add(sId);
      }
    });

    const isExcluded = (id) => {
      const sId = String(id);
      return (
        dailyMixIds.has(sId) ||
        becauseYouPlayedIds.has(sId) ||
        rediscoverFavoritesIds.has(sId) ||
        continueListeningIds.has(sId) ||
        currentlyPlayingIds.has(sId) ||
        playedInLast7Days.has(sId)
      );
    };

    // 5. Fetch artist pages from JioSaavn in parallel
    const artistIds = topFollows.map(f => String(f.externalId).replace(/^jiosaavn_artist_/, ""));
    const artistPageResults = await Promise.allSettled(
      artistIds.map(id => jiosaavn.getArtist(id))
    );

    const artistsData = [];
    artistPageResults.forEach((r, idx) => {
      if (r.status === "fulfilled" && r.value) {
        artistsData.push({
          artistId: String(topFollows[idx].externalId).replace(/^jiosaavn_artist_/, ""),
          artistName: topFollows[idx].title,
          artistImage: r.value.imageUrl || "",
          data: r.value
        });
      }
    });

    // 6. Partition tracks per artist into categories
    const currentYear = now.getFullYear();
    const artistPools = artistsData.map(({ artistId, artistName, artistImage, data }) => {
      const topSongs = data.topSongs || [];
      
      const filteredSongs = topSongs.filter(t => !isExcluded(t.externalId || t.id || t._id));

      // Recent releases (year >= currentYear - 1)
      const recentPool = filteredSongs.filter(t => {
        const y = parseInt(t.year);
        return !isNaN(y) && y >= currentYear - 1;
      });

      // Popular tracks (original order - first 5 from what remains)
      const recentIds = new Set(recentPool.map(t => String(t.externalId || t.id || t._id)));
      const popularPool = filteredSongs
        .filter(t => !recentIds.has(String(t.externalId || t.id || t._id)))
        .slice(0, 5);

      // Catalog / Deep Cuts (remaining tracks)
      const popularIds = new Set(popularPool.map(t => String(t.externalId || t.id || t._id)));
      const catalogPool = filteredSongs.filter(t => 
        !recentIds.has(String(t.externalId || t.id || t._id)) && 
        !popularIds.has(String(t.externalId || t.id || t._id))
      );

      return {
        artistId,
        artistName,
        artistImage,
        recentPool,
        popularPool,
        catalogPool
      };
    });

    // 7. Interleave selection using round-robin slotting
    const selectedTracks = [];
    const selectedIds = new Set();
    const artistCount = new Map(); // Max 3 tracks per artist

    const addTrack = (track, reason, artistId, artistName, artistImage) => {
      const id = String(track.externalId || track.id || track._id);
      if (selectedIds.has(id)) return false;
      
      const art = track.artist || "";
      const artKey = art.toLowerCase();
      const count = artistCount.get(artKey) || 0;
      if (count >= 3) return false;

      selectedTracks.push({
        id: track.externalId || id,
        title: track.title,
        artist: track.artist,
        imageUrl: track.imageUrl,
        audioUrl: track.streamUrl || track.audioUrl,
        duration: track.duration,
        source: track.source || "jiosaavn",
        album: track.album || "",
        externalId: track.externalId,
        recommendationReason: reason,
        sourceArtistId: artistId,
        sourceArtistName: artistName,
        sourceArtistImage: artistImage
      });

      selectedIds.add(id);
      artistCount.set(artKey, count + 1);
      return true;
    };

    let recentSelected = 0;
    let popularSelected = 0;
    let catalogSelected = 0;

    // A. First pass for Recent Releases (Target: 8, max 1 per artist)
    let roundIndex = 0;
    let activeRecentPools = artistPools.filter(ap => ap.recentPool.length > 0);
    while (recentSelected < 8 && activeRecentPools.length > 0) {
      let addedInRound = false;
      activeRecentPools.forEach(ap => {
        if (recentSelected >= 8) return;
        const track = ap.recentPool[roundIndex];
        if (track) {
          const artKey = ap.artistName.toLowerCase();
          if ((artistCount.get(artKey) || 0) < 1) {
            if (addTrack(track, "New Release", ap.artistId, ap.artistName, ap.artistImage)) {
              recentSelected++;
              addedInRound = true;
            }
          }
        }
      });
      roundIndex++;
      if (roundIndex >= 5 || !addedInRound) break;
    }

    // B. Second pass for Recent Releases (up to target 8, relax to max 3 per artist)
    roundIndex = 0;
    while (recentSelected < 8 && activeRecentPools.length > 0) {
      let addedInRound = false;
      activeRecentPools.forEach(ap => {
        if (recentSelected >= 8) return;
        const track = ap.recentPool[roundIndex];
        if (track) {
          if (addTrack(track, "New Release", ap.artistId, ap.artistName, ap.artistImage)) {
            recentSelected++;
            addedInRound = true;
          }
        }
      });
      roundIndex++;
      if (roundIndex >= 5 || !addedInRound) break;
    }

    // C. First pass for Popular Tracks (Target: 8, max 1 per artist)
    roundIndex = 0;
    let activePopularPools = artistPools.filter(ap => ap.popularPool.length > 0);
    while (popularSelected < 8 && activePopularPools.length > 0) {
      let addedInRound = false;
      activePopularPools.forEach(ap => {
        if (popularSelected >= 8) return;
        const track = ap.popularPool[roundIndex];
        if (track) {
          const artKey = ap.artistName.toLowerCase();
          if ((artistCount.get(artKey) || 0) < 1) {
            if (addTrack(track, "Popular Track", ap.artistId, ap.artistName, ap.artistImage)) {
              popularSelected++;
              addedInRound = true;
            }
          }
        }
      });
      roundIndex++;
      if (roundIndex >= 5 || !addedInRound) break;
    }

    // D. Second pass for Popular Tracks (up to target 8, relax to max 3 per artist)
    roundIndex = 0;
    while (popularSelected < 8 && activePopularPools.length > 0) {
      let addedInRound = false;
      activePopularPools.forEach(ap => {
        if (popularSelected >= 8) return;
        const track = ap.popularPool[roundIndex];
        if (track) {
          if (addTrack(track, "Popular Track", ap.artistId, ap.artistName, ap.artistImage)) {
            popularSelected++;
            addedInRound = true;
          }
        }
      });
      roundIndex++;
      if (roundIndex >= 5 || !addedInRound) break;
    }

    // E. First pass for Catalog / Deep Cuts (Target: 4, max 1 per artist)
    roundIndex = 0;
    let activeCatalogPools = artistPools.filter(ap => ap.catalogPool.length > 0);
    while (catalogSelected < 4 && activeCatalogPools.length > 0) {
      let addedInRound = false;
      activeCatalogPools.forEach(ap => {
        if (catalogSelected >= 4) return;
        const track = ap.catalogPool[roundIndex];
        if (track) {
          const artKey = ap.artistName.toLowerCase();
          if ((artistCount.get(artKey) || 0) < 1) {
            if (addTrack(track, "Hidden Gem", ap.artistId, ap.artistName, ap.artistImage)) {
              catalogSelected++;
              addedInRound = true;
            }
          }
        }
      });
      roundIndex++;
      if (roundIndex >= 10 || !addedInRound) break;
    }

    // F. Second pass for Catalog / Deep Cuts (up to target 4, relax to max 3 per artist)
    roundIndex = 0;
    while (catalogSelected < 4 && activeCatalogPools.length > 0) {
      let addedInRound = false;
      activeCatalogPools.forEach(ap => {
        if (catalogSelected >= 4) return;
        const track = ap.catalogPool[roundIndex];
        if (track) {
          if (addTrack(track, "Hidden Gem", ap.artistId, ap.artistName, ap.artistImage)) {
            catalogSelected++;
            addedInRound = true;
          }
        }
      });
      roundIndex++;
      if (roundIndex >= 10 || !addedInRound) break;
    }

    // G. Fallback Backfill: if total < 20, fill using any remaining tracks from all pools
    let backfillAttempts = 0;
    while (selectedTracks.length < 20 && backfillAttempts < 10) {
      let addedAny = false;
      artistPools.forEach(ap => {
        if (selectedTracks.length >= 20) return;
        
        const allArtistTracks = [
          ...ap.recentPool.map(t => ({ t, r: "New Release" })),
          ...ap.popularPool.map(t => ({ t, r: "Popular Track" })),
          ...ap.catalogPool.map(t => ({ t, r: "Hidden Gem" }))
        ];

        for (const { t, r } of allArtistTracks) {
          if (addTrack(t, r, ap.artistId, ap.artistName, ap.artistImage)) {
            addedAny = true;
            break;
          }
        }
      });
      if (!addedAny) break;
      backfillAttempts++;
    }

    // 8. Group by Artist and Apply Refined Limits
    const groupsMap = new Map();
    const orderedGroupsList = [];

    selectedTracks.forEach(track => {
      const { sourceArtistId, sourceArtistName, sourceArtistImage } = track;
      const cleanTrack = { ...track };
      delete cleanTrack.sourceArtistId;
      delete cleanTrack.sourceArtistName;
      delete cleanTrack.sourceArtistImage;

      if (!groupsMap.has(sourceArtistId)) {
        const newGroup = {
          artistId: sourceArtistId,
          artistName: sourceArtistName,
          artistImage: sourceArtistImage,
          tracks: [cleanTrack]
        };
        groupsMap.set(sourceArtistId, newGroup);
        orderedGroupsList.push(newGroup);
      } else {
        const group = groupsMap.get(sourceArtistId);
        if (group.tracks.length < 3) {
          group.tracks.push(cleanTrack);
        }
      }
    });

    const finalGroups = orderedGroupsList
      .filter(g => g.tracks.length >= 2)
      .slice(0, 2);

    // Cache results in Redis for 30 hours = 108000 seconds
    try {
      await setCache(cacheKey, finalGroups, 108000);
    } catch (err) {
      console.warn(`[Cache Fallback] Failed to write followed-artists cache: ${userId} (Redis error)`);
    }

    res.json(finalGroups);
  } catch (error) {
    console.error("[Stream] Followed artists recommendations controller error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};