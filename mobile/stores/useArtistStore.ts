// stores/useArtistStore.ts
import { create } from 'zustand';
import { axiosInstance } from '@/lib/axios';

interface ArtistInfo {
  name: string;
  bio?: string;
  imageUrl?: string;
  fullBio?: string;
  listeners?: number;
  externalId?: string;
  followerCount?: number;
  topSongs?: any[];
  topAlbums?: any[];
}

interface ArtistState {
  artistCache: Record<string, ArtistInfo>;
  loadingArtists: Set<string>;
  fetchArtistInfo: (artistName: string, artistId?: string, source?: string) => Promise<void>;
  isLoading: (artistName: string, artistId?: string) => boolean;
  getArtistInfo: (artistName: string, artistId?: string) => ArtistInfo | undefined;
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

  isLoading: (artistName: string, artistId?: string) => {
    return get().loadingArtists.has(artistName) || (!!artistId && get().loadingArtists.has(artistId));
  },

  getArtistInfo: (artistName: string, artistId?: string) => {
    return get().artistCache[artistName] || (artistId ? get().artistCache[artistId] : undefined);
  },

  fetchArtistInfo: async (artistName: string, artistId?: string, source = 'jiosaavn') => {
    const cacheKeyName = artistName;
    const cacheKeyId = artistId || '';

    // console.log(`[ArtistStore] fetchArtistInfo called for artistName="${artistName}", artistId="${artistId}", source="${source}"`);

    // Check if already cached or loading
    const isCached = get().artistCache[cacheKeyName] || (cacheKeyId && get().artistCache[cacheKeyId]);
    const isLoading = get().loadingArtists.has(cacheKeyName) || (cacheKeyId && get().loadingArtists.has(cacheKeyId));

    if (isCached || isLoading) {
      // console.log(`[ArtistStore] Skipping fetch. isCached=${!!isCached}, isLoading=${!!isLoading}`);
      return;
    }

    // Set loading state for both keys
    set((state) => {
      const nextLoading = new Set(state.loadingArtists).add(cacheKeyName);
      if (cacheKeyId) {
        nextLoading.add(cacheKeyId);
      }
      return { loadingArtists: nextLoading };
    });

    try {
      let artistInfo: ArtistInfo;

      if (cacheKeyId && source === 'jiosaavn') {
        // Fetch from JioSaavn artist details page endpoint (single source of truth)
        const cleanId = cacheKeyId.replace('jiosaavn_artist_', '').replace('jiosaavn_', '');
        // console.log(`[ArtistStore] Fetching directly from JioSaavn API: /stream/artists/jiosaavn/${cleanId}`);
        const res = await axiosInstance.get(`/stream/artists/jiosaavn/${cleanId}`);
        const data = res.data;

        // console.log(`[ArtistStore] Successfully fetched from JioSaavn: "${data.name}". ImageUrl="${data.imageUrl || ''}"`);

        artistInfo = {
          name: data.name || artistName,
          imageUrl: data.imageUrl,
          listeners: data.followerCount || data.listeners,
          followerCount: data.followerCount,
          bio: data.bio ? (data.bio.substring(0, 120) + (data.bio.length > 120 ? '…' : '')) : undefined,
          fullBio: data.bio,
          externalId: data.externalId,
          topSongs: data.topSongs,
          topAlbums: data.topAlbums,
        };
      } else {
        // Fallback to name search endpoint (Deezer + Last.fm)
        // console.log(`[ArtistStore] Fallback search-by-name for: "${artistName}" (No artistId)`);
        const res = await axiosInstance.get('/stream/artist/info', {
          params: { artistName },
        });
        artistInfo = res.data || { name: artistName };
        // console.log(`[ArtistStore] Fallback search finished for: "${artistName}". ImageUrl="${artistInfo.imageUrl || ''}"`);
      }

      // Update cache for both keys
      set((state) => {
        const nextLoading = new Set(state.loadingArtists);
        nextLoading.delete(cacheKeyName);
        if (cacheKeyId) {
          nextLoading.delete(cacheKeyId);
        }

        const cacheUpdates: Record<string, ArtistInfo> = {
          [cacheKeyName]: artistInfo,
        };
        if (cacheKeyId) {
          cacheUpdates[cacheKeyId] = artistInfo;
        }

        return {
          artistCache: {
            ...state.artistCache,
            ...cacheUpdates,
          },
          loadingArtists: nextLoading,
        };
      });
    } catch (error) {
      console.warn('Failed to fetch artist info:', error);

      set((state) => {
        const nextLoading = new Set(state.loadingArtists);
        nextLoading.delete(cacheKeyName);
        if (cacheKeyId) {
          nextLoading.delete(cacheKeyId);
        }

        const fallbackInfo: ArtistInfo = { name: artistName };
        const cacheUpdates: Record<string, ArtistInfo> = {
          [cacheKeyName]: fallbackInfo,
        };
        if (cacheKeyId) {
          cacheUpdates[cacheKeyId] = fallbackInfo;
        }

        return {
          loadingArtists: nextLoading,
          artistCache: {
            ...state.artistCache,
            ...cacheUpdates,
          },
        };
      });
    }
  },
}));

