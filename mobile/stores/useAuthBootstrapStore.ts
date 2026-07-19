import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/mmkvStorage';

export type LoginSyncState = 'idle' | 'authenticating' | 'syncing_library' | 'preparing_account' | 'complete';

interface AuthBootstrapStore {
    // Persisted: Was the user fully signed in the last time the app closed?
    hasValidSession: boolean;
    setHasValidSession: (value: boolean) => void;

    // Runtime only: Has the async initial boot check completed?
    isBootstrapped: boolean;
    setBootstrapped: (value: boolean) => void;

    // Runtime only: The presentation state for the login to app entry transition
    loginSyncState: LoginSyncState;
    setLoginSyncState: (state: LoginSyncState) => void;
}

export const useAuthBootstrapStore = create<AuthBootstrapStore>()(
    persist(
        (set) => ({
            hasValidSession: false,
            setHasValidSession: (value) => set({ hasValidSession: value }),

            isBootstrapped: false,
            setBootstrapped: (value) => set({ isBootstrapped: value }),

            loginSyncState: 'complete',
            setLoginSyncState: (state) => set({ loginSyncState: state }),
        }),
        {
            name: 'vibra-auth-bootstrap',
            storage: createJSONStorage(() => mmkvStorage),
            partialize: (state) => ({ hasValidSession: state.hasValidSession }), // Only persist hasValidSession
        }
    )
);
