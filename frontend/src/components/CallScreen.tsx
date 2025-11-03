import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PhoneOff, Mic, MicOff, X, Phone, Volume2, VolumeX } from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
import { useCallStore } from "@/stores/useCallStore";
import { useEffect, useState } from "react";

export function CallScreen() {
  const users = useChatStore((s) => s.users);
  const selectedUser = useChatStore((s) => s.selectedUser);

  const status = useCallStore((s) => s.status);
  const peerId = useCallStore((s) => s.peerId);
  const isMuted = useCallStore((s) => s.isMuted);
  const minimized = useCallStore((s) => s.minimized);
  const elapsed = useCallStore((s) => s.elapsed);
  const peerName = useCallStore((s) => s.peerName);
  const peerAvatar = useCallStore((s) => s.peerAvatar);
  const actions = useCallStore((s) => s.actions);

  // ✅ Speaker mode state (true = speaker, false = earpiece)
  const [speakerMode, setSpeakerMode] = useState(true);

  const showOverlay = status !== "idle";
  const isIncoming = status === "incoming";
  const isActive = status === "calling" || status === "connecting" || status === "connected";

  const partner = users.find((u: any) => u.clerkId === peerId) || selectedUser || null;
  const name = partner?.fullName || peerName || "Unknown";
  const avatar = partner?.imageUrl || peerAvatar || undefined;

  // ✅ Format timer
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    if (isIncoming) return "Incoming call…";
    if (status === "calling") return "Ringing…";
    if (status === "connecting") return "Connecting…";
    if (status === "connected") return formatTime(elapsed);
    return "In call";
  };

  // ✅ Toggle speaker mode
  const toggleSpeaker = () => {
    setSpeakerMode(!speakerMode);
    
    // On mobile, we can't actually route to earpiece via WebRTC
    // But we can set audio element properties as hints
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => {
      // This is a hint but won't work on all browsers
      // Real earpiece routing requires native APIs
      if (!speakerMode) {
        audio.setAttribute('data-output', 'earpiece');
      } else {
        audio.setAttribute('data-output', 'speaker');
      }
    });
  };

  // ✅ Proximity sensor detection (experimental - not widely supported)
  useEffect(() => {
    if (status !== "connected") return;
    
    // Try to use proximity sensor if available (mostly Android Chrome)
    if ('ProximitySensor' in window || 'ondeviceproximity' in window) {
      const handleProximity = (event: any) => {
        // If phone is near face, switch to earpiece
        if (event.near || event.value < 5) {
          setSpeakerMode(false);
        }
      };

      window.addEventListener('deviceproximity', handleProximity);
      return () => window.removeEventListener('deviceproximity', handleProximity);
    }
  }, [status]);

  if (!showOverlay) return null;

  return (
    <>
      {/* Mini bar */}
      <AnimatePresence>
        {minimized && isActive && (
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 p-3 pt-[calc(env(safe-area-inset-top)+10px)]"
          >
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="size-8">
                  <AvatarImage src={avatar} />
                  <AvatarFallback>{name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{name}</p>
                  <p className="text-xs text-zinc-400">
                    {status === "connected" ? formatTime(elapsed) : "Connecting..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* ✅ Speaker toggle in mini bar */}
                {status === "connected" && (
                  <button
                    onClick={toggleSpeaker}
                    className={`p-2 rounded-full transition-colors ${
                      speakerMode ? "bg-violet-600 hover:bg-violet-500" : "bg-zinc-700 hover:bg-zinc-600"
                    }`}
                    title={speakerMode ? "Switch to earpiece" : "Switch to speaker"}
                  >
                    {speakerMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                )}
                {status === "connected" && (
                  <button
                    onClick={actions.toggleMute}
                    className={`p-2 rounded-full transition-colors ${
                      isMuted ? "bg-red-600 hover:bg-red-500" : "bg-zinc-700 hover:bg-zinc-600"
                    }`}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => actions.setMinimized(false)}
                  className="p-2 rounded-full bg-violet-600 hover:bg-violet-500 transition-colors"
                  title="Open"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={actions.endCall}
                  className="p-2 rounded-full bg-red-600 hover:bg-red-500 transition-colors"
                  title="End"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full overlay */}
      <AnimatePresence>
        {!minimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex items-center justify-center"
          >
            {/* Top: minimize button */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-end gap-2 p-3 pt-[calc(env(safe-area-inset-top)+10px)]">
              <button
                onClick={() => actions.setMinimized(true)}
                className="px-3 py-2 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700 transition-colors ring-1 ring-white/10"
                title="Minimize"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="w-full max-w-md px-6 text-center text-white">
              {/* Animated avatar */}
              <div className="relative mb-8">
                <motion.div
                  className="absolute inset-0 rounded-full bg-violet-600/20 blur-3xl"
                  animate={{ 
                    opacity: status === "connected" ? [0.4, 0.7, 0.4] : [0.3, 0.6, 0.3],
                    scale: status === "connected" ? [1, 1.06, 1] : [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: status === "connected" ? 3 : 1.5, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                />
                <motion.div
                  animate={
                    status !== "connected"
                      ? { scale: [1, 1.05, 1] }
                      : {}
                  }
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Avatar className="size-32 mx-auto ring-4 ring-violet-500/40 relative">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="text-2xl">{name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </motion.div>
              </div>

              <h2 className="text-2xl font-bold mb-1">{name}</h2>
              <p className="text-zinc-300 text-lg font-mono">{getStatusText()}</p>

              {/* Connection indicator */}
              {status === "connected" && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-green-500"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-sm text-zinc-400">Connected</span>
                </div>
              )}

              {/* Status indicators */}
              {status === "connected" && (
                <div className="flex items-center justify-center gap-4 mt-2 text-sm text-zinc-400">
                  {isMuted && (
                    <div className="flex items-center gap-1">
                      <MicOff className="w-4 h-4 text-red-400" />
                      <span className="text-red-400">Muted</span>
                    </div>
                  )}
                  {!speakerMode && (
                    <div className="flex items-center gap-1">
                      <VolumeX className="w-4 h-4" />
                      <span>Earpiece</span>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom controls */}
              <div className="flex justify-center gap-6 mt-10">
                {isIncoming ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={actions.declineCall}
                      className="p-4 rounded-full bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-900/50"
                      aria-label="Decline"
                    >
                      <PhoneOff className="w-8 h-8" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        actions.acceptCall();
                        actions.setMinimized(false);
                      }}
                      className="p-4 rounded-full bg-green-600 hover:bg-green-500 transition-colors shadow-lg shadow-green-900/50"
                      aria-label="Accept"
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(34, 197, 94, 0.4)",
                          "0 0 0 10px rgba(34, 197, 94, 0)",
                        ],
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Phone className="w-8 h-8" />
                    </motion.button>
                  </>
                ) : status === "connected" ? (
                  <>
                    {/* ✅ Speaker toggle button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleSpeaker}
                      className={`p-4 rounded-full transition-colors shadow-lg ${
                        speakerMode 
                          ? "bg-violet-600 hover:bg-violet-500 shadow-violet-900/50" 
                          : "bg-zinc-700 hover:bg-zinc-600 shadow-zinc-900/50"
                      }`}
                      aria-label={speakerMode ? "Switch to earpiece" : "Switch to speaker"}
                    >
                      {speakerMode ? <Volume2 className="w-8 h-8" /> : <VolumeX className="w-8 h-8" />}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={actions.toggleMute}
                      className={`p-4 rounded-full transition-colors shadow-lg ${
                        isMuted 
                          ? "bg-red-600 hover:bg-red-500 shadow-red-900/50" 
                          : "bg-zinc-700 hover:bg-zinc-600 shadow-zinc-900/50"
                      }`}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={actions.endCall}
                      className="p-4 rounded-full bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-900/50"
                      aria-label="End"
                    >
                      <PhoneOff className="w-8 h-8" />
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={actions.endCall}
                    className="p-4 rounded-full bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-900/50"
                    aria-label="Cancel call"
                  >
                    <PhoneOff className="w-8 h-8" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}