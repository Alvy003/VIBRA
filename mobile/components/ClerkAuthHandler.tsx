import React, { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { axiosInstance, setAuthToken } from '@/lib/axios';

/**
 * A headless component that listens for Clerk authentication state changes.
 * It automatically updates the axiosInstance's common Authorization header
 * whenever a new token is available or the user's session changes.
 */
export const ClerkAuthHandler: React.FC = () => {
    const { getToken, isSignedIn, isLoaded } = useAuth();

    useEffect(() => {
        const updateAxiosToken = async () => {
            if (isLoaded && isSignedIn) {
                try {
                    // console.log("[ClerkAuthHandler] Refreshing token...");
                    const token = await getToken({ skipCache: true }); // Force fresh token
                    setAuthToken(token);
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
