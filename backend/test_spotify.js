import dotenv from 'dotenv';
dotenv.config();
import { searchSpotifyPlaylists, getPlaylistTracks } from './src/services/spotify.service.js';

async function testSpotify() {
    console.log('--- Testing Spotify Service ---');
    try {
        const playlists = await searchSpotifyPlaylists('Trending English Mix', 3);
        console.log(`✅ Search successful. Found ${playlists.length} playlists.`);
        if (playlists.length > 0) {
            console.log('Sample Playlist:', playlists[0].name, `(ID: ${playlists[0].id})`);
            const tracks = await getPlaylistTracks(playlists[0].id, 5);
            console.log(`✅ Track extraction successful. Found ${tracks.length} tracks.`);
            if (tracks.length > 0) {
                console.log('Sample Tracks:', JSON.stringify(tracks, null, 2));
            }
        }
    } catch (e) {
        console.log('❌ Spotify Test Failed:', e.message);
    }
}

testSpotify();
