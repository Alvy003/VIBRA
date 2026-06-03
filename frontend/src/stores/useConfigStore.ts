import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

interface SystemConfig {
  apkLink: string;
  currentVersion: string;
  maintenanceMode: boolean;
  forceUpdate: boolean;
}

interface ConfigStore {
  config: SystemConfig | null;
  isLoading: boolean;
  fetchConfig: () => Promise<void>;
  updateConfig: (data: Partial<SystemConfig>) => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  isLoading: false,

  fetchConfig: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/config");
      set({ config: res.data });
    } catch (error) {
      console.error("Failed to fetch system config:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateConfig: async (data) => {
    try {
      const res = await axiosInstance.put("/config", data);
      set({ config: res.data });
    } catch (error) {
      console.error("Failed to update system config:", error);
      throw error;
    }
  },
}));
