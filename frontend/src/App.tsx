// src/App.tsx
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { AuthenticateWithRedirectCallback, useUser } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";

import HomePage from "./pages/home/HomePage";
import AuthCallbackPage from "./pages/auth-callback/AuthCallbackPage";
import MainLayout from "./layout/MainLayout";
import ChatPage from "./pages/chat/ChatPage";
import AlbumPage from "./pages/album/AlbumPage";
import AdminPage from "./pages/admin/AdminPage";
import SearchPage from "@/pages/search/SearchPage";
import FavoritesPage from "@/pages/favorites/FavoritesPage";
import NotFoundPage from "./pages/404/NotFoundPage";
import { AccentToastProvider } from "@/components/AccentToast";
import { useAxiosAuth } from "@/hooks/useAxiosAuth";
import AuthProvider from "@/providers/AuthProvider";
import DownloadsPage from "@/pages/downloads/DownloadsPage";

import CallEngine from "@/components/CallEngine";
import { CallScreen } from "@/components/CallScreen";
import CallNav from "@/components/CallNav";
import RequestNotificationPermission from "./components/RequestNotificationPermission";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { HistoryTracker } from "@/components/HistoryTracker";
import PlaylistPage from "@/pages/playlist/PlaylistPage";
import MobileLibraryPage from "@/pages/library/MobileLibraryPage"; 
import RecentlyPlayedPage from "@/pages/library/RecentlyPlayedPage";
import ProfilePage from "@/pages/profile/ProfilePage";

const LAST_PAGE_KEY = 'vibra_last_page';
const PAGE_RESTORED_KEY = 'vibra_page_restored';

function App() {
  useAxiosAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hasRestored = sessionStorage.getItem(PAGE_RESTORED_KEY);
    
    if (!hasRestored && location.pathname === '/') {
      const lastPage = localStorage.getItem(LAST_PAGE_KEY);
      const cacheableRoutes = ['/chat', '/search', '/favorites', '/downloads', '/library'];
      
      if (lastPage && cacheableRoutes.includes(lastPage)) {
        navigate(lastPage, { replace: true });
      }
      
      sessionStorage.setItem(PAGE_RESTORED_KEY, 'true');
    }
  }, []);

  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "navigation") {
        const url = event.data.url;
        if (url) {
          navigate(url);
        }
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [navigate]);

  return (
    <AuthProvider>
      <AccentToastProvider>
        <OfflineIndicator />
        <HistoryTracker />
        <RequestNotificationPermission />
        <CallEngine myId={user?.id} />
        <CallNav />
        <CallScreen />
        <Routes>
          <Route
            path="/sso-callback"
            element={<AuthenticateWithRedirectCallback signUpForceRedirectUrl={"/auth-callback"} />}
          />
          <Route path="/auth-callback" element={<AuthCallbackPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/albums/:albumId" element={<AlbumPage />} />
            <Route path="/playlists/:id" element={<PlaylistPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            <Route path="/library" element={<MobileLibraryPage />} />
            <Route path="/library/recently-played" element={<RecentlyPlayedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <Toaster />
      </AccentToastProvider>
    </AuthProvider>
  );
}

export default App;