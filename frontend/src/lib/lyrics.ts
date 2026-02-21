// src/lib/lyrics.ts

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
  
    for (const line of lrc.split("\n")) {
      const match = line.match(regex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const ms = parseInt(match[3].padEnd(3, "0"), 10);
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
      .replace(/\s*\(.*?\)\s*/g, " ") // remove (feat. ...), (Official Video), etc.
      .replace(/\s*\[.*?\]\s*/g, " ") // remove [Explicit], [HD], etc.
      .replace(/\s*-\s*(Official|Music|Video|Audio|Lyric|Lyrics|HD|HQ|4K).*/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  function cleanArtist(artist: string): string {
    return artist
      .split(/[,&]/)[0] // take first artist
      .replace(/\s*\(.*?\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  export async function fetchLyrics(
    title: string,
    artist: string,
    duration?: number
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
  
      const res = await fetch(`https://lrclib.net/api/get?${params}`, {
        headers: { "User-Agent": "Vibra Music App v1.0" },
      });
  
      if (res.ok) {
        const data = await res.json();
        return {
          syncedLyrics: data.syncedLyrics ? parseLRC(data.syncedLyrics) : null,
          plainLyrics: data.plainLyrics || null,
          source: "lrclib",
        };
      }
    } catch (e) {
      // fall through to search
    }
  
    // Fallback: search endpoint
    try {
      const params = new URLSearchParams({
        q: `${cleanedArtist} ${cleanedTitle}`,
      });
  
      const res = await fetch(`https://lrclib.net/api/search?${params}`, {
        headers: { "User-Agent": "Vibra Music App v1.0" },
      });
  
      if (res.ok) {
        const results = await res.json();
        if (results.length > 0) {
          const best = results[0];
          return {
            syncedLyrics: best.syncedLyrics ? parseLRC(best.syncedLyrics) : null,
            plainLyrics: best.plainLyrics || null,
            source: "lrclib",
          };
        }
      }
    } catch (e) {
      // no results
    }
  
    return { syncedLyrics: null, plainLyrics: null, source: "" };
  }

  // Add at the end of the file

export async function fetchLyricsFallback(
  title: string,
  artist: string
): Promise<string | null> {
  try {
    const cleanedArtist = cleanArtist(artist);
    const cleanedTitle = cleanTitle(title);
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanedArtist)}/${encodeURIComponent(cleanedTitle)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.lyrics || null;
  } catch {
    return null;
  }
}