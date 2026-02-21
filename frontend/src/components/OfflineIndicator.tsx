// src/components/OfflineIndicator.tsx
import { useEffect, useState, useRef } from "react";
import { WifiOff, Wifi, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
      
      // Only show "back online" if we were previously offline
      if (wasOfflineRef.current) {
        setShowBackOnline(true);
        // Auto-hide after 3 seconds
        setTimeout(() => setShowBackOnline(false), 3000);
      }
      wasOfflineRef.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
      setShowBackOnline(false);
      wasOfflineRef.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Track initial offline state
    if (!navigator.onLine) {
      wasOfflineRef.current = true;
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const showOfflineBar = !isOnline && !dismissed;

  return (
    <AnimatePresence>
      {/* Offline Bar */}
      {showOfflineBar && (
        <motion.div
          key="offline"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-[120px] md:bottom-[100px] left-0 right-0 z-[100] px-2"
        >
        <div className="bg-violet-500 text-black rounded-lg px-4 py-2 flex items-center justify-between shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-semibold">
              Offline Mode
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                window.location.href = "/downloads";
                setDismissed(true);
              }}
              className="text-xs font-bold underline underline-offset-2"
            >
              My Downloads
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-black/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        </motion.div>
      )}

      {/* Back Online Toast */}
      {showBackOnline && (
        <motion.div
          key="online"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-[120px] md:bottom-[100px] left-0 right-0 z-[100] px-2"
        >
          <div className="max-w-screen-3xl mx-auto">
            <div className="bg-green-500 text-black rounded-lg px-4 py-1 flex items-center justify-between shadow-lg shadow-black/20 relative">
              {/* Text container */}
              <div className="flex items-center gap-3 w-full md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:justify-center">
                <Wifi className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium text-center">
                  You're back online
                </span>
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => setShowBackOnline(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;