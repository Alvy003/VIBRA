// src/hooks/useAxiosAuth.ts
import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { axiosInstance } from "@/lib/axios";

// ✅ named export
export const useAxiosAuth = () => {
  const { getToken, isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    const id = axiosInstance.interceptors.request.use(
      async (config) => {
        if (!isLoaded) return config;
        if (!isSignedIn) return config;

        try {
          const token = await getToken({ template: "api" }).catch(() => null);
          if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (err) {
          // ignore error, let request continue without token
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axiosInstance.interceptors.request.eject(id);
    };
  }, [getToken, isSignedIn, isLoaded]);
};
