// src/components/call/CallScreen.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PhoneOff, Mic, MicOff, Minimize2, Volume2, VolumeX, PhoneIncoming, Signal } from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
import { useCallStore } from "@/stores/useCallStore";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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

  const [speakerMode, setSpeakerMode] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showOverlay = status !== "idle";
  const isIncoming = status === "incoming";

  const partner = users.find((u: any) => u.clerkId === peerId) || selectedUser || null;
  const name = partner?.fullName || peerName || "Unknown";
  const avatar = partner?.imageUrl || peerAvatar || undefined;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    if (isIncoming) return "Incoming call";
    if (status === "calling") return "Ringing";
    if (status === "connecting") return "Connecting";
    if (status === "connected") return formatTime(elapsed);
    return "In call";
  };

  const toggleSpeaker = () => {
    setSpeakerMode(!speakerMode);
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio) => {
      audio.setAttribute('data-output', speakerMode ? 'earpiece' : 'speaker');
    });
  };

  useEffect(() => {
    if (status !== "connected") return;
    
    if ('ProximitySensor' in window || 'ondeviceproximity' in window) {
      const handleProximity = (event: any) => {
        if (event.near || event.value < 5) {
          setSpeakerMode(false);
        }
      };

      window.addEventListener('deviceproximity', handleProximity);
      return () => window.removeEventListener('deviceproximity', handleProximity);
    }
  }, [status]);

  // Lock body scroll when full screen is open
  useEffect(() => {
    if (showOverlay && !minimized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showOverlay, minimized]);

  if (!mounted || !showOverlay || minimized) return null;

  const callContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center overflow-hidden"
        style={{ zIndex: 99999 }}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black" />
        
        {/* Animated blobs */}
        <motion.div
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-violet-600/20 blur-[100px]"
          animate={{ 
            x: [0, 50, 0], 
            y: [0, 30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-violet-600/20 blur-[100px]"
          animate={{ 
            x: [0, -50, 0], 
            y: [0, -30, 0],
            scale: [1.1, 1, 1.1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        {isIncoming && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px]"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-[max(env(safe-area-inset-top),16px)]">
          {/* Call quality indicator */}
          {status === "connected" && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 backdrop-blur-sm"
            >
              <Signal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-zinc-400">HD Voice</span>
            </motion.div>
          )}
          {status !== "connected" && <div />}

          {/* Minimize button */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => actions.setMinimized(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 backdrop-blur-sm text-white hover:bg-zinc-700/50 transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="text-sm">Minimize</span>
          </motion.button>
        </div>

        {/* Main content */}
        <div className="relative w-full max-w-md px-6 text-center text-white">
          {/* Avatar section */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 20 }}
            className="relative mb-8"
          >
            {/* Outer pulsing rings for incoming */}
            {isIncoming && (
              <>
                <motion.div
                  className="absolute inset-0 -m-8 rounded-full border-2 border-violet-500/30"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 -m-8 rounded-full border-2 border-violet-500/30"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                />
              </>
            )}

            {/* Glow effect */}
            <motion.div
              className={`absolute inset-0 -m-4 rounded-full blur-2xl ${
                isIncoming ? "bg-violet-500/30" : 
                status === "connected" ? "bg-violet-500/30" : "bg-yellow-500/20"
              }`}
              animate={{ 
                opacity: [0.4, 0.7, 0.4],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: status === "connected" ? 3 : 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />

            {/* Avatar with ring */}
            <motion.div
              animate={
                status !== "connected"
                  ? { scale: [1, 1.03, 1] }
                  : {}
              }
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <Avatar className={`size-36 mx-auto ring-4 ${
                isIncoming ? "ring-violet-500/60" :
                status === "connected" ? "ring-violet-500/60" : "ring-yellow-500/40"
              } shadow-2xl`}>
                <AvatarImage src={avatar} className="object-cover" />
                <AvatarFallback className="text-4xl bg-zinc-800">{name?.[0] || "U"}</AvatarFallback>
              </Avatar>

              {/* Status badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium ${
                  isIncoming ? "bg-violet-600 text-white" :
                  status === "connected" ? "bg-violet-600 text-white" : "bg-yellow-600 text-black"
                }`}
              >
                {isIncoming ? "Incoming" : status === "connected" ? "Connected" : "Calling"}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Name and status */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl font-bold mb-2">{name}</h2>
            <div className="flex items-center justify-center gap-2">
              {status === "connected" ? (
                <p className="text-lg text-violet-400 font-mono tracking-wider">{formatTime(elapsed)}</p>
              ) : (
                <div className="flex items-center gap-2">
                  <motion.div
                    className={`size-2 rounded-full ${isIncoming ? "bg-violet-500" : "bg-yellow-500"}`}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                  <p className={`text-lg ${isIncoming ? "text-violet-400" : "text-yellow-400"}`}>
                    {getStatusText()}
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >...</motion.span>
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Status indicators */}
          {status === "connected" && (isMuted || !speakerMode) && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center justify-center gap-4 mt-4"
            >
              {isMuted && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20">
                  <MicOff className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">Muted</span>
                </div>
              )}
              {!speakerMode && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50">
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-400">Earpiece</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Control buttons */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-12"
          >
            {isIncoming ? (
              /* Incoming call controls */
              <div className="flex justify-center items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={actions.declineCall}
                    className="p-5 rounded-full bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-500/30"
                    aria-label="Decline"
                  >
                    <PhoneOff className="w-8 h-8" />
                  </motion.button>
                  <span className="text-sm text-zinc-400">Decline</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      actions.acceptCall();
                      actions.setMinimized(false);
                    }}
                    className="p-5 rounded-full bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/30"
                    aria-label="Accept"
                    animate={{
                      boxShadow: [
                        "0 0 0 0 rgba(16, 185, 129, 0.4)",
                        "0 0 0 15px rgba(16, 185, 129, 0)",
                      ],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <PhoneIncoming className="w-8 h-8" />
                  </motion.button>
                  <span className="text-sm text-zinc-400">Accept</span>
                </div>
              </div>
            ) : status === "connected" ? (
              /* Connected call controls */
              <div className="flex justify-center items-center gap-4">
                {/* Speaker */}
                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleSpeaker}
                    className={`p-4 rounded-full transition-all shadow-lg ${
                      speakerMode 
                        ? "bg-violet-600 hover:bg-violet-500 shadow-violet-500/30" 
                        : "bg-zinc-800 hover:bg-zinc-700 shadow-zinc-900/50"
                    }`}
                    aria-label={speakerMode ? "Switch to earpiece" : "Switch to speaker"}
                  >
                    {speakerMode ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  </motion.button>
                  <span className="text-xs text-zinc-400">Speaker</span>
                </div>

                {/* Mute */}
                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={actions.toggleMute}
                    className={`p-4 rounded-full transition-all shadow-lg ${
                      isMuted 
                        ? "bg-red-600 hover:bg-red-500 shadow-red-500/30" 
                        : "bg-zinc-800 hover:bg-zinc-700 shadow-zinc-900/50"
                    }`}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </motion.button>
                  <span className="text-xs text-zinc-400">{isMuted ? "Unmute" : "Mute"}</span>
                </div>

                {/* End call - larger */}
                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={actions.endCall}
                    className="p-5 rounded-full bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-500/30"
                    aria-label="End call"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </motion.button>
                  <span className="text-xs text-zinc-400">End</span>
                </div>
              </div>
            ) : (
              /* Calling/Connecting controls */
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={actions.endCall}
                  className="p-5 rounded-full bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-500/30"
                  aria-label="Cancel call"
                >
                  <PhoneOff className="w-8 h-8" />
                </motion.button>
                <span className="text-sm text-zinc-400">Cancel</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom safe area padding */}
        <div className="absolute bottom-0 left-0 right-0 h-[env(safe-area-inset-bottom)]" />
      </motion.div>
    </AnimatePresence>
  );

  // Render via portal to ensure highest stacking context
  return createPortal(callContent, document.body);
}