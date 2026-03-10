// lib/lyrics.ts (React Native)

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export interface LyricsResult {
  syncedLyrics: LyricLine[] | null;
  plainLyrics: string | null;
  source: string;
}

// Parse LRC format: [mm:ss.xx] text
function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
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

// Clean up search terms
function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(.*?\)\s*/g, ' ') // remove (feat. ...), (Official Video), etc.
    .replace(/\s*\[.*?\]\s*/g, ' ') // remove [Explicit], [HD], etc.
    .replace(/\s*-\s*(Official|Music|Video|Audio|Lyric|Lyrics|HD|HQ|4K).*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanArtist(artist: string): string {
  return artist
    .split(/[,&]/)[0] // take first artist
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ⚠️ MOBILE-SPECIFIC: Manual timeout implementation
 * React Native doesn't support AbortSignal.timeout()
 */
function createTimeoutController(ms: number): AbortController {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  
  // Clean up timeout if request completes normally
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
  });
  
  return controller;
}

/**
 * ⚠️ MOBILE-SPECIFIC: Retry with exponential backoff
 * Mobile networks are unreliable
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = 2
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on abort
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError || new Error('Fetch failed');
}

export async function fetchLyrics(
  title: string,
  artist: string,
  duration?: number,
  signal?: AbortSignal // Allow external abort controller
): Promise<LyricsResult> {
  const cleanedTitle = cleanTitle(title);
  const cleanedArtist = cleanArtist(artist);

  // Try exact match first
  try {
    const params = new URLSearchParams({
      artist_name: cleanedArtist,
      track_name: cleanedTitle,
      ...(duration ? { duration: String(Math.round(duration)) } : {}),
    });

    const controller = createTimeoutController(8000);
    
    // Combine external signal with timeout
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    const res = await fetchWithRetry(
      `https://lrclib.net/api/get?${params}`,
      {
        headers: { 'User-Agent': 'Vibra Music App v1.0' },
        signal: controller.signal,
      },
      1 // Only 1 retry for exact match
    );

    if (res.ok) {
      const data = await res.json();
      return {
        syncedLyrics: data.syncedLyrics ? parseLRC(data.syncedLyrics) : null,
        plainLyrics: data.plainLyrics || null,
        source: 'lrclib',
      };
    }
  } catch (e) {
    // Log error for debugging (remove in production or use error tracking service)
    if (__DEV__) {
      console.log('[Lyrics] Exact match failed:', e);
    }
    // Fall through to search
  }

  // Fallback: search endpoint
  try {
    const params = new URLSearchParams({
      q: `${cleanedArtist} ${cleanedTitle}`,
    });

    const controller = createTimeoutController(10000);
    
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    const res = await fetchWithRetry(
      `https://lrclib.net/api/search?${params}`,
      {
        headers: { 'User-Agent': 'Vibra Music App v1.0' },
        signal: controller.signal,
      },
      2 // 2 retries for search
    );

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
    if (__DEV__) {
      console.log('[Lyrics] Search failed:', e);
    }
    // Fall through to return empty
  }

  return { syncedLyrics: null, plainLyrics: null, source: '' };
}

export async function fetchLyricsFallback(
  title: string,
  artist: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const cleanedArtist = cleanArtist(artist);
    const cleanedTitle = cleanTitle(title);
    
    const controller = createTimeoutController(8000);
    
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    const res = await fetchWithRetry(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanedArtist)}/${encodeURIComponent(cleanedTitle)}`,
      {
        signal: controller.signal,
      },
      1 // Only 1 retry for fallback
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.lyrics || null;
  } catch (e) {
    if (__DEV__) {
      console.log('[Lyrics] Fallback failed:', e);
    }
    return null;
  }
}