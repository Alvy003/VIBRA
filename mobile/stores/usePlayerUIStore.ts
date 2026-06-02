import { create } from 'zustand';

interface PlayerUIStore {
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    isLyricsModalVisible: boolean;
    setLyricsModalVisible: (visible: boolean) => void;
    isArtistModalVisible: boolean;
    setArtistModalVisible: (visible: boolean) => void;
    isQueueVisible: boolean;
    setQueueVisible: (visible: boolean) => void;
    isPlayerExpanded: boolean;
    setIsPlayerExpanded: (visible: boolean) => void;

    // Global song options sheet
    selectedSongForOptions: any | null;
    isSongOptionsVisible: boolean;
    openSongOptions: (song: any) => void;
    closeSongOptions: () => void;

    reset: () => void;
}

export const usePlayerUIStore = create<PlayerUIStore>((set) => ({
    activeIndex: -1,
    setActiveIndex: (index) => set({ activeIndex: index }),
    isLyricsModalVisible: false,
    setLyricsModalVisible: (visible) => set({ isLyricsModalVisible: visible }),
    isArtistModalVisible: false,
    setArtistModalVisible: (visible) => set({ isArtistModalVisible: visible }),
    isQueueVisible: false,
    setQueueVisible: (visible) => set({ isQueueVisible: visible }),
    isPlayerExpanded: false,
    setIsPlayerExpanded: (visible) => set({ isPlayerExpanded: visible }),

    // Global song options sheet
    selectedSongForOptions: null,
    isSongOptionsVisible: false,
    openSongOptions: (song) => set({ selectedSongForOptions: { ...song }, isSongOptionsVisible: true }),
    closeSongOptions: () => set({ isSongOptionsVisible: false }),

    reset: () => set({
        activeIndex: -1,
        isLyricsModalVisible: false,
        isArtistModalVisible: false,
        isQueueVisible: false,
        isPlayerExpanded: false,
        selectedSongForOptions: null,
        isSongOptionsVisible: false,
    }),
}));

