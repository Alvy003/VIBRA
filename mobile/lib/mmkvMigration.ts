import AsyncStorage from '@react-native-async-storage/async-storage';
import { mmkvStorage } from './mmkvStorage';

/**
 * Safely migrates a Zustand store's persistence from AsyncStorage to MMKV.
 * This should be run on app startup BEFORE the store is accessed/hydrated.
 * 
 * @param asyncKey The key used in AsyncStorage (must match the MMKV key)
 * @returns boolean indicating if a migration occurred
 */
export async function migrateStoreToMMKV(asyncKey: string): Promise<boolean> {
    try {
        // Check if data exists in MMKV first. If it does, we already migrated.
        const existingMmkvData = mmkvStorage.getItem(asyncKey);
        if (existingMmkvData) {
            return false; // Already migrated or fresh install
        }

        // Check if legacy data exists in AsyncStorage
        const legacyData = await AsyncStorage.getItem(asyncKey);
        if (legacyData) {
            console.log(`[MMKV Migration] Migrating ${asyncKey} from AsyncStorage to MMKV...`);
            
            // 1. Write to MMKV
            mmkvStorage.setItem(asyncKey, legacyData);
            
            // 2. Verify it was written successfully
            const verification = mmkvStorage.getItem(asyncKey);
            if (verification === legacyData) {
                // 3. Remove legacy data ONLY after successful migration verification
                await AsyncStorage.removeItem(asyncKey);
                console.log(`[MMKV Migration] ${asyncKey} successfully migrated.`);
                return true;
            } else {
                console.error(`[MMKV Migration] Verification failed for ${asyncKey}. Aborting deletion.`);
                return false;
            }
        }
        
        return false; // No legacy data found
    } catch (error) {
        console.error(`[MMKV Migration] Failed to migrate ${asyncKey}:`, error);
        return false;
    }
}
