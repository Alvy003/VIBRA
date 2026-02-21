import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { useMusicStore } from "@/stores/useMusicStore";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { getToken, userId, isSignedIn, isLoaded } = useAuth();
  const hasInitializedRef = useRef(false);

  const { setToken, checkAdminStatus } = useAuthStore();
  const { initSocket, disconnectSocket } = useChatStore();
  const { fetchLikedSongs, clearLikedSongs } = useMusicStore();

  const initAuth = useCallback(async () => {
    try {
      if (!isLoaded) return;

      if (!isSignedIn) {
        if (navigator.onLine) {
          setToken(null);
          clearLikedSongs();
        }
        return;
      }

      const token = await getToken({ template: "api" }).catch(() => null);
      setToken(token);

      if (token) {
        // Run these in parallel, non-blocking
        Promise.allSettled([
          checkAdminStatus(),
          fetchLikedSongs(),
        ]);
        if (userId) initSocket(userId);
      }

      hasInitializedRef.current = true;
    } catch (error) {
      console.error("Error in auth provider", error);
      if (navigator.onLine) {
        setToken(null);
        clearLikedSongs();
      }
    }
  }, [
    isSignedIn,
    isLoaded,
    userId,
    getToken,
    setToken,
    checkAdminStatus,
    initSocket,
    fetchLikedSongs,
    clearLikedSongs,
  ]);

  useEffect(() => {
    initAuth();
    return () => disconnectSocket();
  }, [initAuth, disconnectSocket]);

  // Re-initialize auth when coming back online
  useEffect(() => {
    const handleOnline = () => {
      setTimeout(() => initAuth(), 1000);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [initAuth]);

  // Always render children immediately — no loading spinner
  return <>{children}</>;
};

export default AuthProvider;