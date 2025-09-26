// src/providers/AuthProvider.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Loader } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { useMusicStore } from "@/stores/useMusicStore";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { getToken, userId, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);

  const { setToken, checkAdminStatus } = useAuthStore();
  const { initSocket, disconnectSocket } = useChatStore();
  const { fetchLikedSongs, clearLikedSongs } = useMusicStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!isSignedIn) {
          setToken(null);
          clearLikedSongs(); // 🧹 reset likes on logout
          return;
        }

        const token = await getToken({ template: "api" }).catch(() => null);
        setToken(token);

        if (token) {
          await checkAdminStatus();
          await fetchLikedSongs(); // ✅ preload liked songs
          if (userId) initSocket(userId); // ✅ init chat socket
        }
      } catch (error) {
        console.error("Error in auth provider", error);
        setToken(null);
        clearLikedSongs();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    return () => disconnectSocket();
  }, [
    isSignedIn,
    userId,
    getToken,
    setToken,
    checkAdminStatus,
    initSocket,
    disconnectSocket,
    fetchLikedSongs,
    clearLikedSongs,
  ]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader className="size-8 animate-spin" style={{ color: "#6A0DAD" }} />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;
