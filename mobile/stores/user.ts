import { useMusicStore } from "./useMusicStore";
import { useStreamStore } from "./useStreamStore";
import { usePlayerStore } from "./usePlayerStore";
import { useOnboardingStore } from "./useOnboardingStore";
import { usePlayerUIStore } from "./usePlayerUIStore";
import { useDownloadStore } from "./useDownloadStore";

/**
 * Resets all user-specific stores to their initial states.
 * This should be called during logout or when switching users.
 */
export const resetAllStores = async () => {
    try {
        console.log("[Auth] Resetting all stores...");
        
        // 1. Stop playback and clear player state
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
        
        console.log("[Auth] All stores reset successfully.");
    } catch (error) {
        console.error("[Auth] Error resetting stores:", error);
    }
};
