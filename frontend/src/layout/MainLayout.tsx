import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Outlet } from "react-router-dom";
import LeftSidebar from "./components/LeftSidebar";
import AudioPlayer from "./components/AudioPlayer";
import { PlaybackControls } from "./components/PlaybackControls";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RightPanel from "./components/RightPanel";

const MainLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Show swipe hint only once on mobile
  useEffect(() => {
    if (isMobile && !localStorage.getItem("swipeHintShown")) {
      setShowHint(true);
      localStorage.setItem("swipeHintShown", "true");

      setTimeout(() => setShowHint(false), 4500); // auto-hide after 4.5s
    }
  }, [isMobile]);

  return (
    <div className="h-screen bg-black text-white flex flex-col relative">
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 flex h-full overflow-hidden p-2"
      >
        <AudioPlayer />

        {/* Left Sidebar */}
        <ResizablePanel
          defaultSize={isMobile ? 22 : 20}
          minSize={isMobile ? 0 : 0}
          maxSize={isMobile ? 24 : 25}
          collapsible
        >
          <LeftSidebar />
        </ResizablePanel>

        <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />

        {/* Main Content */}
        <ResizablePanel defaultSize={isMobile ? 100 : 60} minSize={40}>
          <Outlet />
        </ResizablePanel>

        {!isMobile && (
          <>
            <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />
            <ResizablePanel defaultSize={20} minSize={0} maxSize={25}>
            <RightPanel /> 
          </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Sticky playback controls */}
      <div className="border-t border-neutral-800 bg-black">
        <PlaybackControls />
      </div>

      {/* One-time swipe hint overlay (mobile only) */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.5 }}
            className="absolute top-1/2 left-1/4 -translate-y-1/2 bg-black text-white px-3 py-1 rounded-lg text-sm shadow-lg"
          >
            ← Drag to resize the sidebar
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
