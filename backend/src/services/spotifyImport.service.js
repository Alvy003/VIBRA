import fetch from 'node-fetch';
import spotifyUrlInfo from 'spotify-url-info';
import { jiosaavn } from '../lib/streamProviders.js';
import { cleanMusicTitle, cleanArtistName } from '../utils/cleaners.js';

const { getData, getTracks } = spotifyUrlInfo(fetch);

/**
 * Normalizes strings for comparison by removing special characters, spaces, and casing.
 */
function cleanString(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // remove special chars
        .replace(/\s+/g, ' ')
        .trim();
}

function isGoodMatch(spotifyTitle, spotifyArtist, saavnResult, source = 'spotify', expectedAlbum = null) {
    if (!saavnResult) return false;

    const sTitle = cleanString(cleanMusicTitle(spotifyTitle, source));
    const sArtist = cleanString(spotifyArtist);
    const sAlbum = expectedAlbum ? cleanString(expectedAlbum) : null;
    
    const rTitle = cleanString(saavnResult.title);
    const rArtist = cleanString(saavnResult.artist);
    const rAlbum = saavnResult.album ? cleanString(saavnResult.album) : null;

    // 1. Exact Title + Artist + Album Match (Tier 0 / Gold Standard)
    const albumMatch = sAlbum && rAlbum && (rAlbum.includes(sAlbum) || sAlbum.includes(rAlbum));
    const titleMatch = rTitle === sTitle || rTitle.includes(sTitle) || sTitle.includes(rTitle);
    
    // 2. Artist Match (Handle multiple artists and Unknown Artist)
    let artistMatch = false;
    const commonCreators = ['eternal', 'lofi', 'mashup', 'remix', '8d', 'bass boosted', 'slowed', 'reverb', 'official'];
    const isCreatorTag = commonCreators.some(tag => sArtist.includes(tag));

    if (!sArtist || sArtist === 'unknown artist' || isCreatorTag) {
        artistMatch = true; 
    } else {
        const sArtistParts = sArtist.split(/\s+/).filter(part => part.length > 2);
        artistMatch = rArtist.includes(sArtist) || sArtist.includes(rArtist) || 
                            sArtistParts.some(part => rArtist.includes(part));
    }

    // Special case for Bollywood: If album (movie) matches exactly and title matches reasonably
    if (albumMatch && titleMatch) return true;

    // Standard high-confidence matches
    if (titleMatch && artistMatch) return true;
    
    // Fallback: Title match is very strong but artist is slightly off (common on YT/Compilations)
    if (rTitle === sTitle && (artistMatch || source === 'youtube')) return true;

    return false;
}

/**
 * Extracts playlist metadata and tracks from public Spotify playlist URL using spotify-url-info
 */
export async function getSpotifyPlaylistTracks(playlistIdOrUrl) {
    let url = playlistIdOrUrl;
    if (!url.startsWith('http')) {
        url = `https://open.spotify.com/playlist/${playlistIdOrUrl}`;
    }

    console.log(`[SpotifyImport] Extracting metadata for: ${url}...`);
    
    try {
        const [data, rawTracks] = await Promise.all([
            getData(url).catch(() => ({ name: 'Imported Playlist', description: '' })),
            getTracks(url)
        ]);
        
        const title = data?.name || 'Imported Playlist';
        const description = data?.description || `Imported from Spotify: ${url}`;
        
        // Better artwork extraction: check all common image paths
        const artworkUrl = data?.images?.[0]?.url || data?.album?.images?.[0]?.url || null;
        
        console.log(`[SpotifyImport] Playlist metadata extracted: "${title}"`);
        console.log(`[SpotifyImport] Total raw tracks available: ${rawTracks.length}`);

        // Simplify all tracks
        const tracks = rawTracks
            .slice(0, 100)
            .map(track => {
                const innerTrack = track.track || track;
                const artistsList = innerTrack.artists || [];
                const artistName = artistsList.map(a => a.name).join(', ').trim();

                return {
                    displayTitle: innerTrack.name, // Original Spotify title (preserved)
                    title: cleanMusicTitle(innerTrack.name, 'spotify'),
                    artist: cleanArtistName(artistName || 'Unknown Artist'),
                    album: innerTrack.album?.name || null
                };
            });

        return { title, description, tracks, artworkUrl };
    } catch (error) {
        console.error('[SpotifyImport] Extraction error:', error.message);
        throw new Error(`Unable to import playlist: ${error.message}`);
    }
}

/**
 * Search Spotify for a playlist by name and return the top result ID
 */
export async function searchSpotifyIdByQuery(query) {
    const searchUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}/playlists`;
    
    try {
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) return null;
        const html = await response.text();
        
        // Try multiple regex patterns for Spotify
        const playlistMatch = html.match( /\/playlist\/([a-zA-Z0-9]+)/ ) || 
                              html.match( /spotify:playlist:([a-zA-Z0-9]+)/ );
        
        return playlistMatch ? playlistMatch[1] : null;
    } catch (error) {
        return null;
    }
}

/**
 * Search YouTube for a playlist and return the first playlist ID found
 */
export async function searchYoutubeIdByQuery(query) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' playlist')}&sp=EgIQAw%253D%253D`;
    
    try {
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) return null;
        const html = await response.text();
        
        // YouTube playlist ID pattern: /playlist?list=PL...
        const match = html.match(/\/playlist\?list=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    } catch (error) {
        return null;
    }
}

/**
 * Unified discovery: Tries YouTube first (most reliable for search), then Spotify
 */
export async function discoverPlaylistId(query) {
    console.log(`[Discovery] Starting unified search for: "${query}"...`);
    
    // 1. Try YouTube (Prioritized for reliability)
    const youtubeId = await searchYoutubeIdByQuery(query);
    if (youtubeId) return { id: youtubeId, source: 'youtube' };
    
    // 2. Try Spotify Fallback
    const spotifyId = await searchSpotifyIdByQuery(query);
    if (spotifyId) return { id: spotifyId, source: 'spotify' };
    
    return null;
}

/**
 * Match a single track on JioSaavn with strict verification & 3-Tiered Fallback
 */
export async function matchTrackOnJioSaavn(title, artist, source = 'spotify', album = null, displayTitle = null) {
    try {
        const cleanTitle = cleanMusicTitle(title, source);
        const artistPart = artist && artist !== 'Unknown Artist' ? cleanArtistName(artist) : '';
        
        // --- Tier 0: Artist + Title + Album (Gold Match) ---
        if (album) {
            const query0 = `${cleanTitle} ${artistPart} ${album}`.trim();
            const results = await jiosaavn.search(query0, 3);
            const verifiedMatch = results?.find(res => isGoodMatch(title, artist, res, source, album));
            if (verifiedMatch) return formatMatch(verifiedMatch, displayTitle || title);
        }

        // --- Tier 1: Artist + Title (Standard Strict) ---
        const query1 = `${cleanTitle} ${artistPart}`.trim();
        let results = await jiosaavn.search(query1, 5);
        let verifiedMatch = results?.find(res => isGoodMatch(title, artist, res, source, album));

        if (verifiedMatch) return formatMatch(verifiedMatch, displayTitle || title);

        // --- Tier 2: Title Only (Fallback) ---
        if (artistPart) {
            results = await jiosaavn.search(cleanTitle, 5);
            verifiedMatch = results?.find(res => isGoodMatch(title, artist, res, source, album));
            if (verifiedMatch) return formatMatch(verifiedMatch, displayTitle || title);
        }

    } catch (error) {
        console.error(`[SpotifyImport] Failed to match ${title} by ${artist}:`, error.message);
    }
    return null;
}

// Helper to format the final match result
function formatMatch(verifiedMatch, originalDisplayName = null) {
    return {
        externalId: verifiedMatch.externalId || verifiedMatch._id,
        title: originalDisplayName || verifiedMatch.title, // Use original Spotify title if available
        artist: verifiedMatch.artist,
        imageUrl: verifiedMatch.imageUrl,
        streamUrl: verifiedMatch.streamUrl || verifiedMatch.audioUrl,
        audioUrl: verifiedMatch.streamUrl || verifiedMatch.audioUrl,
        duration: verifiedMatch.duration,
        source: verifiedMatch.source || 'jiosaavn'
    };
}

/**
 * Match tracks on JioSaavn until target count reached
 */
export async function matchSpotifyTracksOnJioSaavn(spotifyTracks, targetCount = 50) {
    const matchedTracks = [];
    const batchSize = 5;

    console.log(`[SpotifyImport] Starting JioSaavn matching for ${spotifyTracks.length} tracks...`);

    for (let i = 0; i < spotifyTracks.length && matchedTracks.length < targetCount; i += batchSize) {
        const batch = spotifyTracks.slice(i, i + batchSize);
        const results = [];
        for (const t of batch) {
            const matched = await matchTrackOnJioSaavn(
                t.title, 
                t.artist, 
                'spotify', 
                t.album, 
                t.displayTitle
            );
            results.push(matched);
        }
        
        for (const res of results) {
            if (res && matchedTracks.length < targetCount) {
                matchedTracks.push(res);
            }
        }

        if (matchedTracks.length < targetCount && i + batchSize < spotifyTracks.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    return matchedTracks;
}
