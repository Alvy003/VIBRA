// stores/useUIStore.ts
import { create } from "zustand";

type SidePanelView = "friends" | "queue";

interface UIStore {
  sidePanelView: SidePanelView;
  toggleSidePanelView: () => void;
  setSidePanelView: (view: SidePanelView) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  sidePanelView: "friends",
  toggleSidePanelView: () => {
    set((state) => ({
      sidePanelView: state.sidePanelView === "friends" ? "queue" : "friends",
    }));
  },
  setSidePanelView: (view) => set({ sidePanelView: view }),
}));
