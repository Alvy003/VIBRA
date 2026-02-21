// src/App.tsx
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { AuthenticateWithRedirectCallback, useUser } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";
import { useEffect, lazy, Suspense } from "react";

import MainLayout from "./layout/MainLayout";
import { AccentToastProvider } from "@/components/AccentToast";
import { useAxiosAuth } from "@/hooks/useAxiosAuth";

import CallEngine from "@/components/CallEngine";
import { CallScreen } from "@/components/CallScreen";
import CallNav from "@/components/CallNav";
import RequestNotificationPermission from "./components/RequestNotificationPermission";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { HistoryTracker } from "@/components/HistoryTracker";
import ErrorBoundary from "@/components/ErrorBoundary";


// ─── Lazy loaded pages ───
const HomePage = lazy(() => import("./pages/home/HomePage"));
const AuthCallbackPage = lazy(() => import("./pages/auth-callback/AuthCallbackPage"));
const ChatPage = lazy(() => import("./pages/chat/ChatPage"));
const AlbumPage = lazy(() => import("./pages/album/AlbumPage"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const SearchPage = lazy(() => import("@/pages/search/SearchPage"));
const FavoritesPage = lazy(() => import("@/pages/favorites/FavoritesPage"));
const NotFoundPage = lazy(() => import("./pages/404/NotFoundPage"));
const DownloadsPage = lazy(() => import("@/pages/downloads/DownloadsPage"));
const PlaylistPage = lazy(() => import("@/pages/playlist/PlaylistPage"));
const MobileLibraryPage = lazy(() => import("@/pages/library/MobileLibraryPage"));
const RecentlyPlayedPage = lazy(() => import("@/pages/library/RecentlyPlayedPage"));
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));
const LyricsPage = lazy(() => import("@/pages/lyrics/LyricsPage"));
const ExternalAlbumPage = lazy(() => import("@/pages/external/ExternalAlbumPage"));
const ExternalPlaylistPage = lazy(() => import("@/pages/external/ExternalPlaylistPage"));
const ExternalArtistPage = lazy(() => import("@/pages/external/ExternalArtistPage"));

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
      <AccentToastProvider>
        <ErrorBoundary>
        <OfflineIndicator />
        <HistoryTracker />
        <RequestNotificationPermission />
        <CallEngine myId={user?.id} />
        <CallNav />
        <CallScreen />
          <Suspense fallback={null}>
            <Routes>
              <Route
                path="/sso-callback"
                element={<AuthenticateWithRedirectCallback signUpForceRedirectUrl={"/auth-callback"} />}
              />
              <Route path="/auth-callback" element={<AuthCallbackPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/lyrics" element={<LyricsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/albums/:albumId" element={<AlbumPage />} />
                <Route path="/playlists/:id" element={<PlaylistPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/albums/external/:source/:id" element={<ExternalAlbumPage />} />
                <Route path="/playlists/external/:source/:id" element={<ExternalPlaylistPage />} />
                <Route path="/artists/external/:source/:id" element={<ExternalArtistPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/downloads" element={<DownloadsPage />} />
                <Route path="/library" element={<MobileLibraryPage />} />
                <Route path="/library/recently-played" element={<RecentlyPlayedPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
         </ErrorBoundary>
        <Toaster />
      </AccentToastProvider>
  );
}

export default App;