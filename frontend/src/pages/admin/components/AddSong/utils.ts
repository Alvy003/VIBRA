import {
    AUDIO_EXTENSIONS,
    IMAGE_EXTENSIONS,
    MAX_AUDIO_SIZE_BYTES,
    MAX_IMAGE_SIZE_BYTES,
    CJK_REGEX,
    CYRILLIC_REGEX,
    ARABIC_REGEX,
    SOUNDTRACK_INDICATORS,
    DEPRIORITIZE_ARTISTS,
    LANGUAGE_ALBUMS,
    MOOD_ALBUMS,
    ALBUM_CAPACITY_LIMIT,
    TAG_TO_GENRE,
    TAG_TO_MOOD,
    TAG_TO_LANGUAGE,
  } from "./constants";
  
  import type {
    ParsedMetadata,
    MetadataResult,
    MetadataWarning,
    AlbumSuggestion,
  } from "./constants";

  import { axiosInstance } from "@/lib/axios";
  
  // ============================================================================
  // TEXT UTILITIES
  // ============================================================================
  
  export const detectLanguage = (text: string): MetadataResult["language"] => {
    if (!text) return "unknown";
  
    const hasCJK = CJK_REGEX.test(text);
    const hasCyrillic = CYRILLIC_REGEX.test(text);
    const hasArabic = ARABIC_REGEX.test(text);
    const hasLatin = /[a-zA-Z]/.test(text);
  
    const scripts = [hasCJK, hasCyrillic, hasArabic, hasLatin].filter(Boolean).length;
  
    if (scripts > 1) return "mixed";
    if (hasCJK) return "cjk";
    if (hasCyrillic) return "cyrillic";
    if (hasArabic) return "arabic";
    if (hasLatin) return "latin";
  
    return "unknown";
  };
  
  export const isSoundtrackContent = (title: string, artist: string, album?: string): boolean => {
    const combined = `${title} ${artist} ${album || ""}`.toLowerCase();
    return SOUNDTRACK_INDICATORS.some((indicator) => combined.includes(indicator));
  };
  
  export const isGenericArtist = (artist: string): boolean => {
    const lowerArtist = artist.toLowerCase();
    return DEPRIORITIZE_ARTISTS.some((term) => lowerArtist.includes(term));
  };
  
  export const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
  
    if (s1 === s2) return 1;
    if (!s1 || !s2) return 0;
  
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
  
    const longerLength = longer.length;
    if (longerLength === 0) return 1;
  
    const matrix: number[][] = [];
  
    for (let i = 0; i <= shorter.length; i++) {
      matrix[i] = [i];
    }
  
    for (let j = 0; j <= longer.length; j++) {
      matrix[0][j] = j;
    }
  
    for (let i = 1; i <= shorter.length; i++) {
      for (let j = 1; j <= longer.length; j++) {
        if (shorter.charAt(i - 1) === longer.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
  
    return (longerLength - matrix[shorter.length][longer.length]) / longerLength;
  };
  
  export const isSimilar = (str1: string, str2: string, threshold = 0.8): boolean => {
    return calculateSimilarity(str1, str2) >= threshold;
  };
  
  export const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/feat\.?.*$/i, "")
      .replace(/ft\.?.*$/i, "")
      .replace(/&.*$/i, "")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };
  
  // ============================================================================
  // FILE UTILITIES
  // ============================================================================
  
  export const getFileExtension = (filename: string): string => {
    return filename.substring(filename.lastIndexOf(".")).toLowerCase();
  };
  
  export const isAudioFile = (file: File): boolean => {
    const ext = getFileExtension(file.name);
    return AUDIO_EXTENSIONS.includes(ext) || file.type.startsWith("audio/");
  };
  
  export const isImageFile = (file: File): boolean => {
    const ext = getFileExtension(file.name);
    return IMAGE_EXTENSIONS.includes(ext) || file.type.startsWith("image/");
  };
  
  export const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };
  
  export const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
  
      audio.addEventListener("loadedmetadata", () => {
        URL.revokeObjectURL(objectUrl);
        resolve(Math.round(audio.duration));
      });
  
      audio.addEventListener("error", () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load audio metadata"));
      });
  
      audio.src = objectUrl;
    });
  };
  
  export const generateId = () => Math.random().toString(36).substring(2, 9);
  
  // ============================================================================
  // FILENAME PARSING
  // ============================================================================
  
  export const parseFilename = (filename: string): ParsedMetadata => {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
    let cleaned = nameWithoutExt
      .replace(/^[\d]+[\s._-]+/, "")
      .replace(/\s*\(Official\s*(Audio|Video|Music\s*Video)?\)\s*/gi, "")
      .replace(/\s*\[Official\s*(Audio|Video|Music\s*Video)?\]\s*/gi, "")
      .replace(/\s*\(Lyrics?\)\s*/gi, "")
      .replace(/\s*\[Lyrics?\]\s*/gi, "")
      .replace(/\s*\(HD\)\s*/gi, "")
      .replace(/\s*\(HQ\)\s*/gi, "")
      .replace(/\s*\(Audio\)\s*/gi, "")
      .replace(/\s*320kbps\s*/gi, "")
      .replace(/\s*128kbps\s*/gi, "")
      .replace(/\s*\(Live\)\s*/gi, " (Live)")
      .replace(/\s*\[[A-Za-z0-9_-]{8,15}\]\s*/g, "")
      .replace(/_/g, " ")
      .trim();
  
    const separators = [" - ", " – ", " — ", " ~ ", " _ "];
  
    for (const sep of separators) {
      if (cleaned.includes(sep)) {
        const parts = cleaned.split(sep).map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          return {
            artist: parts[0],
            title: parts.slice(1).join(" - "),
            confidence: 0.8,
          };
        }
      }
    }
  
    return {
      title: cleaned,
      artist: "",
      confidence: 0.4,
    };
  };
  
  // ============================================================================
  // METADATA VALIDATION
  // ============================================================================
  
  export const extractPrimaryArtist = (artistString: string, allArtists?: any[]): string => {
    if (!artistString) return "";
  
    if (allArtists && allArtists.length > 0) {
      const mainArtists = allArtists.filter((a) => {
        const name = typeof a === "string" ? a : a.name || a.artistName || "";
        return !isGenericArtist(name);
      });
  
      if (mainArtists.length > 0) {
        const first = mainArtists[0];
        return typeof first === "string" ? first : first.name || first.artistName || artistString;
      }
    }
  
    const delimiters = [" feat. ", " ft. ", " featuring ", " & ", ", ", " x ", " X ", " with ", " vs ", " vs. "];
  
    let artists = [artistString];
    for (const delim of delimiters) {
      const newArtists: string[] = [];
      for (const a of artists) {
        newArtists.push(...a.split(delim));
      }
      artists = newArtists;
    }
  
    artists = artists.map((a) => a.trim()).filter((a) => a.length > 0);
  
    for (const artist of artists) {
      if (!isGenericArtist(artist)) {
        return artist;
      }
    }
  
    return artists[0] || artistString;
  };
  
  export const validateMetadataResult = (
    result: { title: string; artist: string; album?: string; score?: number; allArtists?: any[] },
    filenameData: ParsedMetadata,
    source: MetadataResult["source"]
  ): MetadataResult => {
    const warnings: MetadataWarning[] = [];
    let confidence = (result.score || 50) / 100;
  
    const originalArtist = result.artist;
    const primaryArtist = extractPrimaryArtist(result.artist, result.allArtists);
  
    if (isGenericArtist(originalArtist) && primaryArtist !== originalArtist) {
      warnings.push("generic_artist");
    }
  
    const titleLang = detectLanguage(result.title);
    const artistLang = detectLanguage(primaryArtist);
    const language = titleLang === artistLang ? titleLang : "mixed";
  
    const filenameLang = detectLanguage(filenameData.title + " " + filenameData.artist);
    if (filenameLang === "latin" && (titleLang !== "latin" || artistLang !== "latin")) {
      warnings.push("non_latin");
      confidence *= 0.3;
    }
  
    const isSoundtrack = isSoundtrackContent(result.title, primaryArtist, result.album);
    if (isSoundtrack) {
      warnings.push("soundtrack");
      confidence *= 0.7;
    }
  
    const titleSimilarity = calculateSimilarity(
      normalizeText(result.title),
      normalizeText(filenameData.title)
    );
    const artistSimilarity = filenameData.artist
      ? calculateSimilarity(normalizeText(primaryArtist), normalizeText(filenameData.artist))
      : 0.5;
  
    const matchesFilename = titleSimilarity > 0.6 || artistSimilarity > 0.6;
  
    if (!matchesFilename && confidence > 0.3) {
      warnings.push("mismatch_filename");
      confidence *= 0.6;
    } else if (matchesFilename) {
      confidence = Math.min(1, confidence * 1.2);
    }
  
    const genericTitles = ["untitled", "track", "audio", "song", "music"];
    if (genericTitles.some((g) => result.title.toLowerCase().includes(g))) {
      warnings.push("generic_title");
      confidence *= 0.5;
    }
  
    if (confidence < 0.5) {
      warnings.push("low_confidence");
    }
  
    return {
      title: result.title,
      artist: primaryArtist,
      originalArtist: originalArtist !== primaryArtist ? originalArtist : undefined,
      album: result.album,
      score: result.score || 50,
      source,
      confidence: Math.max(0, Math.min(1, confidence)),
      warnings,
      language,
      isSoundtrack,
      matchesFilename,
    };
  };
  
  // ============================================================================
  // FILE MATCHING
  // ============================================================================
  
  export const normalizeFilenameForMatching = (filename: string): string => {
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."));
  
    return nameWithoutExt
      .replace(/\s*\[[A-Za-z0-9_-]{6,15}\]\s*/g, "")
      .replace(/\s*\(.*?\)\s*/g, "")
      .replace(/\s*{.*?}\s*/g, "")
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();
  };
  
  export const extractCoreName = (filename: string): string => {
    const normalized = normalizeFilenameForMatching(filename);
    const words = normalized.split(" ").filter((w) => w.length > 2);
    return words.slice(0, 3).join(" ");
  };
  
  export const matchFilesFromFolder = (files: File[]): { audio: File; image: File | null }[] => {
    const audioFiles = files.filter(isAudioFile);
    const imageFiles = files.filter(isImageFile);
  
    const pairs: { audio: File; image: File | null }[] = [];
    const usedImages = new Set<string>();
  
    for (const audio of audioFiles) {
      if (audio.size > MAX_AUDIO_SIZE_BYTES) continue;
  
      const audioNormalized = normalizeFilenameForMatching(audio.name);
      const audioCore = extractCoreName(audio.name);
  
      let matchedImage: File | null = null;
      let bestMatchScore = 0;
  
      for (const image of imageFiles) {
        if (usedImages.has(image.name)) continue;
        if (image.size > MAX_IMAGE_SIZE_BYTES) continue;
  
        const imageNormalized = normalizeFilenameForMatching(image.name);
        const imageCore = extractCoreName(image.name);
  
        if (imageNormalized === audioNormalized) {
          matchedImage = image;
          bestMatchScore = 1;
          break;
        }
  
        if (
          audioCore && imageCore &&
          (audioCore === imageCore ||
            audioCore.startsWith(imageCore) ||
            imageCore.startsWith(audioCore))
        ) {
          if (bestMatchScore < 0.95) {
            bestMatchScore = 0.95;
            matchedImage = image;
          }
          continue;
        }
  
        if (audioNormalized.startsWith(imageNormalized) || imageNormalized.startsWith(audioNormalized)) {
          if (bestMatchScore < 0.9) {
            bestMatchScore = 0.9;
            matchedImage = image;
          }
          continue;
        }
  
        const similarity = calculateSimilarity(audioNormalized, imageNormalized);
        if (similarity > bestMatchScore && similarity > 0.5) {
          bestMatchScore = similarity;
          matchedImage = image;
        }
      }
  
      if (matchedImage) {
        usedImages.add(matchedImage.name);
      }
  
      pairs.push({ audio, image: matchedImage });
    }
  
    const coverImages = imageFiles.filter((img) => {
      if (usedImages.has(img.name)) return false;
      if (img.size > MAX_IMAGE_SIZE_BYTES) return false;
  
      const name = normalizeFilenameForMatching(img.name);
      return ["cover", "artwork", "folder", "album", "front", "thumb"].some((n) => name.includes(n));
    });
  
    if (coverImages.length > 0) {
      const defaultCover = coverImages[0];
      for (const pair of pairs) {
        if (!pair.image) {
          pair.image = defaultCover;
        }
      }
    }
  
    return pairs;
  };

  // ============================================================================
// GENRE/MOOD/LANGUAGE DETECTION (via backend proxy)
// ============================================================================

interface LastFmTagResult {
  genre: string;
  mood: string;
  language: string;
}

export const fetchTrackTags = async (
  title: string,
  artist: string
): Promise<LastFmTagResult> => {
  const result: LastFmTagResult = { genre: "", mood: "", language: "" };

  if (!title && !artist) {
    return fallbackTagDetection(title, artist);
  }

  try {
    const response = await axiosInstance.get("/admin/track-tags", {
      params: { title, artist },
    });

    const tags: { name: string; count: number }[] = response.data?.tags || [];

    if (tags.length === 0) {
      return fallbackTagDetection(title, artist);
    }

    for (const tag of tags) {
      const tagLower = tag.name;

      if (!result.genre && TAG_TO_GENRE[tagLower]) {
        result.genre = TAG_TO_GENRE[tagLower];
      }

      if (!result.mood && TAG_TO_MOOD[tagLower]) {
        result.mood = TAG_TO_MOOD[tagLower];
      }

      if (!result.language && TAG_TO_LANGUAGE[tagLower]) {
        result.language = TAG_TO_LANGUAGE[tagLower];
      }

      if (result.genre && result.mood && result.language) break;
    }

    if (!result.language) {
      result.language = detectLanguageFromText(title, artist);
    }

    return result;
  } catch (error) {
    console.error("Tag fetch failed:", error);
    return fallbackTagDetection(title, artist);
  }
};

const fallbackTagDetection = (title: string, artist: string): LastFmTagResult => {
  const result: LastFmTagResult = { genre: "", mood: "", language: "" };

  result.language = detectLanguageFromText(title, artist);

  const combined = `${title} ${artist}`.toLowerCase();
  for (const [keyword, mood] of Object.entries(TAG_TO_MOOD)) {
    if (combined.includes(keyword)) {
      result.mood = mood;
      break;
    }
  }

  return result;
};

const detectLanguageFromText = (title: string, artist: string): string => {
  const combined = `${title} ${artist}`.toLowerCase();

  if (/[\u0B80-\u0BFF]/.test(combined)) return "Tamil";
  if (/[\u0900-\u097F]/.test(combined)) return "Hindi";
  if (/[\u0C00-\u0C7F]/.test(combined)) return "Telugu";
  if (/[\u0D00-\u0D7F]/.test(combined)) return "Malayalam";
  if (/[\u0C80-\u0CFF]/.test(combined)) return "Kannada";
  if (/[\u0A00-\u0A7F]/.test(combined)) return "Punjabi";
  if (/[\uAC00-\uD7AF]/.test(combined)) return "Korean";
  if (/[\u3040-\u30FF]/.test(combined)) return "Japanese";
  if (/[\u0600-\u06FF]/.test(combined)) return "Arabic";

  for (const [keyword, language] of Object.entries(TAG_TO_LANGUAGE)) {
    if (combined.includes(keyword)) return language;
  }

  return "";
};
  
  // ============================================================================
  // ALBUM SUGGESTIONS
  // ============================================================================
  
  export const detectMusicLanguage = (title: string, artist: string, album?: string): string[] => {
    const combined = `${title} ${artist} ${album || ""}`.toLowerCase();
    const detected: string[] = [];
  
    for (const [lang, config] of Object.entries(LANGUAGE_ALBUMS)) {
      if (config.keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
        detected.push(lang);
      }
    }
  
    if (/[\u0B80-\u0BFF]/.test(combined)) detected.push("tamil");
    if (/[\u0900-\u097F]/.test(combined)) detected.push("hindi");
    if (/[\u0C00-\u0C7F]/.test(combined)) detected.push("telugu");
    if (/[\u0D00-\u0D7F]/.test(combined)) detected.push("malayalam");
    if (/[\u0C80-\u0CFF]/.test(combined)) detected.push("kannada");
    if (/[\u0A00-\u0A7F]/.test(combined)) detected.push("punjabi");
    if (/[\uAC00-\uD7AF]/.test(combined)) detected.push("korean");
    if (/[\u3040-\u30FF]/.test(combined)) detected.push("japanese");
  
    if (detected.length === 0 && /[a-zA-Z]/.test(combined)) {
      detected.push("english");
    }
  
    return [...new Set(detected)];
  };
  
  export const detectMusicMood = (title: string, artist: string): string[] => {
    const combined = `${title} ${artist}`.toLowerCase();
    const detected: string[] = [];
  
    for (const [mood, config] of Object.entries(MOOD_ALBUMS)) {
      if (config.keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
        detected.push(mood);
      }
    }
  
    return detected;
  };
  
  export const getAlbumSuggestions = (
    title: string,
    artist: string,
    existingAlbums: any[],
    genre: string,
    mood: string,
    language: string,
    metadataAlbum?: string
  ): AlbumSuggestion[] => {
    const suggestions: AlbumSuggestion[] = [];
    const languages = detectMusicLanguage(title, artist, metadataAlbum);
    const moods = detectMusicMood(title, artist);
  
    const effectiveLanguage = language?.toLowerCase() || languages[0] || "";
    const effectiveMood = mood?.toLowerCase() || moods[0] || "";
    const effectiveGenre = genre?.toLowerCase() || "";
  
    for (const album of existingAlbums) {
      const albumLower = album.title.toLowerCase();
      const songCount = album.songs?.length || 0;
  
      if (songCount >= ALBUM_CAPACITY_LIMIT) continue;
  
      let matchScore = 0;
      const reasons: string[] = [];
  
      // Language match (strongest signal)
      if (effectiveLanguage) {
        if (albumLower.includes(effectiveLanguage)) {
          matchScore += 0.5;
          reasons.push(effectiveLanguage.charAt(0).toUpperCase() + effectiveLanguage.slice(1));
        }
        for (const lang of languages) {
          if (LANGUAGE_ALBUMS[lang]?.suggestions.some((s) =>
            albumLower.includes(s.toLowerCase().split(" - ")[0].toLowerCase())
          )) {
            matchScore += 0.4;
            if (!reasons.length) reasons.push(lang.charAt(0).toUpperCase() + lang.slice(1));
            break;
          }
        }
      }
  
      // Mood match
      if (effectiveMood && albumLower.includes(effectiveMood)) {
        matchScore += 0.3;
        reasons.push(effectiveMood.charAt(0).toUpperCase() + effectiveMood.slice(1));
      }
      for (const m of moods) {
        if (albumLower.includes(m) ||
          MOOD_ALBUMS[m]?.suggestions.some((s) =>
            albumLower.includes(s.toLowerCase().split(" ")[0].toLowerCase())
          )
        ) {
          matchScore += 0.2;
          if (!reasons.some(r => r.toLowerCase() === m)) {
            reasons.push(m.charAt(0).toUpperCase() + m.slice(1));
          }
          break;
        }
      }
  
      // Genre match
      if (effectiveGenre && albumLower.includes(effectiveGenre)) {
        matchScore += 0.2;
        reasons.push(effectiveGenre.charAt(0).toUpperCase() + effectiveGenre.slice(1));
      }
  
      // Artist match
      if (album.artist && artist.toLowerCase().includes(album.artist.toLowerCase())) {
        matchScore += 0.3;
        reasons.push("Same artist");
      }
  
      // Title word overlap
      const titleWords = `${title} ${artist}`.toLowerCase().split(/\s+/);
      const albumWords = albumLower.split(/\s+/);
      const overlap = titleWords.filter(w => w.length > 3 && albumWords.includes(w)).length;
      if (overlap > 0) {
        matchScore += overlap * 0.1;
      }
  
      if (matchScore > 0.3) {
        suggestions.push({
          albumId: album._id,
          albumTitle: album.title,
          reason: reasons.slice(0, 2).join(" • ") || "Match",
          confidence: Math.min(matchScore, 1),
          songCount,
        });
      }
    }
  
    suggestions.sort((a, b) => b.confidence - a.confidence);
    return suggestions.slice(0, 2);
  };
  
  // ============================================================================
  // API FUNCTIONS
  // ============================================================================
  
  export const searchiTunes = async (query: string): Promise<any[]> => {
    try {
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=5&country=US`
      );
  
      if (!response.ok) throw new Error("iTunes API error");
  
      const data = await response.json();
      if (!data.results || data.results.length === 0) return [];
  
      return data.results.map((track: any) => ({
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        score: 90,
        allArtists: [{ name: track.artistName }],
      }));
    } catch (error) {
      console.error("iTunes search failed:", error);
      return [];
    }
  };
  
  export const searchDeezer = async (query: string): Promise<any[]> => {
    try {
      const response = await axiosInstance.get("/admin/search-deezer", {
        params: { q: query, limit: 5 },
      });
      
      const data = response.data;
      if (!data.data || data.data.length === 0) return [];
      
      return data.data.map((track: any) => ({
        title: track.title,
        artist: track.artist?.name || "",
        album: track.album?.title,
        score: 85,
        allArtists: track.contributors || [{ name: track.artist?.name }],
      }));
    } catch (error) {
      console.error("Deezer search failed:", error);
      return [];
    }
  };
  
  // Add a simple rate limiter
  let lastMusicBrainzCall = 0;

  export const searchMusicBrainz = async (query: string): Promise<any[]> => {
    // Enforce 1 request per second
    const now = Date.now();
    const timeSinceLastCall = now - lastMusicBrainzCall;
    if (timeSinceLastCall < 1100) {
      await new Promise(resolve => setTimeout(resolve, 1100 - timeSinceLastCall));
    }
    lastMusicBrainzCall = Date.now();

    try {
      const response = await fetch(
        `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&limit=5&fmt=json`,
        {
          headers: {
            "User-Agent": "Vibra (contact@example.com)",
          },
        }
      );
  
      if (!response.ok) throw new Error("MusicBrainz API error");
  
      const data = await response.json();
      if (!data.recordings || data.recordings.length === 0) return [];
  
      return data.recordings.map((rec: any) => ({
        title: rec.title,
        artist:
          rec["artist-credit"]?.[0]?.name ||
          rec["artist-credit"]?.[0]?.artist?.name ||
          "",
        album: rec.releases?.[0]?.title,
        score: rec.score || 70,
        allArtists:
          rec["artist-credit"]?.map((ac: any) => ({
            name: ac.name || ac.artist?.name,
          })) || [],
      }));
    } catch (error) {
      console.error("MusicBrainz search failed:", error);
      return [];
    }
  };
  
  export const searchTrackMetadata = async (
    query: string,
    filenameData: ParsedMetadata
  ): Promise<MetadataResult[]> => {
    const [itunesResults, musicbrainzResults] = await Promise.all([
      searchiTunes(query),
      searchMusicBrainz(query),
    ]);
  
    let deezerResults: any[] = [];
    if (itunesResults.length === 0 && musicbrainzResults.length === 0) {
      deezerResults = await searchDeezer(query);
    }
  
    const validatedResults: MetadataResult[] = [];
  
    for (const result of itunesResults) {
      validatedResults.push(validateMetadataResult(result, filenameData, "itunes"));
    }
  
    for (const result of musicbrainzResults) {
      validatedResults.push(validateMetadataResult(result, filenameData, "musicbrainz"));
    }
  
    for (const result of deezerResults) {
      validatedResults.push(validateMetadataResult(result, filenameData, "deezer"));
    }
  
    if (filenameData.title) {
      validatedResults.push({
        title: filenameData.title,
        artist: filenameData.artist,
        album: undefined,
        score: 100,
        source: "filename",
        confidence: filenameData.confidence,
        warnings: filenameData.confidence < 0.6 ? ["low_confidence"] : [],
        language: detectLanguage(filenameData.title + " " + filenameData.artist),
        isSoundtrack: false,
        matchesFilename: true,
      });
    }
  
    validatedResults.sort((a, b) => {
      if (a.language === "latin" && b.language !== "latin") return -1;
      if (b.language === "latin" && a.language !== "latin") return 1;
  
      const aGeneric = isGenericArtist(a.artist);
      const bGeneric = isGenericArtist(b.artist);
      if (!aGeneric && bGeneric) return -1;
      if (aGeneric && !bGeneric) return 1;
  
      return b.confidence - a.confidence;
    });
  
    const seen = new Set<string>();
    return validatedResults.filter((result) => {
      const key = normalizeText(result.title + result.artist);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  
  // ============================================================================
  // LOCAL STORAGE
  // ============================================================================
  
  const RECENT_ALBUMS_KEY = "admin_recent_albums";
  const MAX_RECENT_ALBUMS = 5;
  
  export const getRecentAlbums = (): string[] => {
    try {
      const stored = localStorage.getItem(RECENT_ALBUMS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };
  
  export const addRecentAlbum = (albumId: string) => {
    if (!albumId || albumId === "none") return;
  
    const recent = getRecentAlbums().filter((id) => id !== albumId);
    recent.unshift(albumId);
    localStorage.setItem(RECENT_ALBUMS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_ALBUMS)));
  };