// App.tsx
import { Route, Routes } from "react-router-dom";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";

import HomePage from "./pages/home/HomePage";
import AuthCallbackPage from "./pages/auth-callback/AuthCallbackPage";
import MainLayout from "./layout/MainLayout";
import ChatPage from "./pages/chat/ChatPage";
import AlbumPage from "./pages/album/AlbumPage";
import AdminPage from "./pages/admin/AdminPage";
import SearchPage from "@/pages/search/SearchPage";
import FavoritesPage from "@/pages/favorites/FavoritesPage";
import NotFoundPage from "./pages/404/NotFoundPage";

import { useAxiosAuth } from "@/hooks/useAxiosAuth";
import AuthProvider from "@/providers/AuthProvider"; 

function App() {
  // sets up axios interceptor once
  useAxiosAuth();

  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/sso-callback"
          element={<AuthenticateWithRedirectCallback signUpForceRedirectUrl={"/auth-callback"} />}
        />
        <Route path="/auth-callback" element={<AuthCallbackPage />} />
        <Route path="/admin" element={<AdminPage />} />

        {/* Layout includes AudioPlayer, sidebar, topbar */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/albums/:albumId" element={<AlbumPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
