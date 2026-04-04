/**
 * Advanced metadata cleaning utility for YouTube/YouTube Music titles.
 * Prioritizes preserving artist/album context while stripping technical noise.
 */

const NOISE_WORDS = [
  "official",
  "video",
  "lyrics",
  "lyric",
  "hd",
  "4k",
  "remix",
  "lofi",
  "8d",
  "bass boosted",
  "slowed",
  "reverb",
  "audio",
  "full video",
  "music video",
  "trailer",
  "exclusive"
];

/**
 * Robust title cleaner that follows specific noise-removal rules.
 * @param {string} title 
 * @returns {string}
 */
export function cleanTitle(title) {
  if (!title) return "";

  let cleaned = title;

  // 1. Remove bracketed sections ONLY if they contain noise words
  // Match (...), [...], {...}
  const bracketRegex = /[\(\[\{][^()\[\]{}]*[\)\]\}]/g;
  cleaned = cleaned.replace(bracketRegex, (match) => {
    const inner = match.toLowerCase();
    const hasNoise = NOISE_WORDS.some(word => inner.includes(word));
    return hasNoise ? "" : match;
  });

  // 2. Remove pipes and everything after them if it looks like a separator
  cleaned = cleaned.replace(/\|.*$/g, "");

  // 3. Handle "From [Movie]" or "Song - Movie" patterns
  // If it contains " - From " or "(From ", we might want to prioritize the prefix
  cleaned = cleaned.replace(/\s+-\s+From\s+.*$/gi, ""); // "Song - From Movie" -> "Song"
  cleaned = cleaned.replace(/\(\s*From\s+.*?\)/gi, ""); // "Song (From Movie)" -> "Song"

  // 4. Remove standalone noise words
  NOISE_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    cleaned = cleaned.replace(regex, "");
  });

  // 4. Cleanup remaining special characters and extra spaces
  cleaned = cleaned
    .replace(/[#@]/g, "") // remove common social tags
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

/**
 * Extracts artist from title if YouTube Music doesn't provide it.
 * Fallback logic: Split by " - " or " | "
 * @param {string} title 
 * @returns {{title: string, artist: string|null}}
 */
export function splitTitleAndArtist(title) {
  if (!title) return { title: "", artist: null };

  const separators = [" - ", " | ", " – ", " — "]; // various hyphen types
  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep);
      if (parts.length >= 2) {
        return {
          title: parts[0].trim(),
          artist: parts[1].trim()
        };
      }
    }
  }

  return { title, artist: null };
}
