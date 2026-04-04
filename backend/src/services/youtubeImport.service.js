import ytpl from 'ytpl';
import { jiosaavn } from '../lib/streamProviders.js';
import { matchTrackOnJioSaavn } from './spotifyImport.service.js';
import { cleanMusicTitle, cleanArtistName } from '../utils/cleaners.js';

/**
 * Normalizes YouTube Music URLs to standard YouTube Playlist URLs
 */
export function normalizeYoutubeUrl(url) {
    if (url.includes('music.youtube.com/playlist?list=')) {
        return url.replace('music.youtube.com', 'youtube.com');
    }
    return url;
}

/**
 * Extracts playlist metadata and tracks from public YouTube playlist URL using ytpl
 */
export async function getYoutubePlaylistTracks(playlistUrl) {
    const url = normalizeYoutubeUrl(playlistUrl);
    console.log(`[YoutubeImport] Extracting from: ${url}...`);

    try {
        // Validation: Try to get id first or catch early
        if (!ytpl.validateID(url)) {
           throw new Error('Invalid YouTube Playlist URL or ID');
        }

        const playlist = await ytpl(url, { 
           limit: 100,
           // Adding extra options to avoid parsing crashes on some items
           pages: 1 
        });
        
        const title = playlist.title || 'YouTube Playlist';
        const description = playlist.description || `Imported from YouTube: ${url}`;
        const artworkUrl = playlist.bestThumbnail?.url || playlist.thumbnails?.[0]?.url || null;
        // Transform items to common format with metadata cleaning
        const tracks = playlist.items
            .filter(item => {
                // Extreme defensive filtering to prevent ytpl internal parsing errors from bubbling up
                if (!item || !item.title) return false;
                // Check if it's a private or deleted video (often has no author or short duration)
                if (item.title === '[Private video]' || item.title === '[Deleted video]') return false;
                return true;
            })
            .map(item => {
                try {
                    return {
                        title: cleanMusicTitle(item.title),
                        artist: cleanArtistName(item.author?.name || 'Unknown Artist'),
                        duration: item.durationSec || 0,
                        originalThumb: item.bestThumbnail?.url || (item.thumbnails && item.thumbnails.length > 0 ? item.thumbnails[0].url : null)
                    };
                } catch (e) {
                    console.error('[YoutubeImport] Error parsing single item:', e.message);
                    return null;
                }
            })
            .filter(Boolean);

        return { title, description, tracks, artworkUrl };
    } catch (error) {
        console.error('[YoutubeImport] Extraction error:', error.message);
        // Special case: Radio/Mix playlists (typically start with RD)
        if (url.includes('list=RD')) {
            throw new Error('This YouTube URL appears to be a "Mix" or "Radio" list. Please use a standard Playlist (list=PL...) for best results.');
        }
        throw new Error(`Unable to import YouTube playlist: ${error.message}`);
    }
}
