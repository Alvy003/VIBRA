// backend/services/lastfm.service.js

import fetch from 'node-fetch';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const BASE_URL = 'http://ws.audioscrobbler.com/2.0/';

export async function fetchLastFmTracksByTag(tag, limit = 50) {
  if (!LASTFM_API_KEY) {
    console.warn('[Last.fm] API key not configured');
    return [];
  }

  try {
    const url = `${BASE_URL}?method=tag.gettoptracks&tag=${encodeURIComponent(tag)}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
    
    const response = await fetch(url, { timeout: 5000 });
    
    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.tracks?.track) {
      return [];
    }

    return data.tracks.track.map((track) => ({
      title: track.name,
      artist: track.artist.name,
    }));
  } catch (error) {
    console.error('[Last.fm] Fetch error:', error.message);
    return [];
  }
}

export async function fetchLastFmTracksBySearch(query, limit = 30) {
  if (!LASTFM_API_KEY) {
    return [];
  }

  try {
    const url = `${BASE_URL}?method=track.search&track=${encodeURIComponent(query)}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
    
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (!data.results?.trackmatches?.track) {
      return [];
    }

    return data.results.trackmatches.track.map((track) => ({
      title: track.name,
      artist: track.artist,
    }));
  } catch (error) {
    console.error('[Last.fm] Search error:', error.message);
    return [];
  }
}

export async function fetchLastFmSimilarTracks(artist, title, limit = 20) {
  if (!LASTFM_API_KEY) return [];

  try {
    const url = `${BASE_URL}?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
    
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (!data.similartracks?.track) return [];

    return data.similartracks.track.map((track) => ({
      title: track.name,
      artist: track.artist.name,
    }));
  } catch (error) {
    console.error('[Last.fm] Similar tracks error:', error.message);
    return [];
  }
}

export async function fetchLastFmArtistTopTracks(artist, limit = 20) {
  if (!LASTFM_API_KEY) return [];

  try {
    const url = `${BASE_URL}?method=artist.gettoptracks&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&format=json&limit=${limit}`;
    
    const response = await fetch(url, { timeout: 5000 });
    const data = await response.json();

    if (!data.toptracks?.track) return [];

    return data.toptracks.track.map((track) => ({
      title: track.name,
      artist: track.artist.name,
    }));
  } catch (error) {
    console.error('[Last.fm] Artist top tracks error:', error.message);
    return [];
  }
}