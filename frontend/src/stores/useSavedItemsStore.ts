// src/stores/useSavedItemsStore.ts
import { create } from "zustand";
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
  year: number | null;
  language: string | null;
  songCount: number;
  createdAt: string;
}

interface SavedItemsStore {
  savedItems: SavedItem[];
  isLoading: boolean;
  _checkedIds: Set<string>;
  _savedIds: Set<string>;
  _hasFetched: boolean;

  fetchSavedItems: (type?: "album" | "playlist") => Promise<void>;
  saveItem: (data: Omit<SavedItem, "_id" | "userId" | "createdAt">) => Promise<void>;
  unsaveItem: (externalId: string) => Promise<void>;
  isSaved: (externalId: string) => boolean;
  checkIfSaved: (externalId: string) => Promise<boolean>;
}

export const useSavedItemsStore = create<SavedItemsStore>((set, get) => ({
  savedItems: [],
  isLoading: false,
  _checkedIds: new Set(),
  _savedIds: new Set(),
  _hasFetched: false,

  fetchSavedItems: async (type) => {
    set({ isLoading: true });
    try {
      const params = type ? `?type=${type}` : "";
      const { data } = await axiosInstance.get(`/library/saved${params}`);
      const savedIds = new Set<string>(data.map((item: SavedItem) => item.externalId));
      set({ savedItems: data, _savedIds: savedIds, _hasFetched: true });
    } catch (err) {
      console.error("Failed to fetch saved items:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  saveItem: async (itemData) => {
    try {
      const { data } = await axiosInstance.post("/library/saved", itemData);
      set((state) => {
        const newSavedIds = new Set(state._savedIds);
        newSavedIds.add(itemData.externalId);
        return {
          savedItems: [data, ...state.savedItems.filter((i) => i.externalId !== itemData.externalId)],
          _savedIds: newSavedIds,
        };
      });
    } catch (err) {
      console.error("Failed to save item:", err);
      throw err;
    }
  },

  unsaveItem: async (externalId) => {
    try {
      await axiosInstance.delete(`/library/saved/${encodeURIComponent(externalId)}`);
      set((state) => {
        const newSavedIds = new Set(state._savedIds);
        newSavedIds.delete(externalId);
        return {
          savedItems: state.savedItems.filter((i) => i.externalId !== externalId),
          _savedIds: newSavedIds,
        };
      });
    } catch (err) {
      console.error("Failed to unsave item:", err);
      throw err;
    }
  },

  isSaved: (externalId) => {
    return get()._savedIds.has(externalId);
  },

  checkIfSaved: async (externalId) => {
    const state = get();
    if (state._checkedIds.has(externalId)) {
      return state._savedIds.has(externalId);
    }
    try {
      const { data } = await axiosInstance.get(`/library/saved/check/${encodeURIComponent(externalId)}`);
      set((s) => {
        const newChecked = new Set(s._checkedIds);
        newChecked.add(externalId);
        const newSaved = new Set(s._savedIds);
        if (data.isSaved) newSaved.add(externalId);
        else newSaved.delete(externalId);
        return { _checkedIds: newChecked, _savedIds: newSaved };
      });
      return data.isSaved;
    } catch {
      return false;
    }
  },
}));