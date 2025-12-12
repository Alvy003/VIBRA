import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show banner if already offline
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-md"
        >
        <div className={`
          ${isOnline 
            ? 'bg-violet-600/90 backdrop-blur-sm' 
            : 'bg-zinc-800/90 backdrop-blur-sm'
          }
          text-white rounded-xl shadow-2xl p-4 flex items-center gap-3
        `}>
          <div className="p-2 bg-white/20 rounded-lg">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-violet-100" />
            ) : (
              <WifiOff className="w-5 h-5 text-zinc-200" />
            )}
          </div>

          <div className="flex-1">
            <p className="font-semibold text-sm">
              {isOnline ? "Back Online" : "You're Offline"}
            </p>
            <p className="text-xs text-white/90">
              {isOnline
                ? "Connection restored"
                : "Use downloaded songs"}
            </p>
          </div>
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};