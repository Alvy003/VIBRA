// src/stores/useAuthStore.ts
import { create } from "zustand";
import { axiosInstance } from "@/lib/axios";

interface AuthState {
  token: string | null;
  isAdmin: boolean;
  setToken: (token: string | null) => void;
  checkAdminStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAdmin: false,

  setToken: (token) => {
    if (token) {
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axiosInstance.defaults.headers.common["Authorization"];
    }
    set({ token });
  },

  checkAdminStatus: async () => {
    try {
      const res = await axiosInstance.get("/admin/check");
      set({ isAdmin: res.data?.isAdmin || false });
    } catch (err) {
      console.error("Failed to check admin status", err);
      set({ isAdmin: false });
    }
  },
}));
