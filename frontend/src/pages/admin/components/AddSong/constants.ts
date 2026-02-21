// ============================================================================
// FILE & SIZE CONSTANTS
// ============================================================================

export const MAX_AUDIO_SIZE_MB = 8;
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const AUDIO_EXTENSIONS = [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".wma"];
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];

export const SONGS_PER_PAGE = 20;

// ============================================================================
// REGEX PATTERNS
// ============================================================================

export const CJK_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
export const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
export const ARABIC_REGEX = /[\u0600-\u06FF]/;

// ============================================================================
// SOUNDTRACK & ARTIST FILTERS
// ============================================================================

export const SOUNDTRACK_INDICATORS = [
  "soundtrack", "ost", "original sound", "motion picture", "film score",
  "movie", "cinema", "theme from", "end credits", "opening theme",
  "television", "tv series", "from the film", "from the movie",
  "score", "background music", "bgm", "instrumental version",
];

export const DEPRIORITIZE_ARTISTS = [
  "orchestra", "philharmonic", "symphony", "ensemble", "choir",
  "band", "players", "strings", "brass", "winds", "quartet",
  "quintet", "trio", "duo", "chamber", "soloists", "singers",
  "records", "recordings", "music", "entertainment", "productions",
  "label", "studios", "audio", "sound", "slatty", "various artists",
  "compilation", "soundtrack", "ost", "original",
];

// ============================================================================
// GENRE, MOOD & LANGUAGE OPTIONS
// ============================================================================

export const GENRE_OPTIONS = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Electronic", "Dance", "Indie",
  "Alternative", "Classical", "Jazz", "Country", "Folk", "Metal",
  "Punk", "Reggae", "Blues", "Soul", "Funk", "Lo-Fi", "Ambient",
  "Devotional", "Ghazal", "Qawwali", "Film/Soundtrack", "Indie Pop",
  "Rap", "Trap", "EDM", "K-Pop", "J-Pop", "Latin", "Reggaeton",
  "Acoustic", "Instrumental", "Other",
];

export const MOOD_OPTIONS = [
  "Happy", "Sad", "Energetic", "Chill", "Romantic", "Party",
  "Motivational", "Melancholy", "Angry", "Peaceful", "Nostalgic",
  "Dark", "Dreamy", "Uplifting", "Intense", "Groovy", "Soulful",
  "Playful", "Epic", "Devotional",
];

export const LANGUAGE_OPTIONS = [
  "Tamil", "Hindi", "English", "Telugu", "Malayalam", "Kannada",
  "Punjabi", "Bengali", "Marathi", "Gujarati", "Korean", "Japanese",
  "Spanish", "French", "Arabic", "Instrumental", "Other",
];

// ============================================================================
// LAST.FM TAG MAPPINGS (for auto-detection via backend)
// ============================================================================

export const TAG_TO_GENRE: Record<string, string> = {
  "pop": "Pop", "synth pop": "Pop", "synthpop": "Pop", "dance pop": "Pop",
  "rock": "Rock", "classic rock": "Rock", "hard rock": "Rock", "soft rock": "Rock",
  "hip-hop": "Hip-Hop", "hip hop": "Hip-Hop", "hiphop": "Hip-Hop",
  "rap": "Rap",
  "r&b": "R&B", "rnb": "R&B", "rhythm and blues": "R&B",
  "electronic": "Electronic", "electro": "Electronic", "synthwave": "Electronic",
  "dance": "Dance",
  "indie": "Indie", "indie rock": "Indie",
  "indie pop": "Indie Pop",
  "alternative": "Alternative", "alt rock": "Alternative", "alternative rock": "Alternative",
  "classical": "Classical", "orchestra": "Classical",
  "jazz": "Jazz", "smooth jazz": "Jazz",
  "country": "Country",
  "folk": "Folk", "folk rock": "Folk",
  "metal": "Metal", "heavy metal": "Metal", "death metal": "Metal", "black metal": "Metal", "thrash metal": "Metal",
  "punk": "Punk", "punk rock": "Punk", "pop punk": "Punk",
  "reggae": "Reggae", "ska": "Reggae",
  "blues": "Blues",
  "soul": "Soul", "neo soul": "Soul", "neo-soul": "Soul",
  "funk": "Funk",
  "lo-fi": "Lo-Fi", "lofi": "Lo-Fi", "lo fi": "Lo-Fi",
  "ambient": "Ambient", "chillwave": "Ambient",
  "devotional": "Devotional", "bhajan": "Devotional", "kirtan": "Devotional",
  "ghazal": "Ghazal",
  "qawwali": "Qawwali",
  "soundtrack": "Film/Soundtrack", "ost": "Film/Soundtrack", "film": "Film/Soundtrack",
  "bollywood": "Film/Soundtrack", "kollywood": "Film/Soundtrack", "tollywood": "Film/Soundtrack",
  "trap": "Trap",
  "edm": "EDM", "house": "EDM", "techno": "EDM", "trance": "EDM", "dubstep": "EDM",
  "k-pop": "K-Pop", "kpop": "K-Pop",
  "j-pop": "J-Pop", "jpop": "J-Pop",
  "latin": "Latin", "latin pop": "Latin",
  "reggaeton": "Reggaeton",
  "acoustic": "Acoustic", "unplugged": "Acoustic",
  "instrumental": "Instrumental",
};

export const TAG_TO_MOOD: Record<string, string> = {
  "happy": "Happy", "feel good": "Happy", "upbeat": "Happy", "cheerful": "Happy", "fun": "Happy", "joyful": "Happy",
  "sad": "Sad", "depressing": "Sad", "heartbreak": "Sad", "tearjerker": "Sad", "crying": "Sad",
  "energetic": "Energetic", "energy": "Energetic", "hype": "Energetic", "pump up": "Energetic", "adrenaline": "Energetic",
  "chill": "Chill", "chillout": "Chill", "chill out": "Chill", "relax": "Chill", "relaxing": "Chill", "laid back": "Chill",
  "romantic": "Romantic", "love": "Romantic", "romance": "Romantic", "sexy": "Romantic", "sensual": "Romantic",
  "party": "Party", "club": "Party", "dancefloor": "Party", "friday night": "Party",
  "motivational": "Motivational", "inspirational": "Motivational", "inspiring": "Motivational", "workout": "Motivational", "gym": "Motivational",
  "melancholy": "Melancholy", "melancholic": "Melancholy", "bittersweet": "Melancholy",
  "angry": "Angry", "aggressive": "Angry", "rage": "Angry", "furious": "Angry",
  "peaceful": "Peaceful", "serene": "Peaceful", "tranquil": "Peaceful", "meditation": "Peaceful", "calm": "Peaceful", "zen": "Peaceful",
  "nostalgic": "Nostalgic", "nostalgia": "Nostalgic", "throwback": "Nostalgic", "memories": "Nostalgic",
  "dark": "Dark", "gothic": "Dark", "gloomy": "Dark", "sinister": "Dark",
  "dreamy": "Dreamy", "ethereal": "Dreamy", "atmospheric": "Dreamy", "shoegaze": "Dreamy",
  "uplifting": "Uplifting", "euphoric": "Uplifting", "triumphant": "Uplifting",
  "intense": "Intense", "powerful": "Intense", "heavy": "Intense",
  "groovy": "Groovy", "groove": "Groovy", "funky": "Groovy",
  "soulful": "Soulful",
  "playful": "Playful", "quirky": "Playful", "whimsical": "Playful",
  "epic": "Epic", "cinematic": "Epic", "dramatic": "Epic", "orchestral": "Epic",
  "devotional": "Devotional", "spiritual": "Devotional", "sacred": "Devotional",
};

export const TAG_TO_LANGUAGE: Record<string, string> = {
  "tamil": "Tamil", "kollywood": "Tamil",
  "hindi": "Hindi", "bollywood": "Hindi",
  "english": "English", "british": "English", "american": "English",
  "telugu": "Telugu", "tollywood": "Telugu",
  "malayalam": "Malayalam", "mollywood": "Malayalam",
  "kannada": "Kannada", "sandalwood": "Kannada",
  "punjabi": "Punjabi", "bhangra": "Punjabi",
  "bengali": "Bengali", "bangla": "Bengali",
  "marathi": "Marathi",
  "gujarati": "Gujarati",
  "korean": "Korean", "k-pop": "Korean", "kpop": "Korean",
  "japanese": "Japanese", "j-pop": "Japanese", "jpop": "Japanese", "anime": "Japanese",
  "spanish": "Spanish", "espanol": "Spanish", "español": "Spanish",
  "french": "French", "français": "French",
  "arabic": "Arabic",
  "instrumental": "Instrumental",
};

// ============================================================================
// CLOUD PROVIDERS
// ============================================================================

export const CLOUD_PROVIDERS_UI = [
  {
    id: "imagekit",
    name: "ImageKit",
    icon: "🚀",
    activeColor: "bg-emerald-500/20 border-emerald-500",
    recommended: true,
  },
  {
    id: "cloudinary",
    name: "Cloudinary",
    icon: "☁️",
    activeColor: "bg-blue-500/20 border-blue-500",
    recommended: false,
  },
] as const;

export type CloudProviderId = (typeof CLOUD_PROVIDERS_UI)[number]["id"];

// ============================================================================
// ALBUM SUGGESTION DATA
// ============================================================================

export const ALBUM_CAPACITY_LIMIT = 200;

export const LANGUAGE_ALBUMS: Record<string, { keywords: string[]; suggestions: string[] }> = {
  tamil: {
    keywords: ["tamil", "kollywood", "தமிழ்", "anirudh", "yuvan", "ar rahman", "ilayaraja", "sid sriram", "shreya ghoshal tamil"],
    suggestions: [
      "Best Songs Ever - Tamil",
      "Tamil Hits Collection",
      "Kollywood Vibes",
      "Tamil Melodies",
      "Tamil Party Mix",
    ],
  },
  hindi: {
    keywords: ["hindi", "bollywood", "हिंदी", "arijit", "neha kakkar", "badshah", "honey singh", "shreya ghoshal hindi", "atif aslam"],
    suggestions: [
      "Best Songs Ever - Hindi",
      "Bollywood Hits",
      "Hindi Melodies",
      "Bollywood Party Mix",
      "Hindi Romantic Songs",
    ],
  },
  english: {
    keywords: ["english", "pop", "rock", "hip hop", "rap", "edm", "country", "r&b", "soul", "jazz", "indie"],
    suggestions: [
      "Best Songs Ever - English",
      "English Hits",
      "Pop Essentials",
      "English Vibes",
      "Western Classics",
    ],
  },
  telugu: {
    keywords: ["telugu", "tollywood", "తెలుగు", "dsp", "thaman", "mani sharma"],
    suggestions: [
      "Best Songs Ever - Telugu",
      "Tollywood Hits",
      "Telugu Melodies",
      "Telugu Party Mix",
    ],
  },
  malayalam: {
    keywords: ["malayalam", "mollywood", "മലയാളം"],
    suggestions: [
      "Best Songs Ever - Malayalam",
      "Malayalam Hits",
      "Mollywood Melodies",
    ],
  },
  kannada: {
    keywords: ["kannada", "sandalwood", "ಕನ್ನಡ"],
    suggestions: [
      "Best Songs Ever - Kannada",
      "Kannada Hits",
      "Sandalwood Melodies",
    ],
  },
  punjabi: {
    keywords: ["punjabi", "ਪੰਜਾਬੀ", "diljit", "sidhu moose", "ap dhillon", "karan aujla"],
    suggestions: [
      "Best Songs Ever - Punjabi",
      "Punjabi Hits",
      "Punjabi Party Mix",
      "Bhangra Beats",
    ],
  },
  korean: {
    keywords: ["korean", "kpop", "k-pop", "bts", "blackpink", "한국어", "twice", "exo", "stray kids"],
    suggestions: ["K-Pop Hits", "Korean Essentials", "K-Pop Party"],
  },
  spanish: {
    keywords: ["spanish", "latino", "reggaeton", "español", "bad bunny", "j balvin", "daddy yankee"],
    suggestions: [
      "Best Songs Ever - Spanish",
      "Latino Hits",
      "Reggaeton Mix",
      "Spanish Vibes",
    ],
  },
  japanese: {
    keywords: ["japanese", "j-pop", "jpop", "anime", "日本語"],
    suggestions: ["J-Pop Hits", "Anime OST", "Japanese Essentials"],
  },
};

export const MOOD_ALBUMS: Record<string, { keywords: string[]; suggestions: string[] }> = {
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

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface NewSong {
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: string;
  mood: string;
  language: string;
}

export interface ParsedMetadata {
  title: string;
  artist: string;
  confidence: number;
}

export type MetadataWarning =
  | "non_latin"
  | "soundtrack"
  | "low_confidence"
  | "mismatch_filename"
  | "possible_cover"
  | "generic_title"
  | "generic_artist";

export interface MetadataResult {
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
  originalArtist?: string;
}

export interface AlbumSuggestion {
  albumId: string;
  albumTitle: string;
  reason: string;
  confidence: number;
  songCount?: number;
}

export interface QueuedSong {
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
  cloud: CloudProviderId;
}

export interface UndoAction {
  type: "remove" | "skip" | "edit";
  item: QueuedSong;
  index: number;
}