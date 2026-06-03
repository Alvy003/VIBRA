// stores/useArtistStore.ts
import { create } from 'zustand';
import { axiosInstance } from '@/lib/axios';

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
    .split(/\s*(?:,|\bfeat\b\.?|\bft\b\.?|&|\+|\/|;|\|)\s*/i)[0]  // Split by common separators
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
    // Check if already cached or loading (use original name as key)
    if (get().artistCache[artistName] || get().loadingArtists.has(artistName)) {
      return;
    }

    // Set loading state
    set((state) => ({
      loadingArtists: new Set(state.loadingArtists).add(artistName),
    }));

    try {
      // Call backend
      const res = await axiosInstance.get('/stream/artist/info', {
        params: { artistName },
      });
      
      const artistInfo = res.data || { name: artistName };

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
