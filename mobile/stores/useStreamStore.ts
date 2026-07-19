import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mmkvStorage } from "@/lib/mmkvStorage";
import { axiosInstance } from "@/lib/axios";
import { useOnboardingStore } from "./useOnboardingStore";
import { useMusicStore } from "./useMusicStore";

// Mobile does not have CORS restrictions, so we can stream directly from CDNs!
function proxyAudioUrl(originalUrl: string): string {
    return originalUrl;
}

interface StreamStore {
    searchResults: any[];
    searchAllResults: {
        songs: any[];
        albums: any[];
        artists: any[];
        playlists: any[];
    } | null;
    isSearching: boolean;
    searchQuery: string;

    // Discovery
    homepageData: any | null;
    homepageFetchedAt: number | null;
    dailyMix: any | null;
    dailyMixFetchedAt: number | null;
    dailyMixDate: string | null;
    weeklyMix: any | null;
    weeklyMixFetchedAt: number | null;
    weeklyMixWeek: string | null;
    isLoadingHomepage: boolean;
    isLoadingDailyMix: boolean;
    isLoadingWeeklyMix: boolean;

    becauseYouPlayedData: any | null;
    becauseYouPlayedFetchedAt: number | null;
    rediscoverFavoritesData: any[] | null;
    rediscoverFavoritesFetchedAt: number | null;
    followedArtistsData: any | null;
    followedArtistsFetchedAt: number | null;
    isLoadingBecauseYouPlayed: boolean;
    isLoadingRediscoverFavorites: boolean;
    isLoadingFollowedArtists: boolean;

    continueListeningData: any[] | null;
    continueListeningFetchedAt: number | null;
    isLoadingContinueListening: boolean;

    frequentCollectionsData: any[] | null;
    frequentCollectionsFetchedAt: number | null;
    isLoadingFrequentCollections: boolean;

    // Details
    currentExternalAlbum: any | null;
    currentExternalPlaylist: any | null;
    currentExternalArtist: any | null;
    isLoadingDetail: boolean;

    refreshVersion: number;
    triggerRefresh: () => void;

    searchAll: (query: string) => Promise<void>;
    clearSearch: () => void;
    fetchHomepage: (forceRefresh?: boolean) => Promise<void>;
    invalidateHomepageCache: () => void;
    fetchDailyMix: (forceRefresh?: boolean) => Promise<void>;
    fetchWeeklyMix: (forceRefresh?: boolean) => Promise<void>;
    fetchBecauseYouPlayed: (forceRefresh?: boolean) => Promise<void>;
    fetchRediscoverFavorites: (forceRefresh?: boolean) => Promise<void>;
    fetchFollowedArtistsRecommendations: (forceRefresh?: boolean) => Promise<void>;
    fetchContinueListening: (forceRefresh?: boolean) => Promise<void>;
    fetchFrequentCollections: (forceRefresh?: boolean) => Promise<void>;
    fetchExternalAlbum: (source: string, id: string) => Promise<void>;
    fetchExternalPlaylist: (source: string, id: string) => Promise<void>;
    fetchExternalArtist: (source: string, id: string) => Promise<void>;
    clearDetail: () => void;
    getPlayableUrl: (song: any) => Promise<string | null>;
    reset: () => void;
}



export const useStreamStore = create<StreamStore>()(
    persist(
        (set, get) => ({
    searchResults: [],
    searchAllResults: null,
    isSearching: false,
    searchQuery: "",

    homepageData: null,
    homepageFetchedAt: null,
    dailyMix: null,
    dailyMixFetchedAt: null,
    dailyMixDate: null,
    weeklyMix: null,
    weeklyMixFetchedAt: null,
    weeklyMixWeek: null,
    isLoadingHomepage: false,
    isLoadingDailyMix: false,
    isLoadingWeeklyMix: false,

    becauseYouPlayedData: null,
    becauseYouPlayedFetchedAt: null,
    rediscoverFavoritesData: null,
    rediscoverFavoritesFetchedAt: null,
    followedArtistsData: null,
    followedArtistsFetchedAt: null,
    isLoadingBecauseYouPlayed: false,
    isLoadingRediscoverFavorites: false,
    isLoadingFollowedArtists: false,

    continueListeningData: null,
    continueListeningFetchedAt: null,
    isLoadingContinueListening: false,

    frequentCollectionsData: null,
    frequentCollectionsFetchedAt: null,
    isLoadingFrequentCollections: false,

    currentExternalAlbum: null,
    currentExternalPlaylist: null,
    currentExternalArtist: null,
    isLoadingDetail: false,

    refreshVersion: 0,
    triggerRefresh: () => set((state) => ({ refreshVersion: state.refreshVersion + 1 })),


    searchAll: async (query) => {
        if (!query.trim()) {
            set({ searchAllResults: null, searchResults: [], searchQuery: "" });
            return;
        }

        set({ isSearching: true, searchQuery: query });

        try {
            const res = await axiosInstance.get("/stream/search/all", {
                params: { q: query, limit: 10 },
            });

            if (get().searchQuery !== query) return;

            set({
                searchAllResults: res.data,
                searchResults: res.data.songs || [],
            });
        } catch (error) {
            console.error("[StreamStore] Search all failed:", error);
            set({ searchAllResults: null, searchResults: [] });
        } finally {
            if (get().searchQuery === query) {
                set({ isSearching: false });
            }
        }
    },

    clearSearch: () => {
        set({
            searchQuery: "",
            searchResults: [],
            searchAllResults: null,
        });
    },

    fetchHomepage: async (forceRefresh = false) => {
        const now = Date.now();
        const fetchedAt = get().homepageFetchedAt || 0;
        const hasCache = !!get().homepageData;
        const isExpired = !fetchedAt || (now - fetchedAt > 86400000); // 24 hours TTL
        
        if (get().isLoadingHomepage) return;

        const ageSec = hasCache ? Math.round((now - fetchedAt) / 1000) : 0;
        console.log(`[StreamStore] fetchHomepage called. forceRefresh: ${forceRefresh}, hasCache: ${hasCache}, cacheAge: ${ageSec}s, isExpired: ${isExpired}`);

        if (hasCache) {
            console.log(`[StreamStore] Homepage loaded from MMKV (Age: ${ageSec}s)`);
            if (isExpired) {
                console.log(`[StreamStore] Cache expired (Age: ${ageSec}s > 86400s)`);
            } else {
                console.log(`[StreamStore] Cache valid (Age: ${ageSec}s <= 86400s)`);
            }
            if (!forceRefresh && !isExpired) {
                return;
            }
        }

        const shouldShowSkeleton = !hasCache;

        if (shouldShowSkeleton) {
            set({ isLoadingHomepage: true });
        } else {
            console.log(`[StreamStore] Silent refresh started`);
        }

        try {
            const languages = useOnboardingStore.getState().getLanguageString();
            const res = await axiosInstance.get("/stream/home", {
                params: { 
                    languages,
                    ...(forceRefresh ? { refresh: "true" } : {})
                },
            });
            
            const prevDataStr = JSON.stringify(get().homepageData);
            const newDataStr = JSON.stringify(res.data);
            
            if (prevDataStr !== newDataStr) {
                console.log("[StreamStore] Homepage updated");
                set({ 
                    homepageData: res.data,
                    homepageFetchedAt: Date.now()
                });
            } else {
                console.log("[StreamStore] Homepage unchanged");
                set({
                    homepageFetchedAt: Date.now()
                });
            }
            console.log("[StreamStore] Cache persisted");
        } catch (error) {
            console.error("[StreamStore] Failed to fetch homepage:", error);
        } finally {
            if (shouldShowSkeleton) {
                set({ isLoadingHomepage: false });
            }
        }
    },

    invalidateHomepageCache: () => {
        console.log("[StreamStore] Invalidate homepage cache");
        set({ homepageData: null, homepageFetchedAt: null });
    },

    fetchDailyMix: async (forceRefresh = false) => {
        if (!useMusicStore.getState().isAuthReady && !forceRefresh) return;
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const storedMixDate = get().dailyMixDate || "";
        const hasCache = !!get().dailyMix && get().dailyMix.length > 0;
        const isExpired = !storedMixDate || (storedMixDate !== todayStr);
        
        if (get().isLoadingDailyMix) return;

        if (hasCache) {
            if (!forceRefresh && !isExpired) {
                if (__DEV__) console.log("[StreamStore] daily-mix cache valid (calendar date matches), skipping fetch");
                return;
            }
            if (__DEV__) console.log("[StreamStore] daily-mix cache stale/forced, running silent refresh");
        } else {
            if (__DEV__) console.log("[StreamStore] daily-mix no cache, running initial fetch");
            set({ isLoadingDailyMix: true });
        }

        try {
            const languages = useOnboardingStore.getState().getLanguageString();
            const res = await axiosInstance.get("/stream/daily-mix", {
                params: { languages, limit: 15 },
            });
            const data = res.data;
            const results = Array.isArray(data) ? data : (data?.results || []);
            
            const prevDataStr = JSON.stringify(get().dailyMix);
            const newDataStr = JSON.stringify(results);
            if (prevDataStr !== newDataStr) {
                if (__DEV__) console.log("[StreamStore] daily-mix updated");
                set({ dailyMix: results, dailyMixFetchedAt: Date.now(), dailyMixDate: todayStr });
            } else {
                if (__DEV__) console.log("[StreamStore] daily-mix unchanged");
                set({ dailyMixFetchedAt: Date.now(), dailyMixDate: todayStr });
            }
        } catch (error) {
            console.error("[StreamStore] Failed to fetch daily mix:", error);
        } finally {
            set({ isLoadingDailyMix: false });
        }
    },

    fetchWeeklyMix: async (forceRefresh = false) => {
        if (!useMusicStore.getState().isAuthReady && !forceRefresh) return;
        const d = new Date();
        const weekNum = Math.ceil((d.getDate() + 6 - d.getDay()) / 7);
        const currentWeek = `${d.getFullYear()}-W${weekNum}`;
        const storedWeek = get().weeklyMixWeek || "";
        const hasCache = !!get().weeklyMix;
        const isExpired = !storedWeek || (storedWeek !== currentWeek);
        
        if (get().isLoadingWeeklyMix) return;

        if (hasCache) {
            if (!forceRefresh && !isExpired) {
                if (__DEV__) console.log("[StreamStore] weekly-mix cache valid (calendar week matches), skipping fetch");
                return;
            }
            if (__DEV__) console.log("[StreamStore] weekly-mix cache stale/forced, running silent refresh");
        } else {
            if (__DEV__) console.log("[StreamStore] weekly-mix no cache, running initial fetch");
            set({ isLoadingWeeklyMix: true });
        }

        try {
            const languages = useOnboardingStore.getState().getLanguageString();
            const res = await axiosInstance.get("/stream/weekly-mix", {
                params: { languages },
            });
            let data = res.data;
            if (Array.isArray(data)) {
                data = {
                    eligible: true,
                    results: data,
                    progress: { count: 20, minutes: 60 }
                };
            }
            const prevDataStr = JSON.stringify(get().weeklyMix);
            const newDataStr = JSON.stringify(data);
            if (prevDataStr !== newDataStr) {
                if (__DEV__) console.log("[StreamStore] weekly-mix updated");
                set({ weeklyMix: data, weeklyMixFetchedAt: Date.now(), weeklyMixWeek: currentWeek });
            } else {
                if (__DEV__) console.log("[StreamStore] weekly-mix unchanged");
                set({ weeklyMixFetchedAt: Date.now(), weeklyMixWeek: currentWeek });
            }
        } catch (error) {
            console.error("[StreamStore] Failed to fetch weekly mix:", error);
        } finally {
            set({ isLoadingWeeklyMix: false });
        }
    },

    fetchBecauseYouPlayed: async (forceRefresh = false) => {
        if (!useMusicStore.getState().isAuthReady && !forceRefresh) return;
        const now = Date.now();
        const fetchedAt = get().becauseYouPlayedFetchedAt || 0;
        const cache = get().becauseYouPlayedData;
        const hasCache = !!cache;
        const isExpired = !fetchedAt || (now - fetchedAt > 86400000); // 24 hours TTL
        const cacheAgeSec = Math.round((now - fetchedAt) / 1000);
        
        if (get().isLoadingBecauseYouPlayed) return;

        if (hasCache) {
            // Debounce rapid tab switches (10 minutes)
            if (!forceRefresh && !isExpired && cacheAgeSec < 600) {
                if (__DEV__) console.log(`[StreamStore] because-you-played cache valid (Age: ${cacheAgeSec}s < 600s), skipping fetch`);
                return;
            }
            if (__DEV__) console.log(`[StreamStore] because-you-played cache stale (Age: ${cacheAgeSec}s), running silent refresh`);
        } else {
            if (__DEV__) console.log("[StreamStore] because-you-played no cache, running initial fetch");
            set({ isLoadingBecauseYouPlayed: true });
        }

        try {
            const res = await axiosInstance.get('/stream/recommendations/because-you-played');
            if (res.data && Array.isArray(res.data.tracks)) {
                const createFingerprint = (data: any) => `${(data.tracks || []).map((t: any) => t.id || t._id || t.externalId).join('|')}_${data.updatedAt || '0'}`;
                
                const prevFingerprint = cache ? createFingerprint(cache) : "";
                const newFingerprint = createFingerprint(res.data);
                
                if (prevFingerprint !== newFingerprint) {
                    if (__DEV__) console.log("[StreamStore] because-you-played updated");
                    set({ becauseYouPlayedData: res.data, becauseYouPlayedFetchedAt: Date.now() });
                } else {
                    if (__DEV__) console.log("[StreamStore] because-you-played unchanged");
                    set({ becauseYouPlayedFetchedAt: Date.now() });
                }
            }
        } catch (error) {
            console.error('[StreamStore] Failed to fetch because-you-played recommendations:', error);
        } finally {
            set({ isLoadingBecauseYouPlayed: false });
        }
    },

    fetchRediscoverFavorites: async (forceRefresh = false) => {
        const now = Date.now();
        const fetchedAt = get().rediscoverFavoritesFetchedAt || 0;
        const cache = get().rediscoverFavoritesData;
        const hasCache = !!cache && cache.length > 0;
        const isExpired = !fetchedAt || (now - fetchedAt > 86400000); // 24 hours TTL
        const cacheAgeSec = Math.round((now - fetchedAt) / 1000);
        
        if (get().isLoadingRediscoverFavorites) return;

        if (hasCache) {
            // Debounce rapid tab switches (10 minutes)
            if (!forceRefresh && !isExpired && cacheAgeSec < 600) {
                if (__DEV__) console.log(`[StreamStore] rediscover-favorites cache valid (Age: ${cacheAgeSec}s < 600s), skipping fetch`);
                return;
            }
            if (__DEV__) console.log(`[StreamStore] rediscover-favorites cache stale (Age: ${cacheAgeSec}s), running silent refresh`);
        } else {
            if (__DEV__) console.log("[StreamStore] rediscover-favorites no cache, running initial fetch");
            set({ isLoadingRediscoverFavorites: true });
        }

        try {
            const res = await axiosInstance.get('/stream/recommendations/rediscover-favorites');
            if (res.data && Array.isArray(res.data.tracks)) {
                const mapped = res.data.tracks.map((t: any) => ({
                    ...t,
                    url: t.audioUrl || '',
                    artwork: t.imageUrl || '',
                }));
                const createFingerprint = (data: any[], updatedAt: number) => `${data.map(t => t.id || t.externalId).join('|')}_${updatedAt}`;
                
                const prevFingerprint = cache ? createFingerprint(cache, get().rediscoverFavoritesFetchedAt || 0) : "";
                const newFingerprint = createFingerprint(mapped, res.data.updatedAt || Date.now());
                
                if (prevFingerprint !== newFingerprint) {
                    if (__DEV__) console.log("[StreamStore] rediscover-favorites updated");
                    set({ rediscoverFavoritesData: mapped, rediscoverFavoritesFetchedAt: Date.now() });
                } else {
                    if (__DEV__) console.log("[StreamStore] rediscover-favorites unchanged");
                    set({ rediscoverFavoritesFetchedAt: Date.now() });
                }
            }
        } catch (error) {
            console.error('[StreamStore] Failed to fetch rediscover-favorites recommendations:', error);
        } finally {
            set({ isLoadingRediscoverFavorites: false });
        }
    },

    fetchFollowedArtistsRecommendations: async (forceRefresh = false) => {
        const now = Date.now();
        const fetchedAt = get().followedArtistsFetchedAt || 0;
        const cache = get().followedArtistsData;
        const hasCache = !!cache && cache.length > 0;
        const isExpired = !fetchedAt || (now - fetchedAt > 86400000); // 24 hours TTL
        
        if (get().isLoadingFollowedArtists) return;

        if (hasCache) {
            if (!forceRefresh && !isExpired) {
                if (__DEV__) console.log("[StreamStore] followed-artists cache valid, skipping fetch");
                return;
            }
            if (__DEV__) console.log("[StreamStore] followed-artists cache stale/forced, running silent refresh");
        } else {
            if (__DEV__) console.log("[StreamStore] followed-artists no cache, running initial fetch");
            set({ isLoadingFollowedArtists: true });
        }

        try {
            const res = await axiosInstance.get('/stream/recommendations/followed-artists');
            if (Array.isArray(res.data) && res.data.length > 0) {
                const mappedGroups = res.data.map((group: any) => ({
                    ...group,
                    tracks: (group.tracks || []).map((t: any) => ({
                        ...t,
                        url: t.audioUrl || '',
                        artwork: t.imageUrl || '',
                    })),
                }));
                const prevDataStr = JSON.stringify(get().followedArtistsData);
                const newDataStr = JSON.stringify(mappedGroups);
                if (prevDataStr !== newDataStr) {
                    if (__DEV__) console.log("[StreamStore] followed-artists updated");
                    set({ followedArtistsData: mappedGroups, followedArtistsFetchedAt: Date.now() });
                } else {
                    if (__DEV__) console.log("[StreamStore] followed-artists unchanged");
                    set({ followedArtistsFetchedAt: Date.now() });
                }
            }
        } catch (error) {
            console.error('[StreamStore] Failed to fetch followed-artists recommendations:', error);
        } finally {
            set({ isLoadingFollowedArtists: false });
        }
    },

    fetchContinueListening: async (forceRefresh = false) => {
        const now = Date.now();
        const fetchedAt = get().continueListeningFetchedAt || 0;
        const cache = get().continueListeningData;
        const hasCache = !!cache && cache.length > 0;
        const isExpired = !fetchedAt || (now - fetchedAt > 86400000); // 24 hours TTL
        const cacheAgeSec = Math.round((now - fetchedAt) / 1000);
        
        if (get().isLoadingContinueListening) return;

        if (hasCache) {
            // Debounce rapid tab switches (20 minutes)
            if (!forceRefresh && !isExpired && cacheAgeSec < 1200) {
                if (__DEV__) console.log(`[StreamStore] continue-listening cache valid (Age: ${cacheAgeSec}s < 1200s), skipping fetch`);
                return;
            }
            if (__DEV__) console.log(`[StreamStore] continue-listening cache stale (Age: ${cacheAgeSec}s), running silent refresh`);
        } else {
            if (__DEV__) console.log("[StreamStore] continue-listening no cache, running initial fetch");
            set({ isLoadingContinueListening: true });
        }

        try {
            const res = await axiosInstance.get('/history/continue-listening');
            if (Array.isArray(res.data)) {
                
                // Generate lightweight fingerprint instead of JSON stringify
                const createFingerprint = (data: any[]) => data.map(item => `${item.id}_${item.position}_${item.progress}_${item.updatedAt}`).join('|');
                
                const prevFingerprint = cache ? createFingerprint(cache) : "";
                const newFingerprint = createFingerprint(res.data);
                
                if (prevFingerprint !== newFingerprint) {
                    if (__DEV__) console.log("[StreamStore] continue-listening updated");
                    set({ continueListeningData: res.data, continueListeningFetchedAt: Date.now() });
                } else {
                    if (__DEV__) console.log("[StreamStore] continue-listening unchanged");
                    set({ continueListeningFetchedAt: Date.now() });
                }
            }
        } catch (error: any) {
            if (error.response?.status !== 401) {
                console.error('[StreamStore] Failed to fetch continue-listening:', error);
            }
        } finally {
            set({ isLoadingContinueListening: false });
        }
    },

    fetchFrequentCollections: async (forceRefresh = false) => {
        const now = Date.now();
        const fetchedAt = get().frequentCollectionsFetchedAt || 0;
        const cache = get().frequentCollectionsData;
        const hasCache = !!cache && cache.length > 0;
        const isExpired = !fetchedAt || (now - fetchedAt > 86400000); // 24 hours TTL
        const cacheAgeSec = Math.round((now - fetchedAt) / 1000);
        
        if (get().isLoadingFrequentCollections) return;

        if (hasCache) {
            // Debounce rapid tab switches (30 minutes)
            if (!forceRefresh && !isExpired && cacheAgeSec < 1800) {
                if (__DEV__) console.log(`[StreamStore] frequent-collections cache valid (Age: ${cacheAgeSec}s < 1800s), skipping fetch`);
                return;
            }
            if (__DEV__) console.log(`[StreamStore] frequent-collections cache stale (Age: ${cacheAgeSec}s), running silent refresh`);
        } else {
            if (__DEV__) console.log("[StreamStore] frequent-collections no cache, running initial fetch");
            set({ isLoadingFrequentCollections: true });
        }

        try {
            const res = await axiosInstance.get('/history/frequent-collections?limit=6');
            if (Array.isArray(res.data)) {
                
                // Generate lightweight fingerprint instead of JSON stringify
                const createFingerprint = (data: any[]) => data.map(item => `${item.id}_${item.playCount}_${item.updatedAt}_${item.lastPlayedAt}`).join('|');
                
                const prevFingerprint = cache ? createFingerprint(cache) : "";
                const newFingerprint = createFingerprint(res.data);
                
                if (prevFingerprint !== newFingerprint) {
                    if (__DEV__) console.log("[StreamStore] frequent-collections updated");
                    set({ frequentCollectionsData: res.data, frequentCollectionsFetchedAt: Date.now() });
                } else {
                    if (__DEV__) console.log("[StreamStore] frequent-collections unchanged");
                    set({ frequentCollectionsFetchedAt: Date.now() });
                }
            }
        } catch (error: any) {
            if (error.response?.status !== 401) {
                console.error('[StreamStore] Failed to fetch frequent-collections:', error);
            }
        } finally {
            set({ isLoadingFrequentCollections: false });
        }
    },

    fetchExternalAlbum: async (source, id) => {
        set({ isLoadingDetail: true, currentExternalAlbum: null });
        try {
            const res = await axiosInstance.get(`/stream/albums/${source}/${id}`);
            set({ currentExternalAlbum: res.data });
        } catch (error) {
            console.error("[StreamStore] Failed to fetch external album:", error);
        } finally {
            set({ isLoadingDetail: false });
        }
    },

    fetchExternalPlaylist: async (source, id) => {
        set({ isLoadingDetail: true, currentExternalPlaylist: null });
        try {
            const res = await axiosInstance.get(`/stream/playlists/${source}/${id}`);
            set({ currentExternalPlaylist: res.data });
        } catch (error) {
            console.error("[StreamStore] Failed to fetch external playlist:", error);
        } finally {
            set({ isLoadingDetail: false });
        }
    },

    fetchExternalArtist: async (source, id) => {
        set({ isLoadingDetail: true, currentExternalArtist: null });
        try {
            const res = await axiosInstance.get(`/stream/artists/${source}/${id}`);
            set({ currentExternalArtist: res.data });
        } catch (error) {
            console.error("[StreamStore] Failed to fetch external artist:", error);
        } finally {
            set({ isLoadingDetail: false });
        }
    },

    clearDetail: () => {
        set({
            currentExternalAlbum: null,
            currentExternalPlaylist: null,
            currentExternalArtist: null,
        });
    },


    getPlayableUrl: async (song) => {
            const id = song.id || (song as any).externalId;
            const source = song.source === 'yt' ? 'youtube' : song.source;

            // ALWAYS use the redirector for JioSaavn tracks to ensure fresh, valid links (Chat Parity)
            if (song.source === 'jiosaavn' || song.source === 'saavn') {
                if (id) {
                    const cleanId = String(id).replace("jiosaavn_", "");
                    
                    let bitrate = '320';
                    try {
                        const { useSettingsStore } = await import('./useSettingsStore');
                        const { useNetworkStore } = await import('./useNetworkStore');
                        const { resolvePreferredBitrate } = await import('@/utils/playbackSettings');
                        
                        const settings = useSettingsStore.getState();
                        const network = useNetworkStore.getState();
                        bitrate = resolvePreferredBitrate(network.connectionType, settings.wifiAudioQuality, settings.mobileAudioQuality);
                    } catch (err) {
                        console.warn('[StreamStore] Failed to resolve bitrate settings:', err);
                    }

                    return `${axiosInstance.defaults.baseURL}/stream/play/jiosaavn/${cleanId}?bitrate=${bitrate}`;
                }
            }

            // Fallback for direct URLs (mostly YouTube or legacy)
            const url = song.streamUrl || song.audioUrl;
            if (url && url.length > 10 && !url.includes('/api/stream/play/')) {
                // If it's already a full URL and NOT a redirector link, wrap it in proxy
                if (song.source === 'jiosaavn' || song.source === 'saavn') {
                   return proxyAudioUrl(url);
                }
                return url;
            }

            // Fallback to redirector for YouTube/Others
            if (id) {
                const cleanId = String(id).replace("jiosaavn_", "").replace("yt_", "").replace("youtube_", "");
                return `${axiosInstance.defaults.baseURL}/stream/play/${source}/${cleanId}`;
            }

        // --- SECONDARY FALLBACK: Local Resolution ---
        // (Phase 3: Removed unreachable YouTube cache logic. YouTube redirectors are now handled unconditionally at the top of getPlayableUrl.)

        return song.audioUrl || song.streamUrl || null;
    },

    reset: () => {
        set({
            homepageData: null,
            homepageFetchedAt: null,
            dailyMix: null,
            dailyMixFetchedAt: null,
            dailyMixDate: null,
            weeklyMix: null,
            weeklyMixFetchedAt: null,
            weeklyMixWeek: null,
            searchResults: [],
            searchAllResults: null,
            searchQuery: "",
            currentExternalAlbum: null,
            currentExternalPlaylist: null,
            currentExternalArtist: null,
            becauseYouPlayedData: null,
            becauseYouPlayedFetchedAt: null,
            rediscoverFavoritesData: null,
            rediscoverFavoritesFetchedAt: null,
            followedArtistsData: null,
            followedArtistsFetchedAt: null,
            isLoadingBecauseYouPlayed: false,
            isLoadingRediscoverFavorites: false,
            isLoadingFollowedArtists: false,
            continueListeningData: null,
            continueListeningFetchedAt: null,
            isLoadingContinueListening: false,
        });
    },
        }),
        {
            name: "vibra-stream-storage",
            storage: createJSONStorage(() => mmkvStorage),
            partialize: (state) => ({
                homepageData: state.homepageData,
                homepageFetchedAt: state.homepageFetchedAt,
                dailyMix: state.dailyMix,
                dailyMixFetchedAt: state.dailyMixFetchedAt,
                dailyMixDate: state.dailyMixDate,
                weeklyMix: state.weeklyMix,
                weeklyMixFetchedAt: state.weeklyMixFetchedAt,
                weeklyMixWeek: state.weeklyMixWeek,
                becauseYouPlayedData: state.becauseYouPlayedData,
                becauseYouPlayedFetchedAt: state.becauseYouPlayedFetchedAt,
                rediscoverFavoritesData: state.rediscoverFavoritesData,
                rediscoverFavoritesFetchedAt: state.rediscoverFavoritesFetchedAt,
                followedArtistsData: state.followedArtistsData,
                followedArtistsFetchedAt: state.followedArtistsFetchedAt,
                continueListeningData: state.continueListeningData,
                continueListeningFetchedAt: state.continueListeningFetchedAt,
            }),
            onRehydrateStorage: () => (state) => {
                if (__DEV__ && state) {
                    console.log(`[StreamStore] Hydration complete. Homepage cached: ${!!state.homepageData} (FetchedAt: ${state.homepageFetchedAt}). Daily cached: ${!!state.dailyMix} (Date: ${state.dailyMixDate}). Weekly cached: ${!!state.weeklyMix} (Week: ${state.weeklyMixWeek}). Recommendations cached - becauseYouPlayed: ${!!state.becauseYouPlayedData}, rediscoverFavorites: ${!!state.rediscoverFavoritesData && state.rediscoverFavoritesData.length > 0}, followedArtists: ${!!state.followedArtistsData}`);
                }
            }
        }
    )
);
