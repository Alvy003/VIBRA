import { useMusicStore } from "./useMusicStore";
import { useStreamStore } from "./useStreamStore";
import { usePlayerStore } from "./usePlayerStore";
import { useOnboardingStore } from "./useOnboardingStore";
import { usePlayerUIStore } from "./usePlayerUIStore";
import { useDownloadStore } from "./useDownloadStore";
import { useAuthBootstrapStore } from "./useAuthBootstrapStore";
import * as Sentry from '@sentry/react-native';
import { incrementSessionVersion, setAuthToken } from "../lib/axios";

/**
 * Resets all user-specific stores to their initial states.
 * This should be called during logout or when switching users.
 */
export const resetAllStores = async () => {
    try {
        if (__DEV__) {
            console.log("[Auth] Resetting all stores...");
        }

        // 1. Terminate session immediately to discard in-flight requests and force stack unmounting
        incrementSessionVersion();
        setAuthToken(null);
        useAuthBootstrapStore.getState().setHasValidSession(false);
        useAuthBootstrapStore.getState().setLoginSyncState('idle');
        useMusicStore.getState().setAuthReady(false);

        // 2. Stop playback and clear player state
        await usePlayerStore.getState().reset();

        // 2. Clear music and discovery cache
        useMusicStore.getState().reset();
        useStreamStore.getState().reset();

        // 3. Clear UI state
        usePlayerUIStore.getState().reset();

        // 4. Clear user preferences
        useOnboardingStore.getState().reset();

        // 5. Clear download index (does not delete physical files)
        await useDownloadStore.getState().reset();

        if (__DEV__) {
            console.log("[Auth] All stores reset successfully.");
        }
    } catch (error) {
        Sentry.captureException(error);
    }
};
