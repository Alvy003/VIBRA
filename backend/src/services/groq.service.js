// backend/services/groq.service.js

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Default model - fastest and most cost-effective (Updated to supported 3.3 version)
const MODEL = "llama-3.3-70b-versatile";

// ─────────────────────────────────────────────────────────────────
// REGIONAL ARTIST MAP (JioSaavn-specific, for fallback if Groq fails)
// ─────────────────────────────────────────────────────────────────
const REGIONAL_ARTISTS = {
  hindi: {
    chill:    ['Arijit Singh', 'Jubin Nautiyal', 'Anuv Jain', 'KK', 'Shaan', 'Atif Aslam'],
    party:    ['Badshah', 'Honey Singh', 'Guru Randhawa', 'Yo Yo Honey Singh', 'Tony Kakkar'],
    focus:    ['A.R. Rahman', 'Shankar Ehsaan Loy', 'Amit Trivedi', 'Vishal Shekhar'],
    workout:  ['Pritam', 'Badshah', 'Mika Singh', 'Sukhwinder Singh', 'Daler Mehndi'],
    romantic: ['Arijit Singh', 'Atif Aslam', 'Shreya Ghoshal', 'Sunidhi Chauhan', 'Udit Narayan'],
    sad:      ['Arijit Singh', 'KK', 'Mohit Chauhan', 'Jubin Nautiyal', 'Armaan Malik'],
  },
  punjabi: {
    chill:    ['Satinder Sartaaj', 'Gurdas Maan', 'Ranjit Bawa', 'Harbhajan Mann'],
    party:    ['Diljit Dosanjh', 'AP Dhillon', 'Sidhu Moose Wala', 'Karan Aujla', 'Parmish Verma'],
    focus:    ['Satinder Sartaaj', 'Shivjot', 'Ranjit Bawa'],
    workout:  ['AP Dhillon', 'Sidhu Moose Wala', 'Diljit Dosanjh', 'Badshah', 'Hardy Sandhu'],
    romantic: ['Diljit Dosanjh', 'Amrinder Gill', 'B Praak', 'Jassi Gill', 'Gurnam Bhullar'],
    sad:      ['B Praak', 'Amrinder Gill', 'Sajjan Raazi', 'Babbal Rai'],
  },
  tamil: {
    chill:    ['A.R. Rahman', 'Harris Jayaraj', 'Sid Sriram', 'Anirudh Ravichander'],
    party:    ['Anirudh Ravichander', 'Yuvan Shankar Raja', 'Devi Sri Prasad', 'G.V. Prakash Kumar'],
    focus:    ['A.R. Rahman', 'Ilayaraja', 'Harris Jayaraj'],
    workout:  ['Anirudh Ravichander', 'Devi Sri Prasad', 'Yuvan Shankar Raja'],
    romantic: ['Sid Sriram', 'A.R. Rahman', 'Harris Jayaraj', 'Vijay Antony', 'G.V. Prakash Kumar'],
    sad:      ['Sid Sriram', 'A.R. Rahman', 'Harris Jayaraj', 'Karthik'],
  },
  telugu: {
    chill:    ['S.S. Thaman', 'Mickey J Meyer', 'Thaman S', 'Sid Sriram'],
    party:    ['Devi Sri Prasad', 'S.S. Thaman', 'Anup Rubens'],
    focus:    ['M.M. Keeravani', 'Devi Sri Prasad', 'S.S. Thaman'],
    workout:  ['Devi Sri Prasad', 'S.S. Thaman', 'Anup Rubens'],
    romantic: ['S.S. Thaman', 'Mickey J Meyer', 'Thaman S', 'Sid Sriram'],
    sad:      ['S.S. Thaman', 'Mickey J Meyer', 'Devi Sri Prasad'],
  },
  malayalam: {
    chill:    ['Vineeth Sreenivasan', 'K.S. Harisankar', 'Job Kurian', 'Pradeep Kumar'],
    party:    ['Sushin Shyam', 'Jakes Bejoy', 'Gopi Sundar'],
    focus:    ['M. Jayachandran', 'Bijibal', 'Sushin Shyam'],
    workout:  ['Sushin Shyam', 'Jakes Bejoy', 'Gopi Sundar'],
    romantic: ['Vineeth Sreenivasan', 'Shreya Ghosal', 'K.S. Chithra', 'P. Jayachandran'],
    sad:      ['K.J. Yesudas', 'K.S. Chithra', 'M.G. Sreekumar'],
  },
};

export const MALAYALAM_SEED_ARTISTS = [
  "Sushin Shyam", "Vishnu Vijay", "Shaan Rahman", "Hesham Abdul Wahab", "Sooraj Santhosh", 
  "Dabzee", "Baby Jean", "Job Kurian", "Harish Sivaramakrishnan", "Neha Nair", 
  "Sithara Krishnakumar", "Ankit Menon", "Pradeep Kumar", "Thaikkudam Bridge", 
  "Masala Coffee", "Vineeth Sreenivasan", "K.S. Harisankar", "Anne Amie"
];

export const TAMIL_SEED_ARTISTS = [
  "Anirudh Ravichander", "A.R. Rahman", "Santhosh Narayanan", "Harris Jayaraj", 
  "Yuvan Shankar Raja", "Sid Sriram", "Shakthisree Gopalan", "Dhee", "Pradeep Kumar",
  "Ilaiyaraaja", "Sean Roldan", "G.V. Prakash", "Leon James"
];

export const HINDI_SEED_ARTISTS = [
  "Arijit Singh", "Pritam", "Amit Trivedi", "Anuv Jain", "Prateek Kuhad", 
  "Jasleen Royal", "Shilpa Rao", "Mohit Chauhan", "Vishal-Shekhar", "Sachin-Jigar",
  "Badshah", "Divine", "Seedhe Maut", "Krsna"
];

export function getRegionalArtists(language, vibe) {
  const langMap = REGIONAL_ARTISTS[language];
  if (!langMap) return [];
  return langMap[vibe] || langMap['chill'] || [];
}

// ─────────────────────────────────────────────────────────────────
// 1. PROCESS AI CHAT (Conversational + Playlist Analysis)
// ─────────────────────────────────────────────────────────────────
export const processAIChat = async (userQuery, history = [], isPlaylistMode = false, directMode = false) => {
  try {
    const historyContext = history.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
    
    // Determine the primary instruction based on mode and query
    let systemInstruction = "You are Vibra AI, a helpful music discovery assistant.";
    if (isPlaylistMode || directMode) {
       systemInstruction += " Focus on Extracting music preferences for playlist generation.";
    }

    const prompt = `${systemInstruction}
Analyze the user's latest message and determine their intent.

${isPlaylistMode ? 'CRITICAL: User is in "Playlist Generation Mode". Prioritize "playlist" or "clarify" intents over "chat". Only use "chat" if the user is saying hello or something completely unrelated to music.' : ''}

INTENT TYPES:
1. "playlist": User wants to generate a playlist and has provided enough info.
2. "clarify": User wants a playlist but info is missing (e.g., missing language, vague count, or vibe).
3. "chat": General music question, greeting, or feedback.

GUIDELINES:
- If intent is "playlist", extract: vibe, language, era, size, mood_keywords.
- If intent is "clarify", provide a helpful "message" asking for specific missing info.
- If intent is "chat", provide a "message" with a high-end, expert music response.
- For "playlist", vibe MUST be: [chill, party, focus, workout, romantic, sad].
- For "playlist", language MUST be: [hindi, english, punjabi, tamil, telugu, malayalam, multi].
- For "playlist", era MUST be: [latest, classic, mix].
- For "playlist", size MUST be: [15, 30, 50]. Default to 15 if not specified.

User Message: "${userQuery}"

Response format (JSON only):
{
  "intent": "playlist" | "clarify" | "chat",
  "message": "String (Only for chat/clarify)",
  "params": {
    "vibe": "chill",
    "language": "hindi",
    "era": "latest",
    "size": 15,
    "mood_keywords": ["rainy", "peaceful"]
  },
  "is_expansion": boolean (true if user wants to add more songs to current list),
  "confidence": 0-100
}
`;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a JSON-only response bot for Vibra AI. Never explain your JSON or add markdown.",
        },
        ...history.slice(-4).map(m => ({
          role: m.role,
          content: m.text || m.content
        })), // Include brief context correctly mapped
        {
          role: "user",
          content: prompt,
        },
      ],
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content.trim());

    // --- AGGRESSIVE SKIP LOGIC / DIRECT MODE OVERRIDE ---
    const hasSpecifics = /by|from|like|songs of|hits of|classic|trending|tredning|phonk|rahman|arijit|gym|workout|party|drive|hits|track|songs|play|playlist|create|generate|music/i.test(userQuery);
    
    if (directMode || hasSpecifics) {
       // Force playlist intent if it wasn't already
       if (parsed.intent !== 'playlist') {
         parsed.intent = 'playlist';
         parsed.message = "Building your playlist immediately...";
       }
       parsed.confidence = 100;
       
       // Ensure params exist
       if (!parsed.params) {
         parsed.params = {
           vibe: 'any',
           language: 'any',
           era: 'mix',
           size: 15,
           mood_keywords: []
         };
       }
    }

    // Basic Validation & Defaults for playlist intent
    if (parsed.intent === 'playlist' && parsed.params) {
      const validVibes = ['chill', 'party', 'focus', 'workout', 'romantic', 'sad', 'any'];
      const validLanguages = ['hindi', 'english', 'punjabi', 'tamil', 'telugu', 'malayalam', 'multi', 'any'];
      
      if (!parsed.params.vibe || !validVibes.includes(parsed.params.vibe)) parsed.params.vibe = 'any';
      if (!parsed.params.language || !validLanguages.includes(parsed.params.language)) parsed.params.language = 'any';
      if (![15, 30, 50].includes(parsed.params.size)) parsed.params.size = 15; 
      if (!['latest', 'classic', 'mix'].includes(parsed.params.era)) parsed.params.era = 'mix';
    }

    return parsed;
  } catch (error) {
    console.error('[GROQ] Chat processing error:', error);
    return { intent: 'chat', message: "I'm having trouble thinking right now. Could you try again?", confidence: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────
// 1.5. EXTRACT MUSIC INTENT (New Multi-Stage Pipeline)
// ─────────────────────────────────────────────────────────────────
export async function extractMusicIntent(userPrompt) {
  try {
    const prompt = `Convert the user's music request into a structured JSON intent.
    
User Message: "${userPrompt}"

RULES:
1. "language": Detect the primary language/culture. 
   - If user mentions "Malayalam", "Kochi", "Kerala" -> Malayalam.
   - If user mentions "Tamil", "Chennai" -> Tamil.
   - If user mentions "Hindi", "Bollywood", "Indian" -> Hindi.
   - If user mentions "Brazilian", "Portuguese", "Montagem" -> Portuguese.
   - If user mentions "Spanish", "Latino", "Reggaeton" -> Spanish.
   - If query is strictly Global (e.g. "Phonk", "Lofi", "Rock") with no cultural prefix -> English.
   - NEVER default to "English" if a cultural prefix like "Brazilian" or "Japanese" is present.
2. "mood": One of [chill, party, romantic, sad, focus, workout].
3. "energy": One of [low, medium, high].
4. "context": The situational context (e.g., "night drive", "rain", "study", "gym").
5. "era": Detect era (modern, classic, mix). 
6. "sub_genre": Extracted genre name (e.g., "Phonk", "Lofi", "Melody", "Techno").
7. "seed_artist": Identify any specific artist mentioned (e.g., "AR Rahman").
8. "seed_song": Identify any specific song title mentioned.

Example Input: "chill brazilian phonk for gym"
Example Output:
{
  "language": "Portuguese",
  "mood": "workout",
  "energy": "high",
  "context": "gym",
  "era": "modern",
  "sub_genre": "Phonk",
  "seed_artist": null,
  "seed_song": null
}`;

    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a specialized music intent extractor. Respond ONLY with JSON." },
        { role: "user", content: prompt },
      ],
      model: MODEL,
      temperature: 0.1, // Lower temperature for stricter JSON and extraction
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content.trim();
    return JSON.parse(content);
  } catch (error) {
    console.error('[GROQ] Intent extraction failed:', error.message);
    return { language: 'English', mood: 'chill', energy: 'medium', context: 'general', era: 'mix' };
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. GENERATE SMART SEARCH QUERIES
// ─────────────────────────────────────────────────────────────────
export async function generateSearchQueries(vibe, language, era, moodKeywords = []) {
  try {
    const moodContext = moodKeywords.length > 0 ? `\nMood/Theme: ${moodKeywords.join(', ')}` : '';

    const prompt = `Generate 5 diverse and specific search queries to find ${language} songs with a ${vibe} vibe from the ${era} era.${moodContext}

Requirements:
1. Include popular/trending artists in this genre
2. Use music-specific terms (genre names, instruments, moods)
3. Combine artist names + mood + era for variety
4. Make queries specific enough to find real songs on JioSaavn/music platforms
5. For "latest" era, include "2023", "2024", "new"
6. For "classic" era, include "90s", "2000s", "retro", "old"
7. Each query should target different aspects (artist, mood, genre, popularity)

Examples for "chill hindi latest":
["arijit singh soulful 2024", "lo-fi bollywood chill", "indie hindi peaceful", "anuv jain acoustic", "pritam relaxing songs 2023"]

Examples for "party punjabi mix":
["ap dhillon bhangra", "diljit dosanjh party hits", "sidhu moose wala upbeat", "badshah punjabi dance", "hardy sandhu energetic"]

Respond ONLY with valid JSON (no markdown):
{
  "queries": ["query1", "query2", "query3", "query4", "query5"]
}`;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a JSON-only response bot for music search queries.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: MODEL,
      temperature: 0.7, // Higher creativity for diverse queries
      max_tokens: 250,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content.trim();
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const parsed = JSON.parse(cleanContent);

    return parsed.queries || [];
  } catch (error) {
    console.error('[GROQ] Query generation error:', error);
    // Fallback to manual query
    return [`${vibe} ${language} ${era} songs`];
  }
}

// ─────────────────────────────────────────────────────────────────
// 3. GENERATE CREATIVE PLAYLIST NAME
// ─────────────────────────────────────────────────────────────────
export async function generatePlaylistName(vibe, language, era, tracks = [], moodKeywords = []) {
  try {
    const topArtists = tracks.length > 0
      ? [...new Set(tracks.slice(0, 5).map(t => t.artist))].slice(0, 3).join(', ')
      : 'Various Artists';

    const sampleTrack = tracks.length > 0 ? tracks[0].title : '';
    const moodContext = moodKeywords.length > 0 ? `\nMood: ${moodKeywords.join(', ')}` : '';

    const prompt = `Create a creative, catchy playlist name for a music collection.

Details:
- Vibe: ${vibe}
- Language: ${language}
- Era: ${era}
- Featured Artists: ${topArtists}
- Sample Track: ${sampleTrack}${moodContext}

Requirements:
1. Maximum 4-5 words (keep it short!)
2. Be creative and evocative, NOT generic
3. Match the emotional tone
4. Include ONE relevant emoji at the end
5. Sound like a real Spotify/Apple Music playlist
6. Avoid clichés like "Ultimate", "Best Of", "Top Hits"
7. Make it memorable and shareable

Good Examples:
- "Midnight Drive Feels 🌙"
- "Monsoon Poetry 🌧️"
- "Gym Beast Mode 💪"
- "Heartbreak Hotel 💔"
- "Sunrise Serenity ☀️"
- "Punjabi Power Hour 🔥"

Bad Examples:
- "Best Hindi Songs 2024" ❌ (too generic)
- "Ultimate Chill Playlist" ❌ (cliché)
- "Top 30 Party Tracks" ❌ (boring)

Respond with ONLY the playlist name (no quotes, no JSON, just the name):`;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a creative playlist naming expert. Respond with ONLY the playlist name, nothing else.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: MODEL,
      temperature: 0.9, // High creativity
      max_tokens: 30,
    });

    let name = response.choices[0].message.content.trim();
    
    // Clean up quotes and extra formatting
    name = name.replace(/^["']|["']$/g, '');
    name = name.replace(/^Name:\s*/i, '');
    name = name.replace(/^Playlist Name:\s*/i, '');
    
    return name;
  } catch (error) {
    console.error('[GROQ] Name generation error:', error);
    // Fallback to template
    const fallbackNames = {
      chill: `Chill ${language.charAt(0).toUpperCase() + language.slice(1)} Vibes 😌`,
      party: `${language.charAt(0).toUpperCase() + language.slice(1)} Party Mix 🎉`,
      focus: `Focus Flow ${era === 'latest' ? '2024' : 'Classics'} 🎯`,
      workout: `Workout Energy 💪`,
      romantic: `Romantic Moods 💕`,
      sad: `Emotional Feels 💔`,
    };
    return fallbackNames[vibe] || `${vibe} Playlist`;
  }
}

// ─────────────────────────────────────────────────────────────────
// 4. GENERATE PLAYLIST DESCRIPTION
// ─────────────────────────────────────────────────────────────────
export async function generatePlaylistDescription(playlistName, vibe, language, tracks = []) {
  try {
    const featuredArtists = tracks.length > 0
      ? [...new Set(tracks.slice(0, 5).map(t => t.artist))].slice(0, 3).join(', ')
      : '';

    const prompt = `Write a captivating 2-sentence description for the playlist "${playlistName}".

Context:
- Vibe: ${vibe}
- Language: ${language}
- Featured Artists: ${featuredArtists}
- Total Tracks: ${tracks.length}

Requirements:
1. First sentence: What the playlist offers (mood, theme, artists)
2. Second sentence: When/why to listen to it
3. Be engaging and evocative
4. Use descriptive, emotional language
5. Keep total length under 160 characters
6. Don't mention technical details (number of songs, etc.)

Good Examples:
"A handpicked collection of soulful Hindi melodies perfect for rainy evenings. Let these tracks be your companion through moments of reflection and calm."

"High-energy Punjabi bangers guaranteed to light up any party. From bhangra beats to modern hits, this is your soundtrack for celebration."

Respond with ONLY the description (no quotes, no JSON):`;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a music curator writing playlist descriptions. Be poetic and engaging.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: MODEL,
      temperature: 0.8,
      max_tokens: 100,
    });

    let description = response.choices[0].message.content.trim();
    description = description.replace(/^["']|["']$/g, '');
    
    return description;
  } catch (error) {
    console.error('[GROQ] Description generation error:', error);
    return `A curated collection of ${vibe} ${language} tracks perfect for any mood.`;
  }
}

// ─────────────────────────────────────────────────────────────────
// 5. BATCH GENERATE (for efficiency)
// ─────────────────────────────────────────────────────────────────
export async function generatePlaylistMetadata(params, tracks) {
  const { vibe, language, era, moodKeywords = [] } = params;

  try {
    // Run name and description generation in parallel
    const [name, description] = await Promise.all([
      generatePlaylistName(vibe, language, era, tracks, moodKeywords),
      generatePlaylistDescription('temp', vibe, language, tracks),
    ]);

    return { name, description };
  } catch (error) {
    console.error('[GROQ] Batch generation error:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────
// 6. GENERATE REGIONAL JIOSAAVN QUERIES (bypasses Last.fm for non-English)
// ─────────────────────────────────────────────────────────────────
export async function generateRegionalSearchQueries(intent) {
  const prompt = `You are a JioSaavn music search expert specializing in ${intent.language} music.
Generate 6 highly specific search queries that will find REAL ${intent.language} songs for the following intent:
Mood: ${intent.mood}
Energy: ${intent.energy}
Context: ${intent.context}
Era: ${intent.era}
Sub-genre: ${intent.sub_genre || 'any'}
Seed Artist: ${intent.seed_artist || 'none'}
Seed Song: ${intent.seed_song || 'none'}

Rules:
1. If "seed_artist" is present, use it in ALL queries with variations like "${intent.seed_artist} hits", "${intent.seed_artist} melody", etc.
2. If "seed_song" is present, use it to find the artist and similar tracks (e.g., "${intent.seed_song} similar").
3. Mix of artist names, genre, and context.
4. If era is "classic", use keywords like "90s", "vintage", "old gold", "retro".
5. IF GENRE IS "Phonk" or "Brazilian": 
   - Use SPECIFIC global search anchors like "Brazilian Funk", "Phonk music", "Drift Phonk", "Montagem", "funk bhave".
   - Include 2 queries for popular global artists in this space if you know them (e.g., "Kordhell", "DVRST", "Slowboy").
6. Goal is to avoid generic pop (like "Imagine Dragons") unless requested. Force specific underground or genre-defining terms for ${intent.language === 'any' ? 'Global' : intent.language} music.
7. JioSaavn indexes these global genres better if you use specific sub-genre names.

Respond ONLY with valid JSON:
{
  "queries": ["query1", "query2", ...up to 6]
}`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a JSON-only response bot for music search queries. Respond with ONLY valid JSON." },
        { role: "user", content: prompt },
      ],
      model: MODEL,
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content.trim();
    const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
    const queries = parsed.queries || [];

    // Validate: must have at least 3 queries
    if (queries.length < 3) {
      throw new Error('Too few queries generated');
    }

    return queries;
  } catch (error) {
    console.error('[GROQ] Regional query generation error:', error.message);
    // Guaranteed fallback using our hardcoded artist pool
    const artists = MALAYALAM_SEED_ARTISTS.slice(0, 4);
    return [
      ...artists.map(a => `${a} ${intent.mood}`),
      `${intent.language} ${intent.mood} songs`,
    ];
  }
}

// ─────────────────────────────────────────────────────────────────
// 7. GENERATE CLEAN TRACK LIST (Spotify-style Recommendation Engine)
// ─────────────────────────────────────────────────────────────────
export async function generateCleanTrackList(intent, targetSize = 25) {
  const prompt = `You are a professional Spotify playlist curator.
  Generate a list of exactly ${targetSize} real, popular, and high-quality songs that perfectly match this intent:
  Language: ${intent.language}
  Vibe: ${intent.mood}
  Era: ${intent.era}
  Context: ${intent.context}
  Sub-genre: ${intent.sub_genre || 'any'}
  
  RULES:
  1. Return ONLY real songs that exist on major streaming platforms.
  2. For ${intent.language === 'malayalam' ? 'Malayalam' : intent.language}, include both legendary hits and must-hear recent tracks.
  3. Ensure variety in artists.
  4. Response MUST be valid JSON.
  
  Format:
  {
    "tracks": [
      {"title": "Song Title", "artist": "Primary Artist"},
      ...
    ]
  }`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a professional music curator. Respond ONLY with JSON." },
        { role: "user", content: prompt },
      ],
      model: MODEL,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content.trim());
    return parsed.tracks || [];
  } catch (error) {
    console.error('[GROQ] Clean track generation failed:', error.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// 8. GENERATE SPOTIFY SEARCH QUERY (for Discovery Phase)
// ─────────────────────────────────────────────────────────────────
export async function generateSpotifySearchQuery(prompt) {
  try {
    const systemPrompt = `Convert the user's music request into a single, highly effective Spotify playlist search query.
    Return ONLY the search query string. No quotes, no JSON, no explanation.
    
    Examples:
    - User: "chill lofi for raining days" -> Query: "Lofi rainy day chill"
    - User: "long drive hindi hits" -> Query: "Long drive hindi hits"
    - User: "party malayalam 2024" -> Query: "Malayalam party 2024"
    `;

    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      model: MODEL,
      temperature: 0.2,
      max_tokens: 50,
    });

    return response.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('[GROQ] Search query generation failed:', error.message);
    return prompt; // Fallback to raw prompt
  }
}

// ─────────────────────────────────────────────────────────────────
// HELPER: Test GROQ connection
// ─────────────────────────────────────────────────────────────────
export async function testGroqConnection() {
  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Say 'OK' if you're working" }],
      model: MODEL,
      max_tokens: 10,
    });
    
    return {
      success: true,
      message: response.choices[0].message.content,
      model: MODEL,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      model: MODEL,
    };
  }
}