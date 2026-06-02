import React, { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { axiosInstance, setAuthToken } from '@/lib/axios';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useMusicStore } from '@/stores/useMusicStore';
import { useStreamStore } from '@/stores/useStreamStore';

/**
 * A headless component that listens for Clerk authentication state changes.
 * It automatically updates the axiosInstance's common Authorization header
 * whenever a new token is available or the user's session changes.
 */
export const ClerkAuthHandler: React.FC = () => {
    const { getToken, isSignedIn, isLoaded } = useAuth();
    const { user } = useUser();
    const hasSyncedRef = React.useRef(false);

    useEffect(() => {
        const updateAxiosToken = async () => {
            if (isLoaded && isSignedIn) {
                // Wait for the user object to load before attempting to sync
                if (!user) return;

                try {
                    // console.log("[ClerkAuthHandler] Refreshing token...");
                    const token = await getToken({ skipCache: true }); // Force fresh token
                    setAuthToken(token);

                    // If this is the first time we're signed in this session, trigger sync
                    if (!hasSyncedRef.current) {
                        console.log("[ClerkAuthHandler] Initial sign-in sync starting...");
                        
                        // 1. First, ensure user exists in backend via sync
                        await axiosInstance.post("/auth/callback", {
                            id: user?.id,
                            firstName: user?.firstName,
                            lastName: user?.lastName,
                            imageUrl: user?.imageUrl,
                        }).catch(err => console.error("[ClerkAuthHandler] Auth sync failed:", err));

                        // 2. Then, fetch other data
                        await Promise.all([
                            useOnboardingStore.getState().fetchPreferences().then(() => {
                                // FIX: Invalidate cached homepage and re-fetch with the user's actual language preferences
                                useStreamStore.setState({ homepageData: null });
                                return useStreamStore.getState().fetchHomepage();
                            }),
                            useMusicStore.getState().fetchRecentlyPlayed(),
                            useMusicStore.getState().fetchQuickPicks(),
                            useMusicStore.getState().fetchRecentCollections(),
                            useMusicStore.getState().fetchFrequentCollections(),
                            useStreamStore.getState().fetchDailyMix(),
                            useStreamStore.getState().fetchWeeklyMix(),
                        ]).catch(err => console.error("[ClerkAuthHandler] Data sync error:", err));

                        hasSyncedRef.current = true;
                        console.log("[ClerkAuthHandler] Initial sync complete.");
                    }
                } catch (error) {
                    console.error('[ClerkAuthHandler] Error fetching JWT:', error);
                    setAuthToken(null);
                }
            } else {
                setAuthToken(null);
            }
        };

        updateAxiosToken();

        // Refresh token every 50 seconds (standard Clerk tokens last 60s)
        const interval = setInterval(updateAxiosToken, 50000);
        return () => clearInterval(interval);
    }, [isSignedIn, isLoaded]);

    return null;
};
