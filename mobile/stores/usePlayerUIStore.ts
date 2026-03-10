import { create } from 'zustand';

interface PlayerUIStore {
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    isLyricsModalVisible: boolean;
    setLyricsModalVisible: (visible: boolean) => void;
    isArtistModalVisible: boolean;
    setArtistModalVisible: (visible: boolean) => void;
    isPlayerExpanded: boolean;
    setIsPlayerExpanded: (visible: boolean) => void;
}

export const usePlayerUIStore = create<PlayerUIStore>((set) => ({
    activeIndex: -1,
    setActiveIndex: (index) => set({ activeIndex: index }),
    isLyricsModalVisible: false,
    setLyricsModalVisible: (visible) => set({ isLyricsModalVisible: visible }),
    isArtistModalVisible: false,
    setArtistModalVisible: (visible) => set({ isArtistModalVisible: visible }),
    isPlayerExpanded: false,
    setIsPlayerExpanded: (visible) => set({ isPlayerExpanded: visible }),
}));
