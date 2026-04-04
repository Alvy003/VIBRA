import React, { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
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
    const hasSyncedRef = React.useRef(false);

    useEffect(() => {
        const updateAxiosToken = async () => {
            if (isLoaded && isSignedIn) {
                try {
                    // console.log("[ClerkAuthHandler] Refreshing token...");
                    const token = await getToken({ skipCache: true }); // Force fresh token
                    setAuthToken(token);

                    // If this is the first time we're signed in this session, trigger sync
                    if (!hasSyncedRef.current) {
                        console.log("[ClerkAuthHandler] Initial token set. Triggering app sync...");
                        
                        // Run fetches in parallel
                        Promise.all([
                            useOnboardingStore.getState().fetchPreferences(),
                            useMusicStore.getState().fetchRecentlyPlayed(),
                            useMusicStore.getState().fetchQuickPicks(),
                            useMusicStore.getState().fetchRecentCollections(),
                            useStreamStore.getState().fetchDailyMix(),
                            useStreamStore.getState().fetchWeeklyMix(),
                        ]).catch(err => console.error("[ClerkAuthHandler] Sync error:", err));

                        hasSyncedRef.current = true;
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
