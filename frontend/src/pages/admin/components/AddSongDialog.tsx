// src/pages/admin/components/AddSongDialog.tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { axiosInstance } from "@/lib/axios";
import { useMusicStore } from "@/stores/useMusicStore";
import {
  Plus,
  Upload,
  Music,
  Image as ImageIcon,
  X,
  Check,
  Loader2,
  Clock,
  Search,
  AlertCircle,
  RefreshCw,
  Globe,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  SkipForward,
  CheckCircle2,
  XCircle,
  Zap,
  Film,
  Languages,
  ThumbsUp,
  ThumbsDown,
  Undo2,
  Keyboard,
  Ban,
  Info,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Monitor,
  Sparkles,
  Disc3,
} from "lucide-react";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_AUDIO_SIZE_MB = 8;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".wma"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];

// Words that indicate soundtrack/movie content
const SOUNDTRACK_INDICATORS = [
  "soundtrack", "ost", "original sound", "motion picture", "film score",
  "movie", "cinema", "theme from", "end credits", "opening theme",
  "television", "tv series", "from the film", "from the movie",
  "score", "background music", "bgm", "instrumental version",
];

// Artists to deprioritize (orchestras, labels, etc.)
const DEPRIORITIZE_ARTISTS = [
  "orchestra", "philharmonic", "symphony", "ensemble", "choir",
  "band", "players", "strings", "brass", "winds", "quartet",
  "quintet", "trio", "duo", "chamber", "soloists", "singers",
  "records", "recordings", "music", "entertainment", "productions",
  "label", "studios", "audio", "sound", "slatty", "various artists",
  "compilation", "soundtrack", "ost", "original"
];

// Constants for pagination
const SONGS_PER_PAGE = 20;

// CJK character detection
const CJK_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;

// Cyrillic detection
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;

// Arabic detection
const ARABIC_REGEX = /[\u0600-\u06FF]/;

// ============================================================================
// ALBUM/PLAYLIST SUGGESTION CONSTANTS
// ============================================================================

const LANGUAGE_ALBUMS: Record<string, { keywords: string[]; suggestions: string[] }> = {
  tamil: {
    keywords: ["tamil", "kollywood", "தமிழ்", "anirudh", "yuvan", "ar rahman", "ilayaraja", "sid sriram", "shreya ghoshal tamil"],
    suggestions: [
      "Best Songs Ever - Tamil",
      "Tamil Hits Collection",
      "Kollywood Vibes",
      "Tamil Melodies",
      "Tamil Party Mix",
    ]
  },
  hindi: {
    keywords: ["hindi", "bollywood", "हिंदी", "arijit", "neha kakkar", "badshah", "honey singh", "shreya ghoshal hindi", "atif aslam"],
    suggestions: [
      "Best Songs Ever - Hindi",
      "Bollywood Hits",
      "Hindi Melodies",
      "Bollywood Party Mix",
      "Hindi Romantic Songs",
    ]
  },
  english: {
    keywords: ["english", "pop", "rock", "hip hop", "rap", "edm", "country", "r&b", "soul", "jazz", "indie"],
    suggestions: [
      "Best Songs Ever - English",
      "English Hits",
      "Pop Essentials",
      "English Vibes",
      "Western Classics",
    ]
  },
  telugu: {
    keywords: ["telugu", "tollywood", "తెలుగు", "dsp", "thaman", "mani sharma"],
    suggestions: [
      "Best Songs Ever - Telugu",
      "Tollywood Hits",
      "Telugu Melodies",
      "Telugu Party Mix",
    ]
  },
  malayalam: {
    keywords: ["malayalam", "mollywood", "മലയാളം"],
    suggestions: [
      "Best Songs Ever - Malayalam",
      "Malayalam Hits",
      "Mollywood Melodies",
    ]
  },
  kannada: {
    keywords: ["kannada", "sandalwood", "ಕನ್ನಡ"],
    suggestions: [
      "Best Songs Ever - Kannada",
      "Kannada Hits",
      "Sandalwood Melodies",
    ]
  },
  punjabi: {
    keywords: ["punjabi", "ਪੰਜਾਬੀ", "diljit", "sidhu moose", "ap dhillon", "karan aujla"],
    suggestions: [
      "Best Songs Ever - Punjabi",
      "Punjabi Hits",
      "Punjabi Party Mix",
      "Bhangra Beats",
    ]
  },
  korean: {
    keywords: ["korean", "kpop", "k-pop", "bts", "blackpink", "한국어", "twice", "exo", "stray kids"],
    suggestions: [
      "K-Pop Hits",
      "Korean Essentials",
      "K-Pop Party",
    ]
  },
  spanish: {
    keywords: ["spanish", "latino", "reggaeton", "español", "bad bunny", "j balvin", "daddy yankee"],
    suggestions: [
      "Best Songs Ever - Spanish",
      "Latino Hits",
      "Reggaeton Mix",
      "Spanish Vibes",
    ]
  },
  japanese: {
    keywords: ["japanese", "j-pop", "jpop", "anime", "日本語"],
    suggestions: [
      "J-Pop Hits",
      "Anime OST",
      "Japanese Essentials",
    ]
  },
};

const MOOD_ALBUMS: Record<string, { keywords: string[]; suggestions: string[] }> = {
  romantic: {
    keywords: ["love", "romantic", "heart", "romance", "valentine", "couple", "forever", "darling", "sweetheart"],
    suggestions: ["Love Songs", "Romantic Hits", "Love Ballads", "Heartfelt Melodies"],
  },
  party: {
    keywords: ["party", "dance", "club", "dj", "remix", "bass", "drop", "rave", "festival"],
    suggestions: ["Party Anthems", "Dance Floor Hits", "Club Bangers", "Party Mix"],
  },
  sad: {
    keywords: ["sad", "heartbreak", "pain", "broken", "tears", "lonely", "miss you", "goodbye"],
    suggestions: ["Sad Songs", "Heartbreak Hits", "Emotional Tracks", "Melancholy Melodies"],
  },
  motivational: {
    keywords: ["motivation", "inspire", "power", "strong", "win", "champion", "rise", "fight", "warrior"],
    suggestions: ["Motivation Mix", "Pump Up Playlist", "Power Songs", "Gym Hits"],
  },
  chill: {
    keywords: ["chill", "relax", "calm", "peaceful", "lofi", "lo-fi", "ambient", "sleep", "study"],
    suggestions: ["Chill Vibes", "Relaxing Music", "Study Beats", "Lo-Fi Essentials"],
  },
  trending: {
    keywords: ["trending", "viral", "hit", "top", "chart", "popular", "new release", "2024", "2025"],
    suggestions: ["Trending Now", "Viral Hits", "Chart Toppers", "New Releases"],
  },
};

const MAX_SONGS_PER_ALBUM = 150; // Threshold for warning
const IDEAL_SONGS_PER_ALBUM = 100; // Ideal number

interface AlbumSuggestion {
  albumId?: string;
  albumTitle: string;
  reason: string;
  confidence: number;
  isNew: boolean;
  language?: string;
  mood?: string;
  songCount?: number;
  needsNewAlbum?: boolean;
}

// Function to detect language from metadata
const detectMusicLanguage = (title: string, artist: string, album?: string): string[] => {
  const combined = `${title} ${artist} ${album || ""}`.toLowerCase();
  const detected: string[] = [];
  
  for (const [lang, config] of Object.entries(LANGUAGE_ALBUMS)) {
    if (config.keywords.some(kw => combined.includes(kw.toLowerCase()))) {
      detected.push(lang);
    }
  }
  
  // Also check for script-based detection
  if (/[\u0B80-\u0BFF]/.test(combined)) detected.push("tamil"); // Tamil script
  if (/[\u0900-\u097F]/.test(combined)) detected.push("hindi"); // Devanagari
  if (/[\u0C00-\u0C7F]/.test(combined)) detected.push("telugu"); // Telugu script
  if (/[\u0D00-\u0D7F]/.test(combined)) detected.push("malayalam"); // Malayalam script
  if (/[\u0C80-\u0CFF]/.test(combined)) detected.push("kannada"); // Kannada script
  if (/[\u0A00-\u0A7F]/.test(combined)) detected.push("punjabi"); // Gurmukhi
  if (/[\uAC00-\uD7AF]/.test(combined)) detected.push("korean"); // Korean
  if (/[\u3040-\u30FF]/.test(combined)) detected.push("japanese"); // Japanese
  
  // Default to English if Latin script and no other detection
  if (detected.length === 0 && /[a-zA-Z]/.test(combined)) {
    detected.push("english");
  }
  
  return [...new Set(detected)];
};

// Function to detect mood from metadata
const detectMusicMood = (title: string, artist: string): string[] => {
  const combined = `${title} ${artist}`.toLowerCase();
  const detected: string[] = [];
  
  for (const [mood, config] of Object.entries(MOOD_ALBUMS)) {
    if (config.keywords.some(kw => combined.includes(kw.toLowerCase()))) {
      detected.push(mood);
    }
  }
  
  return detected;
};

// Function to get album suggestions
const getAlbumSuggestions = (
  title: string,
  artist: string,
  existingAlbums: any[],
  metadataAlbum?: string
): AlbumSuggestion[] => {
  const suggestions: AlbumSuggestion[] = [];
  const languages = detectMusicLanguage(title, artist, metadataAlbum);
  const moods = detectMusicMood(title, artist);
  
  // Check existing albums for matches
  for (const album of existingAlbums) {
    const albumLower = album.title.toLowerCase();
    let matchScore = 0;
    let matchReason = "";
    
    // Language match
    for (const lang of languages) {
      if (albumLower.includes(lang) || 
          LANGUAGE_ALBUMS[lang]?.suggestions.some(s => 
            albumLower.includes(s.toLowerCase().split(" - ")[0].toLowerCase())
          )) {
        matchScore += 0.6;
        matchReason = `Matches ${lang.charAt(0).toUpperCase() + lang.slice(1)} language`;
        break;
      }
    }
    
    // Mood match
    for (const mood of moods) {
      if (albumLower.includes(mood) ||
          MOOD_ALBUMS[mood]?.suggestions.some(s => 
            albumLower.includes(s.toLowerCase().split(" ")[0].toLowerCase())
          )) {
        matchScore += 0.3;
        matchReason += matchReason ? ` + ${mood} mood` : `${mood.charAt(0).toUpperCase() + mood.slice(1)} mood`;
        break;
      }
    }
    
    // Artist match
    if (album.artist && artist.toLowerCase().includes(album.artist.toLowerCase())) {
      matchScore += 0.4;
      matchReason += matchReason ? " + Same artist" : "Same artist";
    }
    
    // Check album capacity
    const songCount = album.songs?.length || 0;
    const needsNewAlbum = songCount >= MAX_SONGS_PER_ALBUM;
    
    if (matchScore > 0.3) {
      suggestions.push({
        albumId: album._id,
        albumTitle: album.title,
        reason: matchReason,
        confidence: Math.min(matchScore, 1),
        isNew: false,
        language: languages[0],
        mood: moods[0],
        songCount,
        needsNewAlbum,
      });
    }
  }
  
  // Suggest new albums if no good matches or existing are full
  if (suggestions.length === 0 || suggestions.every(s => s.needsNewAlbum)) {
    for (const lang of languages) {
      const langSuggestions = LANGUAGE_ALBUMS[lang]?.suggestions || [];
      if (langSuggestions.length > 0) {
        suggestions.push({
          albumTitle: langSuggestions[0],
          reason: `New ${lang.charAt(0).toUpperCase() + lang.slice(1)} album`,
          confidence: 0.7,
          isNew: true,
          language: lang,
        });
      }
    }
    
    for (const mood of moods) {
      const moodSuggestions = MOOD_ALBUMS[mood]?.suggestions || [];
      if (moodSuggestions.length > 0 && !suggestions.some(s => s.mood === mood)) {
        suggestions.push({
          albumTitle: moodSuggestions[0],
          reason: `${mood.charAt(0).toUpperCase() + mood.slice(1)} collection`,
          confidence: 0.5,
          isNew: true,
          mood,
        });
      }
    }
  }
  
  // Sort by confidence
  suggestions.sort((a, b) => {
    // Prioritize existing albums that aren't full
    if (!a.isNew && !a.needsNewAlbum && (b.isNew || b.needsNewAlbum)) return -1;
    if (!b.isNew && !b.needsNewAlbum && (a.isNew || a.needsNewAlbum)) return 1;
    return b.confidence - a.confidence;
  });
  
  return suggestions.slice(0, 5);
};

// ============================================================================
// ALBUM SUGGESTION COMPONENT
// ============================================================================

const AlbumSuggestionPanel = ({
	suggestions,
	selectedAlbum,
	onSelectAlbum,
	onCreateAlbum,
  }: {
	suggestions: AlbumSuggestion[];
	selectedAlbum: string;
	onSelectAlbum: (albumId: string) => void;
	onCreateAlbum: (title: string) => void;
	albums: any[];
  }) => {
	if (suggestions.length === 0) return null;
	
	return (
	  <div className="space-y-2">
		<div className="flex items-center justify-between">
		  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1">
			<Sparkles className="w-3 h-3" />
			Suggested Albums
		  </p>
		</div>
		
		<div className="space-y-1.5">
		  {suggestions.map((suggestion, idx) => {
			const isSelected = suggestion.albumId === selectedAlbum;
			// FIX: Proper boolean checks
			const isFull = suggestion.songCount !== undefined && suggestion.songCount >= MAX_SONGS_PER_ALBUM;
			const isNearFull = suggestion.songCount !== undefined && suggestion.songCount >= IDEAL_SONGS_PER_ALBUM;
			
			return (
			  <button
				key={idx}
				type="button"
				onClick={() => {
				  if (suggestion.isNew) {
					onCreateAlbum(suggestion.albumTitle);
				  } else if (suggestion.albumId) {
					onSelectAlbum(suggestion.albumId);
				  }
				}}
				// FIX: Ensure boolean type
				disabled={Boolean(isFull && !suggestion.isNew)}
				className={cn(
				  "w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left",
				  isSelected
					? "border-violet-500 bg-violet-500/10"
					: isFull
					? "border-red-500/30 bg-red-500/5 opacity-60 cursor-not-allowed"
					: isNearFull
					? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
					: "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
				)}
			  >
				{/* Icon */}
				<div className={cn(
				  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
				  suggestion.isNew ? "bg-green-500/20" : "bg-zinc-700"
				)}>
				  {suggestion.isNew ? (
					<Plus className="w-4 h-4 text-green-400" />
				  ) : (
					<Disc3 className="w-4 h-4 text-zinc-400" />
				  )}
				</div>
				
				{/* Info */}
				<div className="flex-1 min-w-0">
				  <div className="flex items-center gap-2">
					<p className="text-sm font-medium text-white line-clamp-1">
					  {suggestion.albumTitle}
					</p>
					{isSelected && <Check className="w-3.5 h-3.5 text-violet-400" />}
				  </div>
				  <div className="flex items-center gap-2 mt-0.5">
					<span className="text-[10px] text-zinc-400">{suggestion.reason}</span>
					{!suggestion.isNew && suggestion.songCount !== undefined && (
					  <span className={cn(
						"text-[10px] px-1.5 py-0.5 rounded",
						isFull
						  ? "bg-red-500/20 text-red-400"
						  : isNearFull
						  ? "bg-amber-500/20 text-amber-400"
						  : "bg-zinc-700 text-zinc-400"
					  )}>
						{suggestion.songCount} songs
						{isFull && " (FULL)"}
						{isNearFull && !isFull && " (Almost full)"}
					  </span>
					)}
				  </div>
				</div>
				
				{/* Confidence */}
				<div className={cn(
				  "px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
				  suggestion.confidence >= 0.7
					? "bg-green-500/20 text-green-400"
					: suggestion.confidence >= 0.5
					? "bg-amber-500/20 text-amber-400"
					: "bg-zinc-700 text-zinc-400"
				)}>
				  {Math.round(suggestion.confidence * 100)}%
				</div>
			  </button>
			);
		  })}
		</div>
		
		{/* Warning for full albums */}
		{suggestions.some(s => s.needsNewAlbum) && (
		  <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
			<AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
			<div className="text-xs text-amber-300">
			  <p className="font-medium">Some albums are getting full!</p>
			  <p className="text-amber-400/80 mt-0.5">
				Consider creating a new album like "{suggestions.find(s => s.isNew)?.albumTitle || "Best Songs Ever - [Language] Vol.2"}"
			  </p>
			</div>
		  </div>
		)}
	  </div>
	);
  };

// ============================================================================
// TYPES
// ============================================================================

interface NewSong {
  title: string;
  artist: string;
  album: string;
  duration: number;
}

interface ParsedMetadata {
  title: string;
  artist: string;
  confidence: number;
}

interface MetadataResult {
  title: string;
  artist: string;
  album?: string;
  score: number;
  source: "itunes" | "musicbrainz" | "deezer" | "filename";
  confidence: number;
  warnings: MetadataWarning[];
  language: "latin" | "cjk" | "cyrillic" | "arabic" | "mixed" | "unknown";
  isSoundtrack: boolean;
  matchesFilename: boolean;
  originalArtist?: string; // Store original before filtering
}

type MetadataWarning = 
  | "non_latin"
  | "soundtrack"
  | "low_confidence"
  | "mismatch_filename"
  | "possible_cover"
  | "generic_title"
  | "generic_artist";

interface QueuedSong {
  id: string;
  audioFile: File;
  imageFile: File | null;
  metadata: NewSong;
  originalFilename: string;
  parsedFromFilename: ParsedMetadata;
  metadataResults: MetadataResult[];
  selectedMetadataIndex: number | null;
  imagePreview: string | null;
  audioUrl: string | null;
  status: "pending" | "processing" | "uploading" | "success" | "error" | "skipped";
  error?: string;
  isDuplicate: boolean;
  duplicateInfo?: { title: string; artist: string; id: string };
  manuallyEdited: boolean;
  uploadProgress: number;
  albumSuggestions: AlbumSuggestion[];
}

interface UndoAction {
  type: "remove" | "skip" | "edit";
  item: QueuedSong;
  index: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getFileExtension = (filename: string): string => {
  return filename.substring(filename.lastIndexOf(".")).toLowerCase();
};

const isAudioFile = (file: File): boolean => {
  const ext = getFileExtension(file.name);
  return AUDIO_EXTENSIONS.includes(ext) || file.type.startsWith("audio/");
};

const isImageFile = (file: File): boolean => {
  const ext = getFileExtension(file.name);
  return IMAGE_EXTENSIONS.includes(ext) || file.type.startsWith("image/");
};

// Detect language of text
const detectLanguage = (text: string): MetadataResult["language"] => {
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

// Check if text contains soundtrack indicators
const isSoundtrackContent = (title: string, artist: string, album?: string): boolean => {
  const combined = `${title} ${artist} ${album || ""}`.toLowerCase();
  return SOUNDTRACK_INDICATORS.some(indicator => combined.includes(indicator));
};

// Check if artist is a generic/deprioritized type
const isGenericArtist = (artist: string): boolean => {
  const lowerArtist = artist.toLowerCase();
  return DEPRIORITIZE_ARTISTS.some(term => lowerArtist.includes(term));
};

// Calculate string similarity (Levenshtein-based)
const calculateSimilarity = (str1: string, str2: string): number => {
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

// Check if strings are similar
const isSimilar = (str1: string, str2: string, threshold = 0.8): boolean => {
  return calculateSimilarity(str1, str2) >= threshold;
};

// Clean and normalize text
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // Remove parentheses content
    .replace(/\[.*?\]/g, "") // Remove brackets content
    .replace(/feat\.?.*$/i, "") // Remove featuring
    .replace(/ft\.?.*$/i, "")
    .replace(/&.*$/i, "") // Remove additional artists
    .replace(/[^\w\s]/g, "") // Remove special chars
    .replace(/\s+/g, " ")
    .trim();
};

// Parse filename to extract title and artist with confidence
const parseFilename = (filename: string): ParsedMetadata => {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  // Clean up common noise
  let cleaned = nameWithoutExt
    .replace(/^[\d]+[\s._-]+/, "") // Track numbers
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
    .replace(/\s*\[[A-Za-z0-9_-]{8,15}\]\s*/g, "") // YouTube IDs like [K_8yRH2KPVo]
    .replace(/_/g, " ")
    .trim();
  
  // Try different separators
  const separators = [" - ", " – ", " — ", " ~ ", " _ "];
  
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned.split(sep).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          artist: parts[0],
          title: parts.slice(1).join(" - "),
          confidence: 0.8,
        };
      }
    }
  }
  
  // No separator found - lower confidence
  return {
    title: cleaned,
    artist: "",
    confidence: 0.4,
  };
};

// Get the primary/main artist from API result
const extractPrimaryArtist = (artistString: string, allArtists?: any[]): string => {
  if (!artistString) return "";
  
  // If we have multiple artists array, try to find the main one
  if (allArtists && allArtists.length > 0) {
    // Filter out generic artists
    const mainArtists = allArtists.filter(a => {
      const name = typeof a === 'string' ? a : (a.name || a.artistName || '');
      return !isGenericArtist(name);
    });
    
    if (mainArtists.length > 0) {
      const first = mainArtists[0];
      return typeof first === 'string' ? first : (first.name || first.artistName || artistString);
    }
  }
  
  // Split by common delimiters and find non-generic artist
  const delimiters = [' feat. ', ' ft. ', ' featuring ', ' & ', ', ', ' x ', ' X ', ' with ', ' vs ', ' vs. '];
  
  let artists = [artistString];
  for (const delim of delimiters) {
    const newArtists: string[] = [];
    for (const a of artists) {
      newArtists.push(...a.split(delim));
    }
    artists = newArtists;
  }
  
  // Clean and filter
  artists = artists.map(a => a.trim()).filter(a => a.length > 0);
  
  // Find first non-generic artist
  for (const artist of artists) {
    if (!isGenericArtist(artist)) {
      return artist;
    }
  }
  
  // If all are generic, return the first one anyway
  return artists[0] || artistString;
};

// Validate and score a metadata result against filename
const validateMetadataResult = (
  result: { title: string; artist: string; album?: string; score?: number; allArtists?: any[] },
  filenameData: ParsedMetadata,
  source: MetadataResult["source"]
): MetadataResult => {
  const warnings: MetadataWarning[] = [];
  let confidence = (result.score || 50) / 100;
  
  // Extract primary artist
  const originalArtist = result.artist;
  const primaryArtist = extractPrimaryArtist(result.artist, result.allArtists);
  
  // Check if we had to change the artist
  if (isGenericArtist(originalArtist) && primaryArtist !== originalArtist) {
    warnings.push("generic_artist");
  }
  
  // Check language
  const titleLang = detectLanguage(result.title);
  const artistLang = detectLanguage(primaryArtist);
  const language = titleLang === artistLang ? titleLang : "mixed";
  
  // Penalize non-Latin results if filename looks Latin
  const filenameLang = detectLanguage(filenameData.title + " " + filenameData.artist);
  if (filenameLang === "latin" && (titleLang !== "latin" || artistLang !== "latin")) {
    warnings.push("non_latin");
    confidence *= 0.3;
  }
  
  // Check for soundtrack
  const isSoundtrack = isSoundtrackContent(result.title, primaryArtist, result.album);
  if (isSoundtrack) {
    warnings.push("soundtrack");
    confidence *= 0.7;
  }
  
  // Check filename match
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
  
  // Check for generic titles
  const genericTitles = ["untitled", "track", "audio", "song", "music"];
  if (genericTitles.some(g => result.title.toLowerCase().includes(g))) {
    warnings.push("generic_title");
    confidence *= 0.5;
  }
  
  // Low confidence warning
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
// API FUNCTIONS
// ============================================================================

// Search iTunes API
const searchiTunes = async (query: string): Promise<any[]> => {
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

// Search Deezer API
const searchDeezer = async (query: string): Promise<any[]> => {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5&output=json`
    );
    
    if (!response.ok) throw new Error("Deezer API error");
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) return [];
    
    return data.data.map((track: any) => ({
      title: track.title,
      artist: track.artist?.name || "",
      album: track.album?.title,
      score: 85,
      allArtists: track.contributors || [{ name: track.artist?.name }],
    }));
  } catch (error) {
    return [];
  }
};

// Search MusicBrainz API
const searchMusicBrainz = async (query: string): Promise<any[]> => {
  try {
    const response = await fetch(
      `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&limit=5&fmt=json`,
      {
        headers: {
          "User-Agent": "MusicApp/1.0 (contact@example.com)",
        },
      }
    );
    
    if (!response.ok) throw new Error("MusicBrainz API error");
    
    const data = await response.json();
    
    if (!data.recordings || data.recordings.length === 0) return [];
    
    return data.recordings.map((rec: any) => ({
      title: rec.title,
      artist: rec["artist-credit"]?.[0]?.name || rec["artist-credit"]?.[0]?.artist?.name || "",
      album: rec.releases?.[0]?.title,
      score: rec.score || 70,
      allArtists: rec["artist-credit"]?.map((ac: any) => ({
        name: ac.name || ac.artist?.name,
      })) || [],
    }));
  } catch (error) {
    console.error("MusicBrainz search failed:", error);
    return [];
  }
};

// Combined smart search with validation
const searchTrackMetadata = async (
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
  
  // Sort by confidence, prefer Latin, deprioritize generic artists
  validatedResults.sort((a, b) => {
    // Prefer Latin results
    if (a.language === "latin" && b.language !== "latin") return -1;
    if (b.language === "latin" && a.language !== "latin") return 1;
    
    // Deprioritize generic artists
    const aGeneric = isGenericArtist(a.artist);
    const bGeneric = isGenericArtist(b.artist);
    if (!aGeneric && bGeneric) return -1;
    if (aGeneric && !bGeneric) return 1;
    
    // Then by confidence
    return b.confidence - a.confidence;
  });
  
  // Remove duplicates
  const seen = new Set<string>();
  return validatedResults.filter(result => {
    const key = normalizeText(result.title + result.artist);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ============================================================================
// MORE UTILITIES
// ============================================================================

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const getAudioDuration = (file: File): Promise<number> => {
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

const generateId = () => Math.random().toString(36).substring(2, 9);

// Local storage for recent albums
const RECENT_ALBUMS_KEY = "admin_recent_albums";
const MAX_RECENT_ALBUMS = 5;

const getRecentAlbums = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_ALBUMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addRecentAlbum = (albumId: string) => {
  if (!albumId || albumId === "none") return;
  
  const recent = getRecentAlbums().filter(id => id !== albumId);
  recent.unshift(albumId);
  localStorage.setItem(RECENT_ALBUMS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_ALBUMS)));
};

// Improved file matching - handles metadata suffixes like [ggZ6YTex614]
const normalizeFilenameForMatching = (filename: string): string => {
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."));
  
  return nameWithoutExt
    .replace(/\s*\[[A-Za-z0-9_-]{6,15}\]\s*/g, "") // YouTube/metadata IDs
    .replace(/\s*\(.*?\)\s*/g, "") // Remove (anything)
    .replace(/\s*{.*?}\s*/g, "")   // Remove {anything}
    .replace(/[-_]/g, " ")          // Replace - and _ with space
    .replace(/\s+/g, " ")           // Normalize spaces
    .toLowerCase()
    .trim();
};

// Extract core name for fuzzy matching
const extractCoreName = (filename: string): string => {
  const normalized = normalizeFilenameForMatching(filename);
  // Get first significant words (usually the title)
  const words = normalized.split(' ').filter(w => w.length > 2);
  return words.slice(0, 3).join(' ');
};

const matchFilesFromFolder = (files: File[]): { audio: File; image: File | null }[] => {
  const audioFiles = files.filter(isAudioFile);
  const imageFiles = files.filter(isImageFile);
  
  const pairs: { audio: File; image: File | null }[] = [];
  const usedImages = new Set<string>();
  
  // First pass: Exact and close matches
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
      
      // Exact match after normalization
      if (imageNormalized === audioNormalized) {
        matchedImage = image;
        bestMatchScore = 1;
        break;
      }
      
      // Core name match (handles cases like "Superman" matching "Superman[K_8yRH2KPVo]")
      if (audioCore && imageCore && (audioCore === imageCore || 
          audioCore.startsWith(imageCore) || imageCore.startsWith(audioCore))) {
        if (bestMatchScore < 0.95) {
          bestMatchScore = 0.95;
          matchedImage = image;
        }
        continue;
      }
      
      // One starts with the other
      if (audioNormalized.startsWith(imageNormalized) || imageNormalized.startsWith(audioNormalized)) {
        if (bestMatchScore < 0.9) {
          bestMatchScore = 0.9;
          matchedImage = image;
        }
        continue;
      }
      
      // Similarity check
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
  
  // Second pass: Find cover images for unmatched audio
  const coverImages = imageFiles.filter(img => {
    if (usedImages.has(img.name)) return false;
    if (img.size > MAX_IMAGE_SIZE_BYTES) return false;
    
    const name = normalizeFilenameForMatching(img.name);
    return ["cover", "artwork", "folder", "album", "front", "thumb"].some(n => name.includes(n));
  });
  
  // Assign default cover to unmatched audio
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
// AUDIO PLAYER COMPONENT
// ============================================================================

const AudioPlayer = ({
  audioUrl,
  title,
  artist,
  imageUrl,
}: {
  audioUrl: string | null;
  title: string;
  artist: string;
  imageUrl: string | null;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  
  useEffect(() => {
    // Reset when URL changes
    setIsPlaying(false);
    setCurrentTime(0);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [audioUrl]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);
  
  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };
  
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const vol = value[0];
    setVolume(vol);
    audioRef.current.volume = vol;
    setIsMuted(vol === 0);
  };
  
  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.7;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };
  
  if (!audioUrl) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
          <Music className="w-4 h-4" />
          <span>No audio to preview</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 rounded-xl p-3 border border-zinc-700/50 space-y-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Track Info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0 ring-1 ring-zinc-700">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-5 h-5 text-zinc-500" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-white line-clamp-1">{title || "Untitled"}</p>
          <p className="text-xs text-zinc-400 line-clamp-1">{artist || "Unknown Artist"}</p>
        </div>
        
        {/* Play Button */}
        <button
          onClick={togglePlay}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
            isPlaying
              ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
              : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
          )}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>
      </div>
      
      {/* Progress Bar */}
      <div className="space-y-1">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        
        <div className="flex justify-between text-[10px] text-zinc-500">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
      
      {/* Volume */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="p-1 text-zinc-400 hover:text-white transition-colors"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="w-24 cursor-pointer"
        />
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Mobile Block Component
const MobileBlockScreen = () => (
  <div className="fixed inset-0 z-50 bg-zinc-900 flex items-center justify-center p-6 sm:hidden">
    <div className="text-center space-y-4 max-w-sm">
      <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto">
        <Monitor className="w-8 h-8 text-violet-400" />
      </div>
      <h2 className="text-xl font-bold text-white">Desktop Required</h2>
      <p className="text-zinc-400 text-sm">
        The music upload feature requires a larger screen for the best experience. 
        Please use a desktop or laptop computer to add songs.
      </p>
      <div className="pt-4">
        <div className="inline-flex items-center gap-2 text-xs text-zinc-500 bg-zinc-800 px-3 py-2 rounded-full">
          <Monitor className="w-3.5 h-3.5" />
          Minimum width: 640px
        </div>
      </div>
    </div>
  </div>
);

// Confidence Badge
const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  const percent = Math.round(confidence * 100);
  
  let color = "bg-green-500/20 text-green-400 border-green-500/30";
  let icon = <ThumbsUp className="w-3 h-3" />;
  
  if (confidence < 0.5) {
    color = "bg-red-500/20 text-red-400 border-red-500/30";
    icon = <ThumbsDown className="w-3 h-3" />;
  } else if (confidence < 0.75) {
    color = "bg-amber-500/20 text-amber-400 border-amber-500/30";
    icon = <AlertCircle className="w-3 h-3" />;
  }
  
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0", color)}>
      {icon}
      {percent}%
    </span>
  );
};

// Warning Badge
const WarningBadge = ({ warning }: { warning: MetadataWarning }) => {
  const config: Record<MetadataWarning, { icon: typeof AlertCircle; label: string; color: string }> = {
    non_latin: { icon: Languages, label: "Foreign", color: "bg-purple-500/20 text-purple-400" },
    soundtrack: { icon: Film, label: "Soundtrack", color: "bg-blue-500/20 text-blue-400" },
    low_confidence: { icon: AlertCircle, label: "Low Match", color: "bg-amber-500/20 text-amber-400" },
    mismatch_filename: { icon: XCircle, label: "Mismatch", color: "bg-red-500/20 text-red-400" },
    possible_cover: { icon: Music, label: "Cover?", color: "bg-cyan-500/20 text-cyan-400" },
    generic_title: { icon: Info, label: "Generic", color: "bg-zinc-500/20 text-zinc-400" },
    generic_artist: { icon: AlertTriangle, label: "Changed Artist", color: "bg-orange-500/20 text-orange-400" },
  };
  
  const { icon: Icon, label, color } = config[warning];
  
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0", color)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

// Source Badge
const SourceBadge = ({ source }: { source: MetadataResult["source"] }) => {
  const config: Record<string, { label: string; color: string }> = {
    itunes: { label: "iTunes", color: "bg-pink-500/20 text-pink-400" },
    musicbrainz: { label: "MusicBrainz", color: "bg-orange-500/20 text-orange-400" },
    deezer: { label: "Deezer", color: "bg-purple-500/20 text-purple-400" },
    filename: { label: "Filename", color: "bg-zinc-500/20 text-zinc-400" },
  };
  
  const { label, color } = config[source];
  
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0", color)}>
      {label}
    </span>
  );
};

// Drop Zone Component
const DropZone = ({
  onFileDrop,
  accept,
  file,
  onClear,
  icon: Icon,
  label,
  sublabel,
  preview,
  isLoading,
  error,
  maxSize,
  className,
}: {
  onFileDrop: (file: File) => void;
  accept: string;
  file: File | null;
  onClear: () => void;
  icon: typeof Music;
  label: string;
  sublabel: string;
  preview?: string | null;
  isLoading?: boolean;
  error?: string | null;
  maxSize: number;
  className?: string;
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.size > maxSize) {
        toast.error(`File too large. Max: ${formatFileSize(maxSize)}`);
        return;
      }
      onFileDrop(droppedFile);
    }
  }, [onFileDrop, maxSize]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > maxSize) {
        toast.error(`File too large. Max: ${formatFileSize(maxSize)}`);
        e.target.value = "";
        return;
      }
      onFileDrop(selectedFile);
    }
  };
  
  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden",
        error
          ? "border-red-500/50 bg-red-500/5"
          : isDragOver
          ? "border-violet-500 bg-violet-500/10"
          : file
          ? "border-violet-500/50 bg-violet-500/5"
          : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/30",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      
      {file ? (
        <div className="p-2.5 flex items-center gap-2.5">
          {preview ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-violet-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white line-clamp-1">{file.name}</p>
            <p className="text-[10px] text-zinc-400">{formatFileSize(file.size)}</p>
          </div>
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 rounded-full hover:bg-zinc-700 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}
        </div>
      ) : (
        <div className="p-3 flex flex-col items-center justify-center text-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors",
            isDragOver ? "bg-violet-500/20" : "bg-zinc-800"
          )}>
            <Icon className={cn("w-4 h-4", isDragOver ? "text-violet-400" : "text-zinc-400")} />
          </div>
          <p className="text-xs font-medium text-zinc-300">{label}</p>
          <p className="text-[10px] text-zinc-500">{sublabel}</p>
          <p className="text-[9px] text-zinc-600 mt-0.5">Max: {formatFileSize(maxSize)}</p>
        </div>
      )}
    </div>
  );
};

// Queue Item
const QueueItem = ({
  item,
  isActive,
  onClick,
  onRemove,
}: {
  item: QueuedSong;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
}) => (
  <div
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all",
      isActive
        ? "bg-violet-500/20 border border-violet-500/50"
        : item.status === "success"
        ? "bg-green-500/10 border border-green-500/30"
        : item.status === "error"
        ? "bg-red-500/10 border border-red-500/30"
        : item.status === "skipped"
        ? "bg-zinc-700/30 border border-zinc-700/50 opacity-50"
        : "bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800"
    )}
  >
    {/* Preview */}
    <div className="w-8 h-8 rounded overflow-hidden bg-zinc-800 shrink-0">
      {item.imagePreview ? (
        <img src={item.imagePreview} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Music className="w-3 h-3 text-zinc-500" />
        </div>
      )}
    </div>
    
    {/* Info */}
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-medium text-white line-clamp-1">
        {item.metadata.title || "Untitled"}
      </p>
      <p className="text-[9px] text-zinc-400 line-clamp-1">
        {item.metadata.artist || "Unknown"}
      </p>
    </div>
    
    {/* Status */}
    <div className="shrink-0 flex items-center">
      {item.isDuplicate && item.status === "pending" && (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
      )}
      {item.status === "processing" && (
        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
      )}
      {item.status === "uploading" && (
        <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
      )}
      {item.status === "success" && (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
      )}
      {item.status === "error" && (
        <XCircle className="w-3.5 h-3.5 text-red-400" />
      )}
      {item.status === "skipped" && (
        <Ban className="w-3.5 h-3.5 text-zinc-500" />
      )}
      {item.status === "pending" && !item.isDuplicate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 rounded hover:bg-zinc-700 transition-colors"
        >
          <X className="w-3 h-3 text-zinc-400" />
        </button>
      )}
    </div>
  </div>
);

// Duplicate Warning
const DuplicateWarning = ({
  duplicateInfo,
  onIgnore,
  onSkip,
}: {
  duplicateInfo: { title: string; artist: string };
  onIgnore: () => void;
  onSkip: () => void;
}) => (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 space-y-2">
    <div className="flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-300">Possible Duplicate</p>
        <p className="text-xs text-amber-400/80 mt-0.5 line-clamp-1">
          Found: "{duplicateInfo.title}" by {duplicateInfo.artist}
        </p>
      </div>
    </div>
    <div className="flex gap-2 ml-6">
      <Button
        size="sm"
        variant="outline"
        onClick={onSkip}
        className="h-6 text-[10px] border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
      >
        <SkipForward className="w-3 h-3 mr-1" />
        Skip
      </Button>
      <Button
        size="sm"
        onClick={onIgnore}
        className="h-6 text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
      >
        Add Anyway
      </Button>
    </div>
  </div>
);

// Keyboard Shortcuts Help
const KeyboardShortcutsHelp = () => (
  <TooltipProvider>
    <Tooltip>
	<TooltipTrigger asChild>
  <button
    tabIndex={-1}
    className="p-1.5 rounded-lg mt-6 hover:bg-zinc-800 transition-colors"
  >
    <Keyboard className="w-4 h-4 text-zinc-500" />
  </button>
</TooltipTrigger>

      <TooltipContent side="left" className="bg-zinc-900 border-zinc-800 p-3 max-w-xs">
        <p className="font-medium text-white text-sm mb-2">Keyboard Shortcuts</p>
        <div className="space-y-1 text-xs text-zinc-400">
          <div className="flex justify-between gap-4">
            <span>Enter</span>
            <span className="text-zinc-500">Add Song</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>← →</span>
            <span className="text-zinc-500">Navigate Queue</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>S</span>
            <span className="text-zinc-500">Skip Current</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Ctrl+Z</span>
            <span className="text-zinc-500">Undo</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>1-5</span>
            <span className="text-zinc-500">Select Result</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Space</span>
            <span className="text-zinc-500">Play/Pause Preview</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AddSongDialog = () => {
  const { albums, songs, fetchSongs, fetchAlbums } = useMusicStore();
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Queue management
  const [queue, setQueue] = useState<QueuedSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  // Album state
  const [selectedAlbum, setSelectedAlbum] = useState("");
  const [recentAlbumIds, setRecentAlbumIds] = useState<string[]>([]);
  
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  
  const currentSong = queue[currentIndex] || null;

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Load recent albums
  useEffect(() => {
    setRecentAlbumIds(getRecentAlbums());
  }, [songDialogOpen]);
  
  const recentAlbums = albums.filter(a => recentAlbumIds.includes(a._id));
  
  // Clean up audio URLs when component unmounts or queue changes
  useEffect(() => {
    return () => {
      queue.forEach(item => {
        if (item.audioUrl) {
          URL.revokeObjectURL(item.audioUrl);
        }
      });
    };
  }, []);
  
  // Check for duplicates
  const checkDuplicate = useCallback((title: string, artist: string): {
    isDuplicate: boolean;
    duplicateInfo?: { title: string; artist: string; id: string };
  } => {
    if (!title) return { isDuplicate: false };
    
    const normalizedTitle = normalizeText(title);
    const normalizedArtist = normalizeText(artist);
    
    for (const song of songs) {
      const songTitle = normalizeText(song.title);
      const songArtist = normalizeText(song.artist);
      
      const titleMatch = isSimilar(normalizedTitle, songTitle, 0.85);
      
      if (titleMatch) {
        const artistMatch = !normalizedArtist || !songArtist || isSimilar(normalizedArtist, songArtist, 0.7);
        
        if (artistMatch) {
          return {
            isDuplicate: true,
            duplicateInfo: { title: song.title, artist: song.artist, id: song._id },
          };
        }
      }
    }
    
    return { isDuplicate: false };
  }, [songs]);
  
  // Find matching album
  const findMatchingAlbum = useCallback((albumName: string): string | null => {
    if (!albumName) return null;
    
    const normalizedSearch = albumName.toLowerCase().trim();
    
    const exactMatch = albums.find(a => a.title.toLowerCase().trim() === normalizedSearch);
    if (exactMatch) return exactMatch._id;
    
    const partialMatch = albums.find(a =>
      a.title.toLowerCase().includes(normalizedSearch) ||
      normalizedSearch.includes(a.title.toLowerCase())
    );
    if (partialMatch) return partialMatch._id;
    
    return null;
  }, [albums]);
  
  // Process a single audio file
  const processAudioFile = async (
    audioFile: File,
    imageFile: File | null
  ): Promise<QueuedSong> => {
    const id = generateId();
    const parsedFromFilename = parseFilename(audioFile.name);
    
    // Create audio URL for preview
    const audioUrl = URL.createObjectURL(audioFile);
    
    // Get duration
    let duration = 0;
    try {
      duration = await getAudioDuration(audioFile);
    } catch (e) {
      console.error("Failed to get duration:", e);
    }
    
    // Search for metadata
    const searchQuery = parsedFromFilename.artist
      ? `${parsedFromFilename.title} ${parsedFromFilename.artist}`
      : parsedFromFilename.title;
    
    let metadataResults: MetadataResult[] = [];
    let selectedMetadataIndex: number | null = null;
    let finalTitle = parsedFromFilename.title;
    let finalArtist = parsedFromFilename.artist;
    let albumId = selectedAlbum;
    
    try {
      metadataResults = await searchTrackMetadata(searchQuery, parsedFromFilename);
      
      // Auto-select best result (high confidence, Latin, matches filename, not generic artist)
      const bestResult = metadataResults.find(r =>
        r.confidence >= 0.7 &&
        r.language === "latin" &&
        r.matchesFilename &&
        !r.isSoundtrack &&
        !isGenericArtist(r.artist)
      );
      
      if (bestResult) {
        const bestIndex = metadataResults.indexOf(bestResult);
        selectedMetadataIndex = bestIndex;
        finalTitle = bestResult.title;
        finalArtist = bestResult.artist;
        
        if (bestResult.album) {
          const matchingAlbumId = findMatchingAlbum(bestResult.album);
          if (matchingAlbumId) albumId = matchingAlbumId;
        }
      } else if (metadataResults.length > 0) {
        // Fall back to first Latin, non-generic artist result
        const latinResult = metadataResults.find(r => 
          r.language === "latin" && !isGenericArtist(r.artist)
        );
        if (latinResult && latinResult.confidence >= 0.5) {
          const latinIndex = metadataResults.indexOf(latinResult);
          selectedMetadataIndex = latinIndex;
          finalTitle = latinResult.title;
          finalArtist = latinResult.artist;
        }
      }
    } catch (e) {
      console.error("Metadata search failed:", e);
    }
    
    // Check for duplicate
    const { isDuplicate, duplicateInfo } = checkDuplicate(finalTitle, finalArtist);
    
    // Create image preview
    let imagePreview: string | null = null;
    if (imageFile) {
      imagePreview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(imageFile);
      });
    }

	const albumSuggestions = getAlbumSuggestions(
		finalTitle,
		finalArtist,
		albums,
		selectedMetadataIndex !== null ? metadataResults[selectedMetadataIndex]?.album : undefined
	  );
	  
	  // Auto-select best album if confidence is high enough
	  if (albumSuggestions.length > 0 && 
		  albumSuggestions[0].confidence >= 0.7 && 
		  !albumSuggestions[0].needsNewAlbum &&
		  albumSuggestions[0].albumId) {
		albumId = albumSuggestions[0].albumId;
	  }
    
    return {
      id,
      audioFile,
      imageFile,
      originalFilename: audioFile.name,
      metadata: {
        title: finalTitle,
        artist: finalArtist,
        album: albumId,
        duration,
      },
      parsedFromFilename,
      metadataResults,
      selectedMetadataIndex,
	  albumSuggestions,
      imagePreview,
      audioUrl,
      status: "pending",
      isDuplicate,
      duplicateInfo,
      manuallyEdited: false,
      uploadProgress: 0,
    };
  };
  
  // Process file pairs in batches with pagination
  const processFilePairs = async (pairs: { audio: File; image: File | null }[]) => {
    if (pairs.length === 0) return;
    
    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: pairs.length });
    
    const newQueueItems: QueuedSong[] = [];
    const batchSize = 5;
    
    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (pair, batchIndex) => {
        const globalIndex = i + batchIndex;
        
        try {
          const queueItem = await processAudioFile(pair.audio, pair.image);
          setProcessingProgress(prev => ({ ...prev, current: globalIndex + 1 }));
          return queueItem;
        } catch (error) {
          console.error("Error processing:", pair.audio.name, error);
          setProcessingProgress(prev => ({ ...prev, current: globalIndex + 1 }));
          return null;
        }
      });
      
      const results = await Promise.all(batchPromises);
      newQueueItems.push(...results.filter((item): item is QueuedSong => item !== null));
      
      toast.loading(`Processing ${Math.min(i + batchSize, pairs.length)}/${pairs.length}...`, { id: "processing" });
    }
    
    toast.dismiss("processing");
    
    if (newQueueItems.length > 0) {
      setQueue(prev => [...prev, ...newQueueItems]);
      toast.success(`Added ${newQueueItems.length} song(s) to queue`);
    }
    
    setProcessingProgress({ current: 0, total: 0 });
    setIsProcessing(false);
  };
  
  // Handle folder selection
  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const pairs = matchFilesFromFolder(files);
    
    if (pairs.length === 0) {
      toast.error("No valid audio files found");
      return;
    }
    
    await processFilePairs(pairs);
    e.target.value = "";
  };
  
  // Handle single audio drop
  const handleAudioDrop = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const queueItem = await processAudioFile(file, currentSong?.imageFile || null);
      
      if (currentSong && currentSong.status === "pending") {
        // Clean up old audio URL
        if (currentSong.audioUrl) {
          URL.revokeObjectURL(currentSong.audioUrl);
        }
        // Replace current
        setQueue(prev => prev.map((item, idx) =>
          idx === currentIndex ? { ...queueItem, imageFile: item.imageFile, imagePreview: item.imagePreview } : item
        ));
      } else {
        // Add new
        setQueue(prev => [...prev, queueItem]);
        setCurrentIndex(queue.length);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle image drop
  const handleImageDrop = async (file: File) => {
    const imagePreview = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
    
    if (!currentSong) {
      toast.error("Please add an audio file first");
      return;
    }
    
    setQueue(prev => prev.map((item, idx) =>
      idx === currentIndex ? { ...item, imageFile: file, imagePreview } : item
    ));
  };
  
  // Clear handlers
  const clearAudio = () => {
    if (currentSong) {
      if (currentSong.audioUrl) {
        URL.revokeObjectURL(currentSong.audioUrl);
      }
      pushUndo({ type: "remove", item: currentSong, index: currentIndex });
      removeFromQueue(currentSong.id);
    }
  };
  
  const clearImage = () => {
    if (currentSong) {
      setQueue(prev => prev.map((item, idx) =>
        idx === currentIndex ? { ...item, imageFile: null, imagePreview: null } : item
      ));
    }
  };
  
  // Update metadata
  const updateMetadata = (field: keyof NewSong, value: string | number) => {
    if (!currentSong) return;
    
    setQueue(prev => prev.map((item, idx) => {
      if (idx !== currentIndex) return item;
      
      const newMetadata = { ...item.metadata, [field]: value };
      let isDuplicate = item.isDuplicate;
      let duplicateInfo = item.duplicateInfo;
      
      if (field === "title" || field === "artist") {
        const result = checkDuplicate(
          field === "title" ? (value as string) : newMetadata.title,
          field === "artist" ? (value as string) : newMetadata.artist
        );
        isDuplicate = result.isDuplicate;
        duplicateInfo = result.duplicateInfo;
      }
      
      return { ...item, metadata: newMetadata, isDuplicate, duplicateInfo, manuallyEdited: true };
    }));
  };
  
  // Select metadata result
  const selectMetadataResult = (index: number) => {
    if (!currentSong || !currentSong.metadataResults[index]) return;
    
    const result = currentSong.metadataResults[index];
    
    setQueue(prev => prev.map((item, idx) => {
      if (idx !== currentIndex) return item;
      
      const { isDuplicate, duplicateInfo } = checkDuplicate(result.title, result.artist);
      
      let albumToSet = item.metadata.album;
      if (result.album) {
        const matchingAlbumId = findMatchingAlbum(result.album);
        if (matchingAlbumId) albumToSet = matchingAlbumId;
      }
      
      return {
        ...item,
        selectedMetadataIndex: index,
        metadata: {
          ...item.metadata,
          title: result.title,
          artist: result.artist,
          album: albumToSet,
        },
        isDuplicate,
        duplicateInfo,
        manuallyEdited: false,
      };
    }));
  };
  
  // Swap artist and title
  const swapArtistTitle = () => {
    if (!currentSong) return;
    
    setQueue(prev => prev.map((item, idx) => {
      if (idx !== currentIndex) return item;
      
      const newTitle = item.metadata.artist;
      const newArtist = item.metadata.title;
      const { isDuplicate, duplicateInfo } = checkDuplicate(newTitle, newArtist);
      
      return {
        ...item,
        metadata: { ...item.metadata, title: newTitle, artist: newArtist },
        isDuplicate,
        duplicateInfo,
        manuallyEdited: true,
      };
    }));
  };
  
  // Manual search
  const handleManualSearch = async () => {
    if (!currentSong) return;
    
    const query = `${currentSong.metadata.title} ${currentSong.metadata.artist}`.trim();
    if (!query) return;
    
    setIsSearchingMetadata(true);
    
    try {
      const results = await searchTrackMetadata(query, currentSong.parsedFromFilename);
      
      setQueue(prev => prev.map((item, idx) =>
        idx === currentIndex
          ? { ...item, metadataResults: results, selectedMetadataIndex: null }
          : item
      ));
    } finally {
      setIsSearchingMetadata(false);
    }
  };
  
  // Queue navigation
  const removeFromQueue = (id: string) => {
    const idx = queue.findIndex(q => q.id === id);
    const item = queue.find(q => q.id === id);
    
    // Clean up audio URL
    if (item?.audioUrl) {
      URL.revokeObjectURL(item.audioUrl);
    }
    
    setQueue(prev => prev.filter(q => q.id !== id));
    
    if (idx <= currentIndex && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };
  
  const goToNext = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };
  
  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };
  
  const goToNextPending = () => {
    const nextIdx = queue.findIndex((item, idx) => idx > currentIndex && item.status === "pending");
    
    if (nextIdx !== -1) {
      setCurrentIndex(nextIdx);
      const newPage = Math.floor(nextIdx / SONGS_PER_PAGE);
      if (newPage !== currentPage) {
        setCurrentPage(newPage);
      }
    } else {
      const firstPending = queue.findIndex(item => item.status === "pending");
      if (firstPending !== -1) {
        setCurrentIndex(firstPending);
        const newPage = Math.floor(firstPending / SONGS_PER_PAGE);
        if (newPage !== currentPage) {
          setCurrentPage(newPage);
        }
      }
    }
  };
  
  // Skip current
  const skipCurrent = () => {
    if (!currentSong) return;
    
    pushUndo({ type: "skip", item: { ...currentSong }, index: currentIndex });
    
    setQueue(prev => prev.map((item, idx) =>
      idx === currentIndex ? { ...item, status: "skipped" } : item
    ));
    
    goToNextPending();
  };
  
  // Ignore duplicate
  const ignoreDuplicate = () => {
    if (!currentSong) return;
    
    setQueue(prev => prev.map((item, idx) =>
      idx === currentIndex ? { ...item, isDuplicate: false } : item
    ));
  };
  
  // Undo
  const pushUndo = (action: UndoAction) => {
    setUndoStack(prev => [...prev.slice(-9), action]);
  };
  
  const undo = () => {
    const action = undoStack[undoStack.length - 1];
    if (!action) return;
    
    setUndoStack(prev => prev.slice(0, -1));
    
    if (action.type === "remove" || action.type === "skip") {
      setQueue(prev => {
        const newQueue = [...prev];
        newQueue.splice(action.index, 0, { ...action.item, status: "pending" });
        return newQueue;
      });
      setCurrentIndex(action.index);
    }
  };
  
  // Batch operations
  const skipAllDuplicates = () => {
    const duplicateIds = queue
      .filter(item => item.isDuplicate && item.status === "pending")
      .map(item => item.id);
    
    setQueue(prev => prev.map(item =>
      duplicateIds.includes(item.id) ? { ...item, status: "skipped" } : item
    ));
    
    toast.success(`Skipped ${duplicateIds.length} duplicate(s)`);
    goToNextPending();
  };
  
  const uploadAll = async () => {
    const pendingItems = queue.filter(item =>
      item.status === "pending" &&
      item.audioFile &&
      item.imageFile &&
      item.metadata.title &&
      item.metadata.artist &&
      !item.isDuplicate
    );
    
    if (pendingItems.length === 0) {
      toast.error("No valid songs to upload");
      return;
    }
    
    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of pendingItems) {
      const idx = queue.findIndex(q => q.id === item.id);
      setCurrentIndex(idx);
      
      setQueue(prev => prev.map(q =>
        q.id === item.id ? { ...q, status: "uploading" } : q
      ));
      
      try {
        const formData = new FormData();
        formData.append("title", item.metadata.title.trim());
        formData.append("artist", item.metadata.artist.trim());
        formData.append("duration", String(item.metadata.duration));
        
        const albumToUse = item.metadata.album || selectedAlbum;
        if (albumToUse && albumToUse !== "none") {
          formData.append("albumId", albumToUse);
          addRecentAlbum(albumToUse);
        }
        
        formData.append("audioFile", item.audioFile);
        formData.append("imageFile", item.imageFile!);
        
        await axiosInstance.post("/admin/songs", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        
        setQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, status: "success" } : q
        ));
        
        successCount++;
      } catch (error: any) {
        setQueue(prev => prev.map(q =>
          q.id === item.id
            ? { ...q, status: "error", error: error.response?.data?.message || error.message }
            : q
        ));
        errorCount++;
      }
    }
    
    setIsLoading(false);
    fetchSongs();
    fetchAlbums();
    
    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} song(s)${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
    } else if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} song(s)`);
    }
  }; 

  // Submit single song
  const handleSubmit = async () => {
    if (!currentSong || !currentSong.audioFile || !currentSong.imageFile) {
      toast.error("Please upload both audio and image files");
      return;
    }
    
    if (!currentSong.metadata.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    
    if (!currentSong.metadata.artist.trim()) {
      toast.error("Please enter an artist");
      return;
    }
    
    setQueue(prev => prev.map((item, idx) =>
      idx === currentIndex ? { ...item, status: "uploading" } : item
    ));
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("title", currentSong.metadata.title.trim());
      formData.append("artist", currentSong.metadata.artist.trim());
      formData.append("duration", String(currentSong.metadata.duration));
      
      const albumToUse = currentSong.metadata.album || selectedAlbum;
      if (albumToUse && albumToUse !== "none") {
        formData.append("albumId", albumToUse);
        addRecentAlbum(albumToUse);
        setSelectedAlbum(albumToUse);
      }
      
      formData.append("audioFile", currentSong.audioFile);
      formData.append("imageFile", currentSong.imageFile);
      
      await axiosInstance.post("/admin/songs", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setQueue(prev => prev.map((item, idx) =>
        idx === currentIndex ? { ...item, status: "success" } : item
      ));
      
      toast.success("Song added successfully!");
      goToNextPending();
      fetchSongs();
      fetchAlbums();
    } catch (error: any) {
      setQueue(prev => prev.map((item, idx) =>
        idx === currentIndex
          ? { ...item, status: "error", error: error.response?.data?.message || error.message }
          : item
      ));
      toast.error("Failed to add song");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Upload page
  const uploadPage = async (pageNum: number) => {
    const start = pageNum * SONGS_PER_PAGE;
    const end = start + SONGS_PER_PAGE;
    
    const pageItems = queue.slice(start, end).filter(item =>
      item.status === "pending" &&
      item.audioFile &&
      item.imageFile &&
      item.metadata.title &&
      item.metadata.artist &&
      !item.isDuplicate
    );
    
    if (pageItems.length === 0) {
      toast.error("No valid songs to upload on this page");
      return;
    }
    
    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of pageItems) {
      const idx = queue.findIndex(q => q.id === item.id);
      setCurrentIndex(idx);
      
      setQueue(prev => prev.map(q =>
        q.id === item.id ? { ...q, status: "uploading" } : q
      ));
      
      try {
        const formData = new FormData();
        formData.append("title", item.metadata.title.trim());
        formData.append("artist", item.metadata.artist.trim());
        formData.append("duration", String(item.metadata.duration));
        
        const albumToUse = item.metadata.album || selectedAlbum;
        if (albumToUse && albumToUse !== "none") {
          formData.append("albumId", albumToUse);
          addRecentAlbum(albumToUse);
        }
        
        formData.append("audioFile", item.audioFile);
        formData.append("imageFile", item.imageFile!);
        
        await axiosInstance.post("/admin/songs", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        
        setQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, status: "success" } : q
        ));
        
        successCount++;
      } catch (error: any) {
        setQueue(prev => prev.map(q =>
          q.id === item.id
            ? { ...q, status: "error", error: error.response?.data?.message || error.message }
            : q
        ));
        errorCount++;
      }
    }
    
    setIsLoading(false);
    fetchSongs();
    fetchAlbums();
    
    if (successCount > 0) {
      toast.success(`Page ${pageNum + 1}: Uploaded ${successCount}${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
    }
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!songDialogOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (isFormValid && !isLoading) handleSubmit();
        }
        return;
      }
      
      switch (e.key) {
        case "Enter":
          if (isFormValid && !isLoading) handleSubmit();
          break;
        case "ArrowLeft":
          goToPrev();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "s":
        case "S":
          if (!e.ctrlKey && !e.metaKey) skipCurrent();
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            undo();
          }
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          const idx = parseInt(e.key) - 1;
          if (currentSong?.metadataResults[idx]) {
            selectMetadataResult(idx);
          }
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [songDialogOpen, currentSong, isLoading]);
  
  // Reset on dialog close
  const handleOpenChange = (open: boolean) => {
    setSongDialogOpen(open);
    if (!open) {
      // Clean up audio URLs
      queue.forEach(item => {
        if (item.audioUrl) {
          URL.revokeObjectURL(item.audioUrl);
        }
      });
      setQueue([]);
      setCurrentIndex(0);
      setSelectedAlbum("");
      setUndoStack([]);
      setCurrentPage(0);
    }
  };
  
  // Stats
  const stats = useMemo(() => ({
    pending: queue.filter(q => q.status === "pending").length,
    success: queue.filter(q => q.status === "success").length,
    error: queue.filter(q => q.status === "error").length,
    skipped: queue.filter(q => q.status === "skipped").length,
    duplicates: queue.filter(q => q.isDuplicate && q.status === "pending").length,
  }), [queue]);

  // Pagination
  const totalPages = Math.ceil(queue.length / SONGS_PER_PAGE);
  const paginatedQueue = useMemo(() => {
    const start = currentPage * SONGS_PER_PAGE;
    return queue.slice(start, start + SONGS_PER_PAGE);
  }, [queue, currentPage]);

  const currentPageStats = useMemo(() => ({
    start: currentPage * SONGS_PER_PAGE + 1,
    end: Math.min((currentPage + 1) * SONGS_PER_PAGE, queue.length),
    pending: paginatedQueue.filter(q => q.status === "pending").length,
    success: paginatedQueue.filter(q => q.status === "success").length,
  }), [paginatedQueue, currentPage, queue.length]);

  // Helper to get the actual index in the full queue
  const getGlobalIndex = (localIndex: number) => currentPage * SONGS_PER_PAGE + localIndex;
  
  const isFormValid = currentSong &&
    currentSong.audioFile &&
    currentSong.imageFile &&
    currentSong.metadata.title &&
    currentSong.metadata.artist &&
    currentSong.status === "pending" &&
    (!currentSong.isDuplicate);
  
  const progressPercent = queue.length > 0
    ? ((stats.success + stats.skipped) / queue.length) * 100
    : 0;
  
  // Show mobile block screen
  if (isMobile && songDialogOpen) {
    return (
      <Dialog open={songDialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button className="bg-violet-500 hover:bg-violet-600 text-white font-medium">
            <Plus className="mr-2 h-4 w-4" />
            Add Song
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-zinc-900 border-zinc-800 p-0 w-[95vw] max-w-md">
          <MobileBlockScreen />
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={songDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-violet-500 hover:bg-violet-600 text-white font-medium">
          <Plus className="mr-2 h-4 w-4" />
          Add Song
        </Button>
      </DialogTrigger>
      
      <DialogContent
        ref={dialogRef}
        className={cn(
          "bg-zinc-900 border-zinc-800 overflow-hidden flex flex-col p-0",
          "w-[95vw] max-w-4xl max-h-[90vh]",
          "sm:w-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <DialogTitle className="text-white text-lg">Add Songs</DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                Select folder or drop files
              </DialogDescription>
            </div>

            {/* Processing Progress */}
            {isProcessing && processingProgress.total > 0 && (
              <div className="space-y-1 flex-1 mx-4">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing files...
                  </span>
                  <span>{processingProgress.current}/{processingProgress.total}</span>
                </div>
                <Progress 
                  value={(processingProgress.current / processingProgress.total) * 100} 
                  className="h-1" 
                />
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <KeyboardShortcutsHelp />
              
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore
                webkitdirectory="true"
                directory="true"
                multiple
                className="hidden"
                onChange={handleFolderSelect}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => folderInputRef.current?.click()}
                disabled={isProcessing}
                className="border-zinc-700 mt-6 hover:bg-zinc-800"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FolderOpen className="w-4 h-4 mr-2" />
                )}
                Folder
              </Button>
            </div>
          </div>
          
          {/* Progress & Stats */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-1" />
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-zinc-400">
                  <span>{stats.pending} pending</span>
                  {stats.success > 0 && (
                    <span className="text-green-400">{stats.success} done</span>
                  )}
                  {stats.duplicates > 0 && (
                    <span className="text-amber-400">{stats.duplicates} duplicates</span>
                  )}
                  {stats.error > 0 && (
                    <span className="text-red-400">{stats.error} errors</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {undoStack.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={undo}
                      className="h-6 px-2 text-xs text-zinc-400"
                    >
                      <Undo2 className="w-3 h-3 mr-1" />
                      Undo
                    </Button>
                  )}
                  
                  {queue.length > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={goToPrev}
                        disabled={currentIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-zinc-300 min-w-[50px] text-center">
                        {currentIndex + 1} / {queue.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={goToNext}
                        disabled={currentIndex === queue.length - 1}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* Queue Sidebar */}
          {queue.length > 1 && (
            <div className="shrink-0 border-r border-zinc-800 flex flex-col w-52">
              {/* Page Header */}
              {totalPages > 1 && (
                <div className="p-2 border-b border-zinc-800 shrink-0">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                    <span>
                      Page {currentPage + 1}/{totalPages}
                    </span>
                    <span>
                      {currentPageStats.start}-{currentPageStats.end} of {queue.length}
                    </span>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="flex-1 h-7 text-xs border-zinc-700"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      Prev
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(p => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={currentPage === totalPages - 1}
                      className="flex-1 h-7 text-xs border-zinc-700"
                    >
                      Next
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>

                  {currentPageStats.pending > 0 && (
                    <Button
                      size="sm"
                      onClick={() => uploadPage(currentPage)}
                      disabled={isLoading}
                      className="w-full mt-2 h-7 text-xs bg-violet-600 hover:bg-violet-700"
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Upload Page ({currentPageStats.pending})
                    </Button>
                  )}
                </div>
              )}

              {/* Queue Items */}
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                  {paginatedQueue.map((item, localIdx) => {
                    const globalIdx = getGlobalIndex(localIdx);

                    return (
                      <QueueItem
                        key={item.id}
                        item={item}
                        isActive={globalIdx === currentIndex}
                        onClick={() => setCurrentIndex(globalIdx)}
                        onRemove={() => removeFromQueue(item.id)}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* Main Form */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-2xl mx-auto">
              {/* Drop Zones */}
              <div className="grid grid-cols-2 gap-3">
                <DropZone
                  onFileDrop={handleAudioDrop}
                  accept="audio/*"
                  file={currentSong?.audioFile || null}
                  onClear={clearAudio}
                  icon={Music}
                  label="Audio"
                  sublabel="MP3, WAV, FLAC"
                  isLoading={isProcessing}
                  maxSize={MAX_AUDIO_SIZE_BYTES}
                />
                
                <DropZone
                  onFileDrop={handleImageDrop}
                  accept="image/*"
                  file={currentSong?.imageFile || null}
                  onClear={clearImage}
                  icon={ImageIcon}
                  label="Cover"
                  sublabel="JPG, PNG"
                  preview={currentSong?.imagePreview}
                  maxSize={MAX_IMAGE_SIZE_BYTES}
                />
              </div>
              
              {/* Audio Preview Player */}
              {currentSong && (
                <AudioPlayer
                  audioUrl={currentSong.audioUrl}
                  title={currentSong.metadata.title}
                  artist={currentSong.metadata.artist}
                  imageUrl={currentSong.imagePreview}
                />
              )}
              
              {/* Duplicate Warning */}
              {currentSong?.isDuplicate && currentSong.duplicateInfo && (
                <DuplicateWarning
                  duplicateInfo={currentSong.duplicateInfo}
                  onIgnore={ignoreDuplicate}
                  onSkip={skipCurrent}
                />
              )}
              
              {/* Duration */}
              {currentSong && currentSong.metadata.duration > 0 && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-800/50 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-zinc-300">
                    {formatDuration(currentSong.metadata.duration)}
                  </span>
                  <span className="text-xs text-zinc-500">•</span>
                  <span className="text-[10px] text-zinc-500 line-clamp-1 flex-1">
                    {currentSong.originalFilename}
                  </span>
                </div>
              )}

              {/* Searching Metadata Loading State */}
              {isSearchingMetadata && (
                <div className="flex items-center gap-2 p-2.5 bg-zinc-800/30 rounded-lg">
                  <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                  <span className="text-sm text-zinc-400">Searching music databases...</span>
                </div>
              )}
              
              {/* Metadata Results - Vertical Scrollable */}
              {currentSong && currentSong.metadataResults.length > 0 && !isSearchingMetadata && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Results ({currentSong.metadataResults.length})
                    </p>
                    <span className="text-[10px] text-zinc-600">Click to select • Keys 1-5</span>
                  </div>
                  
                  {/* Vertical scroll container */}
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    {currentSong.metadataResults.slice(0, 6).map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectMetadataResult(index)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all",
                          currentSong.selectedMetadataIndex === index
                            ? "border-violet-500 bg-violet-500/10"
                            : result.warnings.length > 0 && result.confidence < 0.5
                            ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Selection indicator */}
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                            currentSong.selectedMetadataIndex === index
                              ? "border-violet-500 bg-violet-500"
                              : "border-zinc-600"
                          )}>
                            {currentSong.selectedMetadataIndex === index && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[10px] text-zinc-500 font-mono">#{index + 1}</span>
                              <ConfidenceBadge confidence={result.confidence} />
                              <SourceBadge source={result.source} />
                              {result.matchesFilename && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400 shrink-0">
                                  <Check className="w-3 h-3" />
                                  Matches
                                </span>
                              )}
                            </div>
                            
                            <p className="font-medium text-sm text-white line-clamp-1">{result.title}</p>
                            <p className="text-xs text-zinc-400 line-clamp-1">{result.artist}</p>
                            
                            {/* Show original artist if changed */}
                            {result.originalArtist && (
                              <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                                Original: {result.originalArtist}
                              </p>
                            )}
                            
                            {result.album && (
                              <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                                Album: {result.album}
                              </p>
                            )}
                            
                            {/* Warnings */}
                            {result.warnings.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {result.warnings.map((warning, wIdx) => (
                                  <WarningBadge key={wIdx} warning={warning} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Title Input */}
              {currentSong && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">Title</label>
                    {currentSong.metadata.title && currentSong.metadata.artist && (
                      <button
                        type="button"
                        onClick={swapArtistTitle}
                        className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Swap
                      </button>
                    )}
                  </div>
                  <Input
                    value={currentSong.metadata.title}
                    onChange={(e) => updateMetadata("title", e.target.value)}
                    placeholder="Song title"
                    className="h-9 bg-zinc-800 border-zinc-700 focus:border-violet-500 text-sm"
                  />
                </div>
              )}
              
              {/* Artist Input */}
              {currentSong && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">Artist</label>
                    <button
                      type="button"
                      onClick={handleManualSearch}
                      disabled={isSearchingMetadata || (!currentSong.metadata.title && !currentSong.metadata.artist)}
                      className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-50"
                    >
                      {isSearchingMetadata ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Search className="w-3 h-3" />
                      )}
                      Search
                    </button>
                  </div>
                  <Input
                    value={currentSong.metadata.artist}
                    onChange={(e) => updateMetadata("artist", e.target.value)}
                    placeholder="Artist name"
                    className="h-9 bg-zinc-800 border-zinc-700 focus:border-violet-500 text-sm"
                  />
                </div>
              )}
			  
              
              {/* Album Selection */}
              <div className="space-y-1.5">

			  {currentSong && currentSong.albumSuggestions.length > 0 && (
			<AlbumSuggestionPanel
				suggestions={currentSong.albumSuggestions}
				selectedAlbum={currentSong.metadata.album || selectedAlbum}
				onSelectAlbum={(albumId) => {
				updateMetadata("album", albumId);
				setSelectedAlbum(albumId);
				}}
				onCreateAlbum={(title) => {
				toast.custom(
					<div className="bg-zinc-900 text-white px-4 py-3 rounded-lg shadow-lg border border-zinc-700">
					<p className="font-medium">Create New Album</p>
					<p className="text-sm text-zinc-400 mt-1">
						Suggested: "{title}"
					</p>
					<p className="text-xs text-zinc-500 mt-2">
						Go to Albums tab to create it first
					</p>
					</div>,
					{ duration: 4000 }
				);
				}}
				albums={albums}
			/>
			)}
                <label className="text-xs font-medium text-zinc-300">
                  Album <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                
                {/* Recent Albums */}
                {recentAlbums.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recentAlbums.map(album => (
                      <button
                        key={album._id}
                        type="button"
                        onClick={() => {
                          if (currentSong) {
                            updateMetadata("album", currentSong.metadata.album === album._id ? "" : album._id);
                          }
                          setSelectedAlbum(album._id);
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all",
                          currentSong?.metadata.album === album._id
                            ? "bg-violet-500 text-white"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        )}
                      >
                        {album.imageUrl ? (
                          <img src={album.imageUrl} alt="" className="w-3.5 h-3.5 rounded object-cover" />
                        ) : (
                          <Music className="w-3 h-3" />
                        )}
                        <span className="line-clamp-1">{album.title}</span>
                        {currentSong?.metadata.album === album._id && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Album Select Dropdown */}
                <Select
                  value={currentSong?.metadata.album || selectedAlbum}
                  onValueChange={(value) => {
                    if (currentSong) {
                      updateMetadata("album", value);
                    }
                    setSelectedAlbum(value);
                  }}
                >
                  <SelectTrigger className="h-9 bg-zinc-800 border-zinc-700 text-sm">
                    <SelectValue placeholder="Select album" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[180px]">
                    <SelectItem value="none">
                      <span className="text-zinc-400">No Album (Single)</span>
                    </SelectItem>
                    {albums.map(album => (
                      <SelectItem key={album._id} value={album._id}>
                        <div className="flex items-center gap-2">
                          {album.imageUrl && (
                            <img src={album.imageUrl} alt="" className="w-4 h-4 rounded object-cover" />
                          )}
                          <span className="line-clamp-1">{album.title}</span>
                          <span className="text-zinc-500 text-xs line-clamp-1">• {album.artist}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Error Display */}
              {currentSong?.status === "error" && currentSong.error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                  <p className="text-xs text-red-400 flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="line-clamp-2">{currentSong.error}</span>
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setQueue(prev => prev.map((item, idx) =>
                        idx === currentIndex ? { ...item, status: "pending", error: undefined } : item
                      ));
                    }}
                    className="mt-2 h-7 text-xs border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </div>
              )}
              
              {/* Success Display */}
              {currentSong?.status === "success" && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-300">Song Added!</p>
                  <p className="text-xs text-green-400/70 mt-1 line-clamp-1">
                    {currentSong.metadata.title} by {currentSong.metadata.artist}
                  </p>
                </div>
              )}
              
              {/* Skipped Display */}
              {currentSong?.status === "skipped" && (
                <div className="bg-zinc-700/30 border border-zinc-700/50 rounded-lg p-3 text-center">
                  <Ban className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-400">Skipped</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setQueue(prev => prev.map((item, idx) =>
                        idx === currentIndex ? { ...item, status: "pending" } : item
                      ));
                    }}
                    className="mt-2 h-7 text-xs border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                  >
                    <Undo2 className="w-3 h-3 mr-1" />
                    Restore
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Footer */}
        <DialogFooter className="p-4 border-t border-zinc-800 shrink-0 gap-2 flex-wrap">
          {/* Batch Actions */}
          {stats.duplicates > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={skipAllDuplicates}
              className="mr-auto border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Skip All Duplicates ({stats.duplicates})
            </Button>
          )}
          
          {stats.pending > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={uploadAll}
              disabled={isLoading}
              className="border-violet-500/50 text-violet-400 hover:bg-violet-500/20"
            >
              <Zap className="w-4 h-4 mr-1" />
              Upload All ({stats.pending - stats.duplicates})
            </Button>
          )}
          
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              {stats.pending === 0 ? "Close" : "Cancel"}
            </Button>
            
            {currentSong && currentSong.status === "pending" && (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !isFormValid}
                className={cn(
                  "min-w-[100px]",
                  isFormValid ? "bg-violet-500 hover:bg-violet-600" : "bg-zinc-700 text-zinc-400"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Add
                    {stats.pending > 1 && (
                      <span className="ml-1 text-xs opacity-70">({stats.pending} left)</span>
                    )}
                  </>
                )}
              </Button>
            )}
            
            {currentSong && currentSong.status === "success" && stats.pending > 0 && (
              <Button
                onClick={goToNextPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Next
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSongDialog;