// stores/useArtistStore.ts
import { create } from 'zustand';

// You can add your Last.fm API key here later
const LASTFM_API_KEY = process.env.EXPO_PUBLIC_LASTFM_API_KEY || '';

interface ArtistInfo {
  name: string;
  bio?: string;
  imageUrl?: string;
  fullBio?: string;
  listeners?: number;
}

interface ArtistState {
  artistCache: Record<string, ArtistInfo>;
  loadingArtists: Set<string>;
  fetchArtistInfo: (artistName: string) => Promise<void>;
  isLoading: (artistName: string) => boolean;
  getArtistInfo: (artistName: string) => ArtistInfo | undefined;
}

// Helper to extract first artist from comma/feat/& separated string
function extractPrimaryArtist(artistString: string): string {
  return artistString
    .split(/,|feat\.?|ft\.?|&|\+|\/|;|\|/i)[0]  // Split by common separators
    .replace(/\(.*?\)/g, '')  // Remove anything in parentheses
    .replace(/\[.*?\]/g, '')  // Remove anything in brackets
    .trim();
}

export const useArtistStore = create<ArtistState>((set, get) => ({
  artistCache: {},
  loadingArtists: new Set(),

  isLoading: (artistName: string) => {
    return get().loadingArtists.has(artistName);
  },

  getArtistInfo: (artistName: string) => {
    return get().artistCache[artistName];
  },

  fetchArtistInfo: async (artistName: string) => {
    // Extract primary artist for API calls
    const primaryArtist = extractPrimaryArtist(artistName);
    
    // Check if already cached or loading (use original name as key)
    if (get().artistCache[artistName] || get().loadingArtists.has(artistName)) {
      return;
    }

    // Set loading state
    set((state) => ({
      loadingArtists: new Set(state.loadingArtists).add(artistName),
    }));

    try {
      let artistInfo: ArtistInfo = { name: primaryArtist };
      let imageUrl: string | undefined;

      // Step 1: Fetch image from Deezer using PRIMARY artist
      try {
        const deezerResponse = await fetch(
          `https://api.deezer.com/search/artist?q=${encodeURIComponent(primaryArtist)}&limit=1`
        );
        const deezerData = await deezerResponse.json();

        if (deezerData.data?.[0]) {
          const deezerArtist = deezerData.data[0];
          // picture_xl is highest quality (1000x1000)
          // picture_big is 500x500
          // picture_medium is 250x250
          imageUrl = deezerArtist.picture_xl || deezerArtist.picture_big || deezerArtist.picture_medium;
          
          // Filter out default placeholder
          if (imageUrl?.includes('d.radio.net') || imageUrl?.includes('/images/artist//')) {
            imageUrl = undefined;
          }
        }
      } catch (deezerError) {
        console.warn('Deezer fetch failed:', deezerError);
      }

      // Step 2: Fetch bio & listeners from Last.fm
      if (LASTFM_API_KEY) {
        try {
          const lastfmResponse = await fetch(
            `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(primaryArtist)}&api_key=${LASTFM_API_KEY}&format=json`
          );
          const lastfmData = await lastfmResponse.json();

          if (lastfmData.artist) {
            const artist = lastfmData.artist;
            
            // Get short bio (first 2 sentences max, 120 chars)
            let shortBio: string | undefined;
            let fullBio: string | undefined;
            
            if (artist.bio?.summary) {
              fullBio = cleanBio(artist.bio.summary);
              const sentences = fullBio.match(/[^.!?]+[.!?]+/g);
              if (sentences && sentences.length > 0) {
                shortBio = sentences.slice(0, 2).join(' ').substring(0, 120).trim();
                if (fullBio.length > 120) shortBio += '…';
              } else {
                shortBio = fullBio.substring(0, 120).trim();
                if (fullBio.length > 120) shortBio += '…';
              }
            }

            artistInfo = {
              name: artist.name || artistName,
              bio: shortBio,
              fullBio: fullBio,
              imageUrl: imageUrl, // From Deezer
              listeners: artist.stats?.listeners 
                ? parseInt(artist.stats.listeners, 10) 
                : undefined,
            };
          } else {
            // No Last.fm data, just use Deezer image
            artistInfo = {
              name: artistName,
              imageUrl: imageUrl,
            };
          }
        } catch (lastfmError) {
          console.warn('Last.fm fetch failed:', lastfmError);
          artistInfo = {
            name: artistName,
            imageUrl: imageUrl,
          };
        }
      } else {
        // No Last.fm key, just use Deezer
        artistInfo = {
          name: artistName,
          imageUrl: imageUrl,
        };
      }

      // Update cache
      set((state) => {
        const newLoadingArtists = new Set(state.loadingArtists);
        newLoadingArtists.delete(artistName);
        
        return {
          artistCache: {
            ...state.artistCache,
            [artistName]: artistInfo,
          },
          loadingArtists: newLoadingArtists,
        };
      });
    } catch (error) {
      console.warn('Failed to fetch artist info:', error);
      
      set((state) => {
        const newLoadingArtists = new Set(state.loadingArtists);
        newLoadingArtists.delete(artistName);
        
        return {
          loadingArtists: newLoadingArtists,
          artistCache: {
            ...state.artistCache,
            [artistName]: { name: artistName },
          },
        };
      });
    }
  },
}));

// Helper function to clean Last.fm bio text
function cleanBio(bio: string): string {
  return bio
    .replace(/<a href=".*?">Read more on Last\.fm<\/a>\.?/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.') // Remove multiple dots
    .replace(/\s*\.\s*$/, '') // Remove trailing dot with spaces
    .trim();
}