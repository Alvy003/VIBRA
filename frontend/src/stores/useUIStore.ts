// src/stores/useUIStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type SidePanelView = "friends" | "queue";

interface UIStore {
  // Side panel view (friends/queue)
  sidePanelView: SidePanelView;
  toggleSidePanelView: () => void;
  setSidePanelView: (view: SidePanelView) => void;
  
  // Sidebar collapse states
  isLeftSidebarCollapsed: boolean;
  isRightSidebarCollapsed: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidePanelView: "friends",
      toggleSidePanelView: () => {
        set((state) => ({
          sidePanelView: state.sidePanelView === "friends" ? "queue" : "friends",
        }));
      },
      setSidePanelView: (view) => set({ sidePanelView: view }),
      
      isLeftSidebarCollapsed: false,
      isRightSidebarCollapsed: true,
      toggleLeftSidebar: () => set((state) => ({ isLeftSidebarCollapsed: !state.isLeftSidebarCollapsed })),
      toggleRightSidebar: () => set((state) => ({ isRightSidebarCollapsed: !state.isRightSidebarCollapsed })),
      setLeftSidebarCollapsed: (collapsed) => set({ isLeftSidebarCollapsed: collapsed }),
      setRightSidebarCollapsed: (collapsed) => set({ isRightSidebarCollapsed: collapsed }),
    }),
    {
      name: "ui-store",
      partialize: (state) => ({
        isLeftSidebarCollapsed: state.isLeftSidebarCollapsed,
        isRightSidebarCollapsed: state.isRightSidebarCollapsed,
      }),
    }
  )
);