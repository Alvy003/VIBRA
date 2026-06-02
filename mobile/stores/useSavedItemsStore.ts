import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { axiosInstance } from "@/lib/axios";
import { mmkvStorage } from "@/lib/mmkvStorage";
import { migrateStoreToMMKV } from "@/lib/mmkvMigration";

export interface SavedItem {
    _id: string;
    userId: string;
    type: "album" | "playlist" | "artist";
    source: "jiosaavn" | "youtube";
    externalId: string;
    title: string;
    artist: string;
    description: string;
    imageUrl: string;
    songs: any[];
    songCount: number;
    createdAt?: string | number;
}

interface SavedItemsStore {
    savedItems: SavedItem[];
    isLoading: boolean;
    fetchSavedItems: () => Promise<void>;
    toggleSaveItem: (item: any) => Promise<boolean>;
    isItemSaved: (externalId: string) => boolean;
}

export const useSavedItemsStore = create<SavedItemsStore>()(
    persist(
        (set, get) => ({
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

            toggleSaveItem: async (item) => {
                const externalId = item.externalId || item.id;
                const isSaved = get().isItemSaved(externalId);
                
                try {
                    if (isSaved) {
                        await axiosInstance.delete(`/library/saved/${externalId}`);
                        set(state => ({
                            savedItems: state.savedItems.filter(i => i.externalId !== externalId)
                        }));
                        return false;
                    } else {
                        const { data } = await axiosInstance.post("/library/saved", {
                            ...item,
                            externalId,
                            type: item.type || (item.name && !item.title ? 'artist' : 'playlist'),
                            source: item.source || 'jiosaavn'
                        });
                        set(state => ({
                            savedItems: [data, ...state.savedItems]
                        }));
                        return true;
                    }
                } catch (err) {
                    console.error("Failed to toggle save item:", err);
                    return isSaved;
                }
            },

            isItemSaved: (externalId) => {
                return get().savedItems.some(i => i.externalId === externalId);
            }
        }),
        {
            name: 'vibra-saved-items-storage',
            storage: createJSONStorage(() => mmkvStorage),
            partialize: (state) => ({ savedItems: state.savedItems }),
        }
    )
);

// Trigger one-time async migration on first launch
migrateStoreToMMKV("vibra-saved-items-storage").then((migrated) => {
    if (migrated) {
        useSavedItemsStore.persist.rehydrate();
    }
});
