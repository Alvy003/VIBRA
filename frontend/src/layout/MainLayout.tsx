// src/layout/MainLayout.tsx
import { Outlet } from "react-router-dom";
import LeftSidebar from "./components/LeftSidebar";
import AudioPlayer from "./components/AudioPlayer";
import { PlaybackControls } from "./components/PlaybackControls";
import { useEffect, useState } from "react";
import RightSidebar from "./components/RightSidebar";
import BottomNav from "./components/BottomNav";
import MiniPlayer from "./components/MiniPlayer";
import { useUIStore } from "@/stores/useUIStore";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import { CallMiniBar } from "@/components/CallMiniBar";
import { CallScreen } from "@/components/CallScreen";

const LEFT_COLLAPSED_WIDTH = 72;  // 48px image + 24px padding
const LEFT_EXPANDED_WIDTH = 280;
const RIGHT_COLLAPSED_WIDTH = 40;  // Just arrow button
const RIGHT_EXPANDED_WIDTH = 280;

const MainLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { isLeftSidebarCollapsed, isRightSidebarCollapsed } = useUIStore();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="h-[100dvh] bg-zinc-900 text-white flex flex-col overflow-hidden">
        <AudioPlayer />
        
        <main className="flex-1 overflow-hidden p-0">
          <Outlet />
        </main>

        <MiniPlayer />
        <BottomNav />

        <AnimatePresence>
          <CallMiniBar />
        </AnimatePresence>

        <CallScreen />
      </div>
    );
  }

  // Desktop Layout with fixed pixel widths
  return (
    <div className="h-screen bg-black text-white flex flex-col">
      <AudioPlayer />
      
      <div className="flex-1 flex overflow-hidden p-2 gap-2">
        {/* Left Sidebar */}
        <div 
          className="shrink-0 transition-all duration-300 ease-out"
          style={{ 
            width: isLeftSidebarCollapsed ? LEFT_COLLAPSED_WIDTH : LEFT_EXPANDED_WIDTH 
          }}
        >
          <LeftSidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-hidden rounded-lg">
          <Outlet />
        </main>

        {/* Right Sidebar */}
        <div 
          className={cn(
            "shrink-0 transition-all duration-300 ease-out",
          )}
          style={{ 
            width: isRightSidebarCollapsed ? RIGHT_COLLAPSED_WIDTH : RIGHT_EXPANDED_WIDTH 
          }}
        >
          <RightSidebar />
        </div>
      </div>

      {/* Desktop Playback Controls */}
      <div className="border-t border-zinc-800/50 bg-black">
        <PlaybackControls />
      </div>

      <AnimatePresence>
          <CallMiniBar />
      </AnimatePresence>

      <CallScreen />
      
    </div>
  );
};

export default MainLayout;