import { create } from 'zustand';
import { axiosInstance } from '@/lib/axios';
import { useOnboardingStore } from './useOnboardingStore';

interface SimilarTrack {
  id: string;
  externalId: string;
  title: string;
  artist: string;
  imageUrl?: string;
  duration: number;
  source: string;
}

interface RecommendationsState {
  recommendations: Record<string, SimilarTrack[]>;
  loadingTracks: Set<string>;
  fetchRecommendations: (trackId: string, source: string) => Promise<void>;
  isLoading: (trackId: string) => boolean;
  getRecommendations: (trackId: string) => SimilarTrack[];
}

export const useRecommendationsStore = create<RecommendationsState>((set, get) => ({
  recommendations: {},
  loadingTracks: new Set(),

  isLoading: (trackId: string) => {
    return get().loadingTracks.has(trackId);
  },

  getRecommendations: (trackId: string) => {
    return get().recommendations[trackId] || [];
  },

  fetchRecommendations: async (trackId: string, source: string) => {
    if (!trackId || !source) return;

    // Remove any prefixes to match backend resolution
    const cleanTrackId = trackId.replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/, '');
    const cacheKey = `${source}_${cleanTrackId}`;

    // If already cached or loading, skip
    if (get().recommendations[cacheKey] || get().loadingTracks.has(cacheKey)) {
      return;
    }

    // Set loading state
    set((state) => ({
      loadingTracks: new Set(state.loadingTracks).add(cacheKey),
    }));

    try {
      const langs = useOnboardingStore.getState().getLanguageString() || 'hindi,english';
      
      const res = await axiosInstance.get(`/stream/recommendations/${source}/${cleanTrackId}`, {
        params: { languages: langs, limit: 12 },
      });

      const results = res.data?.results || [];

      // Update recommendations cache
      set((state) => {
        const newLoadingTracks = new Set(state.loadingTracks);
        newLoadingTracks.delete(cacheKey);

        return {
          recommendations: {
            ...state.recommendations,
            [cacheKey]: results,
          },
          loadingTracks: newLoadingTracks,
        };
      });
    } catch (error) {
      console.warn(`[RecommendationsStore] Failed to fetch recommendations for ${cleanTrackId}:`, error);

      set((state) => {
        const newLoadingTracks = new Set(state.loadingTracks);
        newLoadingTracks.delete(cacheKey);

        return {
          loadingTracks: newLoadingTracks,
          recommendations: {
            ...state.recommendations,
            [cacheKey]: [], // Cache empty array on failure to prevent continuous retries
          },
        };
      });
    }
  },
}));
