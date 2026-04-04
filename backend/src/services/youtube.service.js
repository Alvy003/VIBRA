// services/youtube.service.js
import YTMusic from 'ytmusic-api';

const yt = new YTMusic();
let isInitialized = false;

/**
 * Ensures the YTMusic API is initialized.
 */
async function ensureInitialized() {
  if (!isInitialized) {
    try {
       await yt.initialize();
       isInitialized = true;
    } catch (err) {
       console.error("[YTMusic] Initialization failed:", err.message);
    }
  }
}

/**
 * Searches YouTube Music for songs using ytmusic-api
 * @param {string} query 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export const searchYouTubeMusic = async (query, limit = 30) => {
  try {
    await ensureInitialized();
    console.log(`[YTMusic] Searching for: "${query}" (limit: ${limit})`);
    
    // searchSongs returns highly accurate metadata
    const results = await yt.searchSongs(query);

    if (!results || !Array.isArray(results)) {
      return [];
    }

    // Normalize structure: { title, artist, album }
    const normalized = results.slice(0, limit).map(track => ({
      videoId: track.videoId,
      title: track.name, // ytmusic-api uses 'name' for track title in searchSongs
      artist: track.artists?.[0]?.name || "Unknown Artist",
      album: track.album?.name || null,
      imageUrl: track.thumbnails?.[track.thumbnails.length - 1]?.url || null, // Best quality thumbnail
      source: "youtube"
    }));

    // console.log(`[YTMusic] Found ${normalized.length} tracks.`);
    return normalized;
  } catch (error) {
    console.error("[YTMusic] Search failed:", error.message);
    return [];
  }
};

/**
 * Gets related tracks (Radio/Up Next) for a seed videoId
 * @param {string} videoId 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export const getYouTubeMusicRelated = async (videoId, limit = 15) => {
  try {
    await ensureInitialized();
    // ytmusic-api might not have a direct getRelated for discovery mix
    // but searchSongs is usually enough for the primary pipeline.
    // If needed, we could use other methods from ytmusic-api if they existed.
    // For now, let's keep it minimal as searchSongs is the main requirement.
    return []; 
  } catch (error) {
    return [];
  }
};
