import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { axiosInstance } from "@/lib/axios";

export interface SavedItem {
    _id: string;
    userId: string;
    type: "album" | "playlist";
    source: "jiosaavn" | "youtube";
    externalId: string;
    title: string;
    artist: string;
    description: string;
    imageUrl: string;
    songCount: number;
}

interface SavedItemsStore {
    savedItems: SavedItem[];
    isLoading: boolean;
    fetchSavedItems: () => Promise<void>;
}

export const useSavedItemsStore = create<SavedItemsStore>()(
    persist(
        (set) => ({
            savedItems: [],
            isLoading: false,

            fetchSavedItems: async () => {
                set({ isLoading: true });
                try {
                    const { data } = await axiosInstance.get("/library/saved");
                    set({ savedItems: data });
                } catch (err) {
                    console.error("Failed to fetch saved items:", err);
                } finally {
                    set({ isLoading: false });
                }
            },
        }),
        {
            name: 'vibra-saved-items-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ savedItems: state.savedItems }),
        }
    )
);
