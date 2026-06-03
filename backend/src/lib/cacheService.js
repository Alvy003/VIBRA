// backend/src/lib/cacheService.js
import { redis, isConfigured } from "./redisClient.js";

/**
 * Normalize search queries for caching keys
 * Lowercase, trimmed, spaces collapsed to underscores
 */
export const normalizeQueryKey = (query) => {
  if (!query) return "";
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
};

/**
 * Recursively sanitizes data before caching to ensure NO streamUrl, _encUrl, or signed CDN links exist.
 * This is crucial to avoid "android-io-bad-http-status" playback failures due to expired/stale tokens.
 */
export const sanitizePayload = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizePayload(item));
  }

  if (typeof data === "object") {
    const sanitized = {};
    for (const key of Object.keys(data)) {
      // Exclude streamUrl and _encUrl keys
      if (key === "streamUrl" || key === "_encUrl") {
        continue;
      }
      
      const val = data[key];
      
      // If it's a string, double check if it contains JioSaavn CDN stream URLs
      if (typeof val === "string") {
        const lowerVal = val.toLowerCase();
        if (lowerVal.includes("saavncdn.com") && (lowerVal.includes(".mp4") || lowerVal.includes(".mp3"))) {
          continue;
        }
      }
      
      sanitized[key] = sanitizePayload(val);
    }
    return sanitized;
  }

  return data;
};

/**
 * Retrieve a value from the cache
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export const getCache = async (key) => {
  if (!isConfigured || !redis) {
    return null;
  }

  try {
    const data = await redis.get(key);
    if (!data) {
      return null;
    }

    if (typeof data === "object") {
      return data;
    }

    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  } catch (err) {
    console.warn(`[Redis Cache] Get failed for key "${key}":`, err.message);
    return null;
  }
};

/**
 * Store a value in the cache with a TTL (in seconds)
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds
 * @returns {Promise<boolean>}
 */
export const setCache = async (key, value, ttlSeconds) => {
  if (!isConfigured || !redis) {
    return false;
  }

  try {
    // Sanitize payload to strip streamUrl, _encUrl, etc.
    const sanitizedValue = sanitizePayload(value);
    const stringified = JSON.stringify(sanitizedValue);
    
    if (ttlSeconds && ttlSeconds > 0) {
      await redis.set(key, stringified, { ex: ttlSeconds });
    } else {
      await redis.set(key, stringified);
    }
    return true;
  } catch (err) {
    console.warn(`[Redis Cache] Set failed for key "${key}":`, err.message);
    return false;
  }
};

/**
 * Delete a key from cache
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export const deleteCache = async (key) => {
  if (!isConfigured || !redis) {
    return false;
  }

  try {
    await redis.del(key);
    return true;
  } catch (err) {
    console.warn(`[Redis Cache] Delete failed for key "${key}":`, err.message);
    return false;
  }
};
