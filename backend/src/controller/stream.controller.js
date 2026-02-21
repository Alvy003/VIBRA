// controller/stream.controller.js
import { jiosaavn, youtube } from "../lib/streamProviders.js";
import fetch from "node-fetch";

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

export const proxyAudio = async (req, res) => {
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

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.jiosaavn.com/",
        Origin: "https://www.jiosaavn.com",
        Accept: "audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,*/*;q=0.5",
        "Accept-Language": "en-US,en;q=0.9",
        Range: req.headers.range || "bytes=0-",
      },
    });

    if (!response.ok && response.status !== 206) {
      return res
        .status(response.status)
        .json({ message: "Stream fetch failed" });
    }

    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");
    const acceptRanges = response.headers.get("accept-ranges");

    res.status(response.status);
    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);
    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");

    response.body.pipe(res);
  } catch (error) {
    console.error("[Proxy] Error:", error.message);
    res.status(500).json({ message: "Proxy failed" });
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
      const results = await jiosaavn.getRecommendations(
        id,
        parseInt(limit) * 2,
        languages
      );
      
      // *** DEDUPLICATE HERE ***
      const deduplicated = deduplicateSongs(results, 90);
      
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
  const title1 = normalizeSongTitle(song1.title);
  const title2 = normalizeSongTitle(song2.title);
  const artist1 = normalizeArtistName(song1.artist);
  const artist2 = normalizeArtistName(song2.artist);
  
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
    const key = `${normalizeSongTitle(song.title)}_${normalizeArtistName(song.artist)}`;
    
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