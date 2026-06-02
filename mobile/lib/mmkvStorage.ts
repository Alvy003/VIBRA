import { MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

// Centralized MMKV instance for the entire app.
// Bounding all stores to a single instance avoids mapping multiple files into memory.
export const storage = new MMKV({ id: 'vibra-app-storage' });

// Zustand persist middleware adapter for MMKV
export const mmkvStorage: StateStorage = {
    getItem: (name) => {
        const value = storage.getString(name);
        return value ?? null;
    },
    setItem: (name, value) => {
        storage.set(name, value);
    },
    removeItem: (name) => {
        storage.delete(name);
    },
};
