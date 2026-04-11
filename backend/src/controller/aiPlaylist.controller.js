// backend/controller/aiPlaylist.controller.js

import AIPlaylist from '../models/AIPlaylist.model.js';
import { Playlist } from '../models/playlist.model.js';
import { SavedItem } from '../models/savedItem.model.js';
import { resolveExternalSong } from '../utils/resolveExternalSong.js';
import { jiosaavn } from '../lib/streamProviders.js';
import imagekit from '../lib/imagekit.js';
import {
  processAIChat,
  generateSearchQueries,
  generatePlaylistMetadata,
  generateRegionalSearchQueries,
  extractMusicIntent,
  generateCleanTrackList,
  generateSpotifySearchQuery,
  MALAYALAM_SEED_ARTISTS,
  TAMIL_SEED_ARTISTS,
  HINDI_SEED_ARTISTS,
} from '../services/groq.service.js';
import {
  fetchLastFmTracksByTag,
  fetchLastFmTracksBySearch,
} from '../services/lastfm.service.js';
import {
  searchYouTubeMusic,
  getYouTubeMusicRelated,
} from '../services/youtube.service.js';
import {
  getSpotifyPlaylistTracks,
  matchTrackOnJioSaavn,
  discoverPlaylistId,
} from '../services/spotifyImport.service.js';
import { getYoutubePlaylistTracks } from '../services/youtubeImport.service.js';
import { cleanMusicTitle } from '../utils/cleaners.js';
import { cleanTitle } from '../utils/cleanTitle.js';
import pLimit from 'p-limit';

// Languages that are best served by direct JioSaavn search (skip Last.fm)
const REGIONAL_LANGUAGES = new Set(['hindi', 'punjabi', 'tamil', 'telugu', 'malayalam']);

// ─────────────────────────────────────────────────────────────────
// HELPER: Match tracks on JioSaavn (Improved 2-Tier Strategy)
// ─────────────────────────────────────────────────────────────────
export async function matchTracksOnJioSaavn(candidateTracks, language, targetSize, source = 'youtube') {
  const matched = [];
  const seen = new Set();
  const limit = pLimit(5); // Adjustment 5: Rate limit parallel requests

  console.log(`[Matcher] Starting matching for ${candidateTracks.length} candidates (language: ${language})`);

  const matchTask = async (track) => {
    if (matched.length >= targetSize) return;

    try {
      const cleanedTitle = cleanTitle(track.title);
      const cleanedArtist = track.artist || "";
      
      // Tier 1: Strict Artist + Title
      let searchQuery = `${cleanedTitle} ${cleanedArtist}`.trim();
      if (language !== 'english' && language !== 'multi') {
        searchQuery += ` ${language}`;
      }

      let results = await jiosaavn.search(searchQuery, 3);
      
      // If Tier 1 fails, Tier 2: Title Only
      if ((!results || results.length === 0) && cleanedTitle) {
        // console.log(`[Matcher] Tier 1 failed for "${cleanedTitle}". Trying Tier 2 (Title Only)...`);
        results = await jiosaavn.search(cleanedTitle, 3);
      }

      if (results && results.length > 0) {
        for (const result of results) {
          if (!result.title || !result.artist) continue;
          
          const key = `${result.title.toLowerCase()}_${result.artist.toLowerCase()}`;
          if (seen.has(key)) continue;

          // Adjustment 4: Improved matching logic with token-based similarity
          const rTitle = result.title.toLowerCase();
          const rArtist = result.artist.toLowerCase();
          const tTitle = cleanedTitle.toLowerCase();
          const tArtist = cleanedArtist.toLowerCase();

          // Title Match logic: Token-based overlap
          const tTokens = tTitle.split(/\s+/).filter(t => t.length > 2);
          const rTokens = rTitle.split(/\s+/).filter(t => t.length > 2);
          
          const titleMatch = rTitle.includes(tTitle) || 
                             tTitle.includes(rTitle.split('(')[0].trim()) ||
                             tTokens.every(token => rTitle.includes(token));
          
          // Artist Match logic: Handle multiple artists and overlap
          const tArtistParts = tArtist.split(/[,&]|\band\b/i).map(a => a.trim().toLowerCase()).filter(Boolean);
          const rArtistParts = rArtist.split(/[,&]|\band\b/i).map(a => a.trim().toLowerCase()).filter(Boolean);
          
          const artistMatch = !tArtist || 
                              tArtistParts.some(ta => rArtist.includes(ta)) || 
                              rArtistParts.some(ra => tArtist.includes(ra));

          if (titleMatch && (artistMatch || source === 'youtube')) {
            matched.push({
              externalId: result.externalId || result._id,
              title: result.title,
              artist: result.artist,
              imageUrl: result.imageUrl,
              streamUrl: result.streamUrl || result.audioUrl,
              duration: result.duration,
              source: result.source || 'jiosaavn',
              score: (titleMatch ? 2 : 0) + (artistMatch ? 1 : 0),
            });
            seen.add(key);
            break;
          }
        }
      }
    } catch (error) {
      console.error(`[JioSaavn] Error matching: ${track.title}`, error.message);
    }
  };

  // Run matching tasks with concurrency limit
  await Promise.all(candidateTracks.map(track => limit(() => matchTask(track))));

  console.log(`[Matcher] JioSaavn matched ${matched.length} tracks`);
  return matched.slice(0, targetSize);
}

// ─────────────────────────────────────────────────────────────────
// HELPER: Direct JioSaavn regional search (skips Last.fm entirely)
// ─────────────────────────────────────────────────────────────────
async function directJioSaavnSearch(queries, targetSize) {
  const seen = new Set();
  const tracks = [];

  for (const query of queries) {
    if (tracks.length >= targetSize) break;
    try {
      const results = await jiosaavn.search(query, 12);
      for (const result of results || []) {
        if (tracks.length >= targetSize) break;
        if (!result.title || !result.artist) continue;
        
        const key = `${result.title.toLowerCase()}_${result.artist.toLowerCase()}`;
        if (seen.has(key)) continue;

        tracks.push({
          externalId: result.externalId || result._id,
          title: result.title,
          artist: result.artist,
          imageUrl: result.imageUrl,
          streamUrl: result.streamUrl || result.audioUrl,
          duration: result.duration,
          source: result.source || 'jiosaavn',
          score: 2,
        });
        seen.add(key);
      }
      await new Promise((r) => setTimeout(r, 80));
    } catch (err) {
      console.error(`[Regional Search] Query failed: "${query}"`, err.message);
    }
  }

  return tracks;
}

// ─────────────────────────────────────────────────────────────────
// HELPER: YouTube Music Discovery logic (Improved)
// ─────────────────────────────────────────────────────────────────
export async function discoverViaYouTubeMusic(intent, targetSize = 30) {
  try {
    const queries = await generateSearchQueries(
      intent.mood,
      intent.language,
      intent.era,
      [intent.sub_genre, intent.context].filter(Boolean)
    );
    
    if (intent.seed_artist || intent.seed_song) {
        queries.unshift(`${intent.seed_song || ''} ${intent.seed_artist || ''}`.trim());
    }

    const discoveryPool = [];
    const seenTitles = new Set();

    // 1. Initial Discovery
    console.log(`[Discovery] Starting YTMusic search with ${queries.length} queries.`);
    for (const q of queries.slice(0, 4)) {
      if (discoveryPool.length >= targetSize + 10) break;
      const results = await searchYouTubeMusic(q, 15);
      
      for (const res of results) {
        // Adjustment 2: Deduplication AFTER cleaning
        const baseTitle = cleanTitle(res.title).toLowerCase();
        if (baseTitle && !seenTitles.has(baseTitle)) {
          discoveryPool.push({
            ...res,
            cleanTitle: baseTitle
          });
          seenTitles.add(baseTitle);
        }
      }
    }

    console.log(`[Discovery] YTMusic returned ${discoveryPool.length} unique tracks.`);

    // 2. Fallback to YouTube Playlist Extraction if discovery is weak (< 10)
    if (discoveryPool.length < 10) {
      console.log(`[Discovery] YTMusic results weak (${discoveryPool.length}), fallback to YT Playlist.`);
      const searchQuery = `${intent.language} ${intent.mood || ''} ${intent.context || ''} playlist`.trim();
      const playlistId = await discoverPlaylistId(searchQuery);
      
      if (playlistId && playlistId.source === 'youtube') {
        const { tracks: ytTracks } = await getYoutubePlaylistTracks(playlistId.id);
        for (const track of ytTracks) {
          const baseTitle = cleanTitle(track.title).toLowerCase();
          if (baseTitle && !seenTitles.has(baseTitle)) {
             discoveryPool.push({
               title: track.title,
               artist: track.artist,
               cleanTitle: baseTitle,
               source: 'youtube_playlist'
             });
             seenTitles.add(baseTitle);
          }
          if (discoveryPool.length >= targetSize + 10) break;
        }
      }
    }

    return discoveryPool.slice(0, targetSize + 10);
  } catch (error) {
    console.error('[YT Discovery] Failed:', error.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// NEW PIPELINE HELPERS
// ─────────────────────────────────────────────────────────────────

async function buildSongPool(queries, targetSize = 60) {
  const seen = new Set();
  const pool = [];

  console.log(`DEBUG: [PoolBuilder] Starting with ${queries.length} queries.`);

  for (const query of queries) {
    if (pool.length >= targetSize) break;
    try {
      const results = await jiosaavn.search(query, 12);
      for (const result of results || []) {
        if (pool.length >= targetSize + 20) break; // Slight over-indexing
        const key = `${result.title?.toLowerCase()}_${result.artist?.toLowerCase()}`;
        if (!key || seen.has(key)) continue;
        
        pool.push({
          externalId: result.externalId || result._id,
          title: result.title,
          artist: result.artist,
          imageUrl: result.imageUrl,
          streamUrl: result.streamUrl || result.audioUrl,
          duration: result.duration,
          language: result.language?.toLowerCase() || 'unknown',
          year: parseInt(result.year) || 0,
          source: result.source || 'jiosaavn',
        });
        seen.add(key);
      }
      // Efficiency delay
      await new Promise(r => setTimeout(r, 60));
    } catch (err) {
      console.error(`DEBUG: [PoolBuilder] Query failed: ${query}`, err.message);
    }
  }

  console.log(`DEBUG: [PoolBuilder] Gathered pool of ${pool.length} tracks.`);
  return pool;
}

function rankSongs(songPool, intent) {
  const targetLang = intent.language.toLowerCase();
  const subGenre = (intent.sub_genre || '').toLowerCase();
  
  // Dynamic seed selection
  let seedSet = new Set();
  const targetSeedArtist = (intent.seed_artist || '').toLowerCase();
  const targetSeedSong = (intent.seed_song || '').toLowerCase();

  if (targetLang === 'malayalam') seedSet = new Set(MALAYALAM_SEED_ARTISTS.map(a => a.toLowerCase()));
  if (targetLang === 'tamil') seedSet = new Set(TAMIL_SEED_ARTISTS.map(a => a.toLowerCase()));
  if (targetLang === 'hindi') seedSet = new Set(HINDI_SEED_ARTISTS.map(a => a.toLowerCase()));

  const ranked = songPool.map(song => {
    let score = 0;
    const title = song.title.toLowerCase();
    const artist = song.artist.toLowerCase();

    // 1. Language Match (+3 if exact, +1 if likely)
    if (song.language === targetLang) score += 3;
    else if (targetLang === 'any' || targetLang === 'multi') score += 1;

    // 2. Artist Match (+3 for generic seed, +6 for SPECIFIC seed_artist)
    if (targetSeedArtist && (artist.includes(targetSeedArtist) || targetSeedArtist.includes(artist))) {
       score += 6; 
    } else if (seedSet.size > 0) {
      if (seedSet.has(artist)) score += 3;
      else {
         const seeds = targetLang === 'malayalam' ? MALAYALAM_SEED_ARTISTS : 
                       (targetLang === 'tamil' ? TAMIL_SEED_ARTISTS : HINDI_SEED_ARTISTS);
         if (seeds.some(s => artist.includes(s.toLowerCase()))) score += 2;
      }
    }

    // 3. Seed Song Match (+6 for the actual song or title match)
    if (targetSeedSong && (title.includes(targetSeedSong) || targetSeedSong.includes(title))) {
       score += 6;
    }

    // 4. Era/Recency (+2 for strong matches)
    if (intent.era === 'modern' || intent.era === 'latest') {
      if (song.year >= 2022) score += 2.5;
      else if (song.year >= 2018) score += 1.5;
    } else if (intent.era === 'classic') {
      if (song.year >= 1990 && song.year < 2005) score += 2.5;
      else if (song.year > 0 && song.year < 2010) score += 1.5;
    }

    // 5. Sub-genre / Mood / Context Match (+2 per keyword)
    const keywords = [intent.mood, intent.context, subGenre].filter(Boolean);
    for (const kw of keywords) {
      if (title.includes(kw.toLowerCase()) || artist.includes(kw.toLowerCase())) score += 2.5;
    }

    // 6. Special boost for "Phonk" if requested
    if (subGenre.includes('phonk') && (title.includes('phonk') || title.includes('drift'))) {
       score += 4;
    }

    return { ...song, score };
  });

  return ranked.sort((a, b) => b.score - a.score).slice(0, 25);
}

export const analyzeNaturalRequest = async (req, res) => {
  try {
    const { query, history = [], isPlaylistMode = false, directMode = false } = req.body;
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ message: 'Message too short' });
    }
    const result = await processAIChat(query, history, isPlaylistMode, directMode);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[AI] Analysis error:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
};

export const generateAIPlaylist = async (req, res) => {
  try {
    let { vibe, language, era, size, moodKeywords = [], useAI = true, existingTracks = [] } = req.body;
    const userId = req.user?._id;

    if (!vibe || !language || !era || !size) {
      return res.status(400).json({ message: 'Missing parameters' });
    }

    // STAGE 1: Extract Music Intent
    const promptContext = `${vibe} ${language} ${era} ${moodKeywords.join(' ')}`;
    const intent = await extractMusicIntent(promptContext);
    
    const isExpansion = (req.body.is_expansion === true);
    let finalTracks = [];

    console.log(`DEBUG: [Pipeline] Starting Unified YT-to-JioSaavn Pipeline.`);
    console.log(`DEBUG: [Pipeline] Intent:`, JSON.stringify(intent));

    // ─────────────────────────────────────────────────────────────────
    // Discovery Phase: Multi-Stage Strategy
    // ─────────────────────────────────────────────────────────────────
    const artistCounts = {};
    const existingKeySet = new Set();

    // 0. PHASE 0: Discovery Search (V3 Core)
    console.log(`[AI Playlist] Phase 0: Searching Discovery for "${vibe}"...`);
    const spotifySearchQuery = await generateSpotifySearchQuery(promptContext);
    const discoveryResult = await discoverPlaylistId(spotifySearchQuery);
    
    if (discoveryResult) {
      try {
        console.log(`[AI Playlist] Discovered ${discoveryResult.source} playlist: ${discoveryResult.id}`);
        
        const extractionFn = discoveryResult.source === 'spotify' 
            ? getSpotifyPlaylistTracks 
            : getYoutubePlaylistTracks;
            
        const { tracks: discoveredTracks } = await extractionFn(discoveryResult.id);
        console.log(`[AI Playlist] Extracted ${discoveredTracks.length} tracks from ${discoveryResult.source}.`);
        
        for (const track of discoveredTracks.slice(0, 30)) {
          if (finalTracks.length >= size + 5) break;
          const matched = await matchTrackOnJioSaavn(track.title, track.artist, discoveryResult.source);
          if (matched) {
            const key = `${matched.title.toLowerCase()}_${matched.artist.toLowerCase()}`;
            if (!existingKeySet.has(key)) {
              finalTracks.push(matched);
              existingKeySet.add(key);
              const art = matched.artist.toLowerCase();
              artistCounts[art] = (artistCounts[art] || 0) + 1;
            }
          }
        }
      } catch (err) {
        console.error(`[AI Playlist] Discovery extraction failed (${discoveryResult.source}):`, err.message);
      }
    }

    // 1. PHASE 1: Clean Recommendation Discovery (LLM Enrichment)
    if (finalTracks.length < size / 2) {
      console.log(`[AI Playlist] Phase 1: LLM Enrichment (current matches: ${finalTracks.length})...`);
      const cleanRecommendations = await generateCleanTrackList(intent, size);
      
      for (const rec of cleanRecommendations) {
        if (finalTracks.length >= size + 5) break;
        const matched = await matchTrackOnJioSaavn(rec.title, rec.artist);
        if (matched) {
          const key = `${matched.title.toLowerCase()}_${matched.artist.toLowerCase()}`;
          if (!existingKeySet.has(key)) {
            finalTracks.push(matched);
            existingKeySet.add(key);
            const art = matched.artist.toLowerCase();
            artistCounts[art] = (artistCounts[art] || 0) + 1;
          }
        }
      }
    }

    // 2. PHASE 2: YouTube Music Discovery (Primary/Fallback High-Accuracy)
    if (finalTracks.length < size) {
      console.log(`[AI Playlist] Phase 2: YouTube Music Discovery (current matches: ${finalTracks.length})...`);
      const ytPool = await discoverViaYouTubeMusic(intent, size);
      
      if (ytPool.length > 0) {
        // Match using the improved 2-tier strategy with rate limiting
        const matchedFromYT = await matchTracksOnJioSaavn(ytPool, intent.language, size - finalTracks.length + 10, 'youtube');

        for (const track of matchedFromYT) {
          if (finalTracks.length >= size + 10) break;
          const key = `${track.title.toLowerCase()}_${track.artist.toLowerCase()}`;
          if (existingKeySet.has(key)) continue;

          const artist = track.artist.toLowerCase();
          // Heuristic: Max 4 songs per artist to ensure variety
          if ((artistCounts[artist] || 0) < 4) {
            finalTracks.push(track);
            existingKeySet.add(key);
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
          }
        }
      }
      console.log(`[Discovery] YTMusic phase finished. Total matches now: ${finalTracks.length}`);
    }

    // 3. PHASE 3: Regional Search (Final attempt if still weak)
    if (finalTracks.length < 5 && REGIONAL_LANGUAGES.has(language.toLowerCase())) {
        console.log(`[AI Playlist] Phase 3: Regional Fallback...`);
        const regionalQueries = await generateRegionalSearchQueries(intent);
        const regionalTracks = await directJioSaavnSearch(regionalQueries, 15);
        for (const t of regionalTracks) {
            if (finalTracks.length >= size + 10) break;
            const key = `${t.title.toLowerCase()}_${t.artist.toLowerCase()}`;
            if (!existingKeySet.has(key)) {
                finalTracks.push(t);
                existingKeySet.add(key);
            }
        }
    }

    // 4. FINAL DEDUPLICATION & CAPPING
    const uniqueByExternalId = [];
    const idSet = new Set();
    for (const t of finalTracks) {
        if (!idSet.has(t.externalId)) {
            uniqueByExternalId.push(t);
            idSet.add(t.externalId);
        }
    }
    finalTracks = uniqueByExternalId.slice(0, size + 10);

    // Expansion logic
    if (isExpansion && existingTracks.length > 0) {
      const existingKeySet = new Set(existingTracks.map(t => t.externalId || `${t.title}_${t.artist}`.toLowerCase()));
      const newUnique = finalTracks.filter(t => !existingKeySet.has(t.externalId || `${t.title}_${t.artist}`.toLowerCase()));
      finalTracks = [...existingTracks, ...newUnique].slice(0, size + 15);
    }

    if (finalTracks.length === 0) return res.status(404).json({ message: 'No tracks found' });

    let playlistName, description;
    if (useAI) {
      try {
        const metadata = await generatePlaylistMetadata({ vibe, language, era, moodKeywords }, finalTracks);
        playlistName = metadata.name;
        description = metadata.description;
      } catch (e) { useAI = false; }
    }

    if (!playlistName) {
      playlistName = `${vibe.toUpperCase()} Mix · ${language.toUpperCase()}`;
      description = `A curated AI collection.`;
    }

    const coverArt = finalTracks[0]?.imageUrl || null;

    const playlist = await AIPlaylist.create({
      name: playlistName,
      description,
      userId,
      vibe,
      language,
      era,
      size,
      tracks: finalTracks.map(t => ({
        ...t,
        title: t.title || 'Unknown Track',
        artist: t.artist || 'Various Artists'
      })),
      coverArt,
      metadata: { aiGenerated: useAI, generatedAt: new Date() },
    });

    res.json({ success: true, playlist });
  } catch (error) {
    console.error('[AI Playlist] Generation error:', error);
    res.status(500).json({ message: 'Failed to generate playlist' });
  }
};

export const getAIPlaylist = async (req, res) => {
  try {
    const playlist = await AIPlaylist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching' });
  }
};

export const incrementPlayCount = async (req, res) => {
  try {
    await AIPlaylist.findByIdAndUpdate(req.params.id, { $inc: { 'stats.plays': 1 } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: 'Error' }); }
};

export const toggleSavePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { save } = req.body;
    const userId = req.auth?.userId || req.user?._id;

    const playlist = await AIPlaylist.findById(id);
    if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

    const update = save ? { $inc: { 'stats.saves': 1 } } : { $inc: { 'stats.saves': -1 } };
    await AIPlaylist.findByIdAndUpdate(id, update);

    if (save) {
      await SavedItem.findOneAndUpdate(
        { userId, externalId: id },
        {
          userId,
          type: 'playlist',
          source: 'ai',
          externalId: playlist._id.toString(),
          title: playlist.name,
          artist: 'Vibra AI',
          description: playlist.description || '',
          imageUrl: playlist.coverArt || '',
          songCount: playlist.tracks?.length || 0,
        },
        { upsert: true, new: true }
      );
    } else {
      await SavedItem.findOneAndDelete({ userId, externalId: id });
    }

    res.json({ success: true, isSaved: save });
  } catch (error) {
    console.error('[AI Playlist] Toggle save error:', error);
    res.status(500).json({ message: 'Failed to save playlist' });
  }
};

export const importSpotifyPlaylist = async (req, res) => {
  try {
    const { url } = req.body;
    const userId = req.auth.userId;

    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!match) {
      return res.status(400).json({ message: 'Invalid Spotify playlist URL' });
    }

    const spotifyId = match[1];

    // 1. Deduplication Check
    const existing = await Playlist.findOne({ 
      userId, 
      'metadata.spotifyId': spotifyId 
    }).populate('songs');

    if (existing) {
        const playlistObj = {
            ...existing.toObject(),
            tracks: existing.songs || [],
            coverArt: existing.imageUrl,
            metadata: { ...existing.metadata, aiGenerated: true, source: 'spotify_import' }
        };
        return res.json({ 
            success: true, 
            message: 'Playlist already imported!', 
            playlist: playlistObj,
            status: 'ready'
        });
    }

    const { title, description, tracks: spotifyTracks, artworkUrl } = await getSpotifyPlaylistTracks(spotifyId);

    // 2. Name check
    let finalTitle = title;
    const nameCollision = await Playlist.findOne({ 
      name: { $regex: new RegExp(`^${title.trim()}$`, 'i') }, 
      userId 
    });
    if (nameCollision) {
      finalTitle = `${title} (Spotify)`;
    }

    // 3. ImageKit Upload - With Mosaic Fallback for Spotify
    let finalImageUrl = null;
    if (artworkUrl) {
      try {
        const uploadRes = await imagekit.upload({
          file: artworkUrl,
          fileName: `playlist_${spotifyId}_${Date.now()}.jpg`,
          folder: '/music/images'
        });
        finalImageUrl = uploadRes.url;
      } catch (err) {
        console.error('[SpotifyImport] ImageKit upload failed, falling back to mosaic:', err.message);
        finalImageUrl = null; // Mosaic fallback
      }
    }

    const playlist = await Playlist.create({
      name: finalTitle,
      description: description || 'Importing from Spotify...',
      userId,
      imageUrl: finalImageUrl, // Will be null if no artwork or error, triggering mosaic
      songs: [],
      isPublic: false,
      metadata: {
        spotifyId,
        source: 'spotify_import',
        importStatus: 'pending'
      }
    });

    const responsePlaylist = {
        ...playlist.toObject(),
        songs: [],
        tracks: [],
        coverArt: playlist.imageUrl,
        metadata: { aiGenerated: true, source: 'spotify_import', importStatus: 'pending' }
    };

    res.json({ 
      success: true, 
      message: 'Playlist import started!',
      playlist: responsePlaylist,
      status: 'importing'
    });

    (async () => {
      console.log(`[SpotifyImport] Background matching started for: ${finalTitle} (${playlist._id})`);
      const matchedSongsIds = [];
      const batchSize = 5;
      const targetMax = 100;

      for (let i = 0; i < spotifyTracks.length && matchedSongsIds.length < targetMax; i += batchSize) {
        const batch = spotifyTracks.slice(i, i + batchSize);
        const newIds = [];
        for (const t of batch) {
          const matchedItem = await matchTrackOnJioSaavn(t.title, t.artist);
          if (matchedItem) {
              const matchedData = {
                  title: matchedItem.title,
                  artist: matchedItem.artist,
                  imageUrl: matchedItem.imageUrl,
                  streamUrl: matchedItem.streamUrl || matchedItem.audioUrl,
                  audioUrl: matchedItem.streamUrl || matchedItem.audioUrl,
                  duration: matchedItem.duration,
                  source: matchedItem.source || 'jiosaavn'
              };
              try {
                const resolvedId = await resolveExternalSong(matchedItem.externalId, matchedData);
                newIds.push(resolvedId);
              } catch (resolveErr) { console.error('[SpotifyImport] Resolve error:', resolveErr); }
          }
        }
        if (newIds.length > 0) {
          matchedSongsIds.push(...newIds);
          await Playlist.findByIdAndUpdate(playlist._id, { $push: { songs: { $each: newIds } } });
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      await Playlist.findByIdAndUpdate(playlist._id, { $set: { 'metadata.importStatus': 'completed' } });
      console.log(`[SpotifyImport] Background matching complete for ${playlist._id}.`);
    })().catch(err => console.error(`[SpotifyImport] Background error:`, err));

  } catch (error) {
    console.error('[SpotifyImport] Controller error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to initiate Spotify import' });
  }
};

export const importYouTubePlaylist = async (req, res) => {
  try {
    const { url } = req.body;
    const userId = req.auth.userId;

    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    const { title, description, tracks: ytTracks, artworkUrl } = await getYoutubePlaylistTracks(url);

    const existing = await Playlist.findOne({ 
      userId, 
      name: title,
      'metadata.source': 'youtube_import'
    }).populate('songs');

    if (existing) {
        const playlistObj = {
            ...existing.toObject(),
            tracks: existing.songs || [],
            coverArt: existing.imageUrl,
            metadata: { ...existing.metadata, aiGenerated: true, source: 'youtube_import' }
        };
        return res.json({ 
            success: true, 
            message: 'Playlist already imported!', 
            playlist: playlistObj,
            status: 'ready'
        });
    }

    let finalImageUrl = null;
    if (artworkUrl) {
      try {
        const uploadRes = await imagekit.upload({
          file: artworkUrl,
          fileName: `yt_playlist_${Date.now()}.jpg`,
          folder: '/music/images'
        });
        finalImageUrl = uploadRes.url;
      } catch (err) {
        console.error('[YoutubeImport] ImageKit upload failed:', err.message);
        finalImageUrl = artworkUrl;
      }
    }

    const playlist = await Playlist.create({
      name: title,
      description: description || 'Importing from YouTube...',
      userId,
      imageUrl: finalImageUrl,
      songs: [],
      isPublic: false,
      metadata: { source: 'youtube_import', importStatus: 'pending' }
    });

    const responsePlaylist = {
        ...playlist.toObject(),
        songs: [],
        tracks: [],
        coverArt: playlist.imageUrl,
        metadata: { aiGenerated: true, source: 'youtube_import' }
    };

    res.json({ 
      success: true, 
      message: 'YouTube playlist import started!',
      playlist: responsePlaylist,
      status: 'importing'
    });

    (async () => {
      console.log(`[YoutubeImport] Background matching started for: ${title} (${playlist._id})`);
      const matchedSongsIds = [];
      const batchSize = 5;
      const targetMax = 100; 

      for (let i = 0; i < ytTracks.length && matchedSongsIds.length < targetMax; i += batchSize) {
        const batch = ytTracks.slice(i, i + batchSize);
        const newIds = [];
        for (const t of batch) {
          const matchedItem = await matchTrackOnJioSaavn(t.title, t.artist);
          if (matchedItem) {
              const matchedData = {
                  title: matchedItem.title,
                  artist: matchedItem.artist,
                  imageUrl: matchedItem.imageUrl,
                  streamUrl: matchedItem.streamUrl || matchedItem.audioUrl,
                  audioUrl: matchedItem.streamUrl || matchedItem.audioUrl,
                  duration: matchedItem.duration,
                  source: matchedItem.source || 'jiosaavn'
              };
              try {
                const resolvedId = await resolveExternalSong(matchedItem.externalId, matchedData);
                newIds.push(resolvedId);
              } catch (resolveErr) { console.error('[YoutubeImport] Resolve error:', resolveErr); }
          }
        }
        if (newIds.length > 0) {
          matchedSongsIds.push(...newIds);
          await Playlist.findByIdAndUpdate(playlist._id, { $push: { songs: { $each: newIds } } });
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      await Playlist.findByIdAndUpdate(playlist._id, { $set: { 'metadata.importStatus': 'completed' } });
      console.log(`[YoutubeImport] Background matching complete for ${playlist._id}.`);
    })().catch(err => console.error(`[YoutubeImport] Background error:`, err));

  } catch (error) {
    console.error('[YoutubeImport] Controller error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to initiate YouTube import' });
  }
};