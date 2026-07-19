import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStore {
    isOnline: boolean;
    isInternetReachable: boolean | null;
    hasInitialized: boolean;
    lastConnectedAt: number | null;
    connectionType: string;
    initNetworkListener: () => () => void;
}

export const useNetworkStore = create<NetworkStore>((set, get) => ({
    isOnline: true, // Optimistically assume online initially
    isInternetReachable: true,
    hasInitialized: false,
    lastConnectedAt: null,
    connectionType: 'wifi', // Default to wifi optimistically
    
    initNetworkListener: () => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            const isConnected = state.isConnected ?? false;
            
            set((prev) => {
                const now = Date.now();
                return {
                    isOnline: isConnected,
                    isInternetReachable: state.isInternetReachable,
                    hasInitialized: true,
                    connectionType: state.type,
                    // If we just connected, update lastConnectedAt
                    lastConnectedAt: (!prev.isOnline && isConnected) ? now : prev.lastConnectedAt
                };
            });
        });
        
        return unsubscribe;
    }
}));
