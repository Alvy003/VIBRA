import React, { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { axiosInstance, setAuthToken } from '@/lib/axios';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useMusicStore } from '@/stores/useMusicStore';
import { useStreamStore } from '@/stores/useStreamStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAuthBootstrapStore } from '@/stores/useAuthBootstrapStore';
import { useNetworkStore } from '@/stores/useNetworkStore';

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

                // Keep our persistent flag true
                useAuthBootstrapStore.getState().setHasValidSession(true);

                try {
                    // Get token gracefully first
                    let token = await getToken({ skipCache: false });

                    if (useNetworkStore.getState().isOnline) {
                        token = await getToken({ skipCache: true }); // refresh if online
                    }

                    setAuthToken(token);

                    // Mark auth ready so local components can fetch confidently
                    useMusicStore.getState().setAuthReady(true);

                    // Flush any pending playback progress from previous session once authenticated
                    usePlayerStore.getState().flushUnsyncedProgress();

                    // If this is the first time we're signed in this session, trigger sync
                    if (!hasSyncedRef.current) {
                        const bootstrapStore = useAuthBootstrapStore.getState();
                        if (bootstrapStore.loginSyncState === 'authenticating') {
                            bootstrapStore.setLoginSyncState('syncing_library');
                        }

                        if (useNetworkStore.getState().isOnline) {
                            console.log("[ClerkAuthHandler] Initial sign-in sync starting...");

                            // 1. First, ensure user exists in backend via sync
                            await axiosInstance.post("/auth/callback", {
                                id: user?.id,
                                firstName: user?.firstName,
                                lastName: user?.lastName,
                                imageUrl: user?.imageUrl,
                            }).catch(err => console.error("[ClerkAuthHandler] Auth sync failed:", err));

                            // Get the current languages before fetching new preferences
                            const oldLanguages = useOnboardingStore.getState().getLanguageString();

                            // 2. Fetch user preferences first
                            await useOnboardingStore.getState().fetchPreferences().catch(err => 
                                console.error("[ClerkAuthHandler] Preferences fetch failed:", err)
                            );

                            // Determine if user is new or existing and update presentation state
                            const completedOnboarding = useOnboardingStore.getState().preferences.completedOnboarding;
                            if (!completedOnboarding) {
                                bootstrapStore.setLoginSyncState('preparing_account');
                            } else {
                                bootstrapStore.setLoginSyncState('syncing_library');
                            }

                            const newLanguages = useOnboardingStore.getState().getLanguageString();
                            const languagesChanged = oldLanguages !== newLanguages;

                            // Determine if we need to force homepage refresh
                            const hasHomepageCache = !!useStreamStore.getState().homepageData;
                            const shouldForceHomepage = languagesChanged || !hasHomepageCache;

                            // 3. Fetch core homepage data
                            await Promise.all([
                                useStreamStore.getState().fetchHomepage(shouldForceHomepage),
                            ]).catch(err => console.error("[ClerkAuthHandler] Data sync error:", err));

                            // 4. Trigger reactive component-level fetches asynchronously (independent loading architecture)
                            useStreamStore.getState().triggerRefresh();
                            useMusicStore.getState().triggerRefresh();

                            hasSyncedRef.current = true;
                            bootstrapStore.setLoginSyncState('complete');
                            console.log("[ClerkAuthHandler] Initial sync complete.");
                        } else {
                            // Offline - just consider it synced so we don't block
                            hasSyncedRef.current = true;
                            bootstrapStore.setLoginSyncState('complete');
                        }
                    }
                } catch (error: any) {
                    console.error('[ClerkAuthHandler] Error fetching JWT:', error);
                    useAuthBootstrapStore.getState().setLoginSyncState('complete');
                    const isNetworkError = !useNetworkStore.getState().isOnline ||
                        error?.message?.includes('Network') ||
                        error?.message?.includes('fetch') ||
                        error?.message?.includes('offline');

                    if (isNetworkError) {
                        console.log('[ClerkAuthHandler] Network error while fetching JWT, preserving offline state.');
                        useMusicStore.getState().setAuthReady(true);
                    } else {
                        // Real auth failure
                        setAuthToken(null);
                        useMusicStore.getState().setAuthReady(false);
                        useAuthBootstrapStore.getState().setHasValidSession(false);
                        hasSyncedRef.current = false;
                    }
                }
            } else if (isLoaded && !isSignedIn) {
                // If Clerk says we aren't signed in, check if it's because we're offline
                const isOnline = useNetworkStore.getState().isOnline;
                if (isOnline) {
                    setAuthToken(null);
                    useMusicStore.getState().setAuthReady(false);
                    hasSyncedRef.current = false; // Reset sync on sign out
                    useAuthBootstrapStore.getState().setHasValidSession(false);
                } else {
                    // Clerk dropped session due to offline. Ignore and keep our offline state.
                    console.log('[ClerkAuthHandler] Offline session drop ignored.');
                    useMusicStore.getState().setAuthReady(true);
                }
            }
        };

        updateAxiosToken();

        // Refresh token every 50 seconds (standard Clerk tokens last 60s)
        const interval = setInterval(updateAxiosToken, 50000);
        return () => clearInterval(interval);
    }, [isSignedIn, isLoaded, user]);

    // Network recovery listener
    useEffect(() => {
        const unsubscribe = useNetworkStore.subscribe((state, prevState) => {
            // If transitioned from offline to online
            if (!prevState.isOnline && state.isOnline && isSignedIn) {
                console.log("[ClerkAuthHandler] Network restored, refreshing token and stale data...");
                getToken({ skipCache: true }).then(token => {
                    setAuthToken(token);
                    // Fetch only stale data
                    useStreamStore.getState().fetchHomepage(false);
                    useMusicStore.getState().fetchQuickPicks(false);
                }).catch(err => {
                    console.error("[ClerkAuthHandler] Recovery sync failed:", err);
                });
            }
        });
        return unsubscribe;
    }, [isSignedIn, getToken]);

    // Initialize Network Store Listener globally here
    useEffect(() => {
        const cleanupNetwork = useNetworkStore.getState().initNetworkListener();
        return cleanupNetwork;
    }, []);

    return null;
};
