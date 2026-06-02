import { create } from 'zustand';
import { axiosInstance } from '@/lib/axios';
import Constants from 'expo-constants';

interface UpdateStore {
    currentVersion: string | null;
    needsUpdate: boolean;
    forceUpdate: boolean;
    apkLink: string | null;
    isLoading: boolean;
    checkUpdate: () => Promise<void>;
}

export const useUpdateStore = create<UpdateStore>((set) => ({
    currentVersion: null,
    needsUpdate: false,
    forceUpdate: false,
    apkLink: null,
    isLoading: false,

    checkUpdate: async () => {
        set({ isLoading: true });
        try {
            const response = await axiosInstance.get('/config');
            const { currentVersion, apkLink, forceUpdate } = response.data;
            
            const localVersion = Constants.expoConfig?.version || '1.0.0';
            
            const needsUpdate = currentVersion !== localVersion && isNewerVersion(currentVersion, localVersion);

            set({
                currentVersion,
                apkLink,
                needsUpdate,
                forceUpdate: !!forceUpdate,
                isLoading: false,
            });
        } catch (error) {
            console.error('[UpdateStore] Failed to check for updates:', error);
            set({ isLoading: false });
        }
    },
}));

function isNewerVersion(remote: string, local: string): boolean {
    const remoteParts = remote.split('.').map(Number);
    const localParts = local.split('.').map(Number);

    for (let i = 0; i < Math.max(remoteParts.length, localParts.length); i++) {
        const r = remoteParts[i] || 0;
        const l = localParts[i] || 0;
        if (r > l) return true;
        if (r < l) return false;
    }
    return false;
}
