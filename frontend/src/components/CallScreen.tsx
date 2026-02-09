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

  // Lock body scroll
  useEffect(() => {
    if (showOverlay && !minimized) {
      document.body.style.overflow = 'hidden';
      // Prevent overscroll/rubber-banding on iOS
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [showOverlay, minimized]);

  if (!mounted || !showOverlay || minimized) return null;

  const callContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black touch-none"
        style={{ 
          // Max safe integer z-index to ensure it's always on top
          zIndex: 2147483647 
        }}
      >
        {/* Static Background - Removed animations, added solid bg-black fallback */}
        <div className="absolute inset-0 bg-zinc-950">
           <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black opacity-90" />
           {/* Static Blobs - much lighter on GPU than animated ones */}
           <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-violet-900/20 blur-[60px]" />
           <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-violet-900/10 blur-[60px]" />
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-[max(env(safe-area-inset-top),16px)] z-10">
          {status === "connected" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 backdrop-blur-sm border border-white/5">
              <Signal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-zinc-400">HD</span>
            </div>
          )}
          {status !== "connected" && <div />}

          <button
            onClick={() => actions.setMinimized(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 active:bg-zinc-700/50 transition-colors border border-white/5"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="text-sm">Minimize</span>
          </button>
        </div>

        {/* Main content */}
        <div className="relative w-full max-w-md px-6 text-center text-white z-10 flex flex-col items-center">
          
          {/* Avatar section - Simplified */}
          <div className="relative mb-8">
            {/* Simple static glow instead of pulsing animation */}
            <div className={`absolute inset-0 -m-4 rounded-full blur-2xl opacity-40 ${
                isIncoming ? "bg-violet-500" : 
                status === "connected" ? "bg-violet-900" : "bg-yellow-600"
              }`} 
            />

            {/* Avatar */}
            <Avatar className={`size-36 mx-auto ring-4 ${
              isIncoming ? "ring-violet-500/60" :
              status === "connected" ? "ring-violet-500/60" : "ring-yellow-500/40"
            } shadow-2xl relative bg-zinc-900`}>
              <AvatarImage src={avatar} className="object-cover" />
              <AvatarFallback className="text-4xl bg-zinc-800">{name?.[0] || "U"}</AvatarFallback>
            </Avatar>

            {/* Simple Status Badge */}
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium border border-white/10 ${
              isIncoming ? "bg-violet-600 text-white" :
              status === "connected" ? "bg-violet-950 text-violet-200" : "bg-yellow-900 text-yellow-200"
            }`}>
              {isIncoming ? "Incoming" : status === "connected" ? "Connected" : "Calling"}
            </div>
          </div>

          {/* Name and status */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-2 tracking-tight">{name}</h2>
            <div className="flex items-center justify-center gap-2">
              <p className={`text-lg font-medium ${
                status === "connected" ? "text-violet-400 font-mono" : 
                isIncoming ? "text-violet-300" : "text-yellow-400"
              }`}>
                {getStatusText()}
              </p>
            </div>
          </div>

          {/* Connected Controls - Mute/Speaker Status */}
          {status === "connected" && (
            <div className="flex items-center justify-center gap-3 mt-2 mb-8 min-h-[32px]">
              {(isMuted) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 text-red-400">
                  <MicOff className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Muted</span>
                </div>
              )}
              {(!speakerMode) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-400">
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Earpiece</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons Area */}
          <div className="mt-8 w-full">
            {isIncoming ? (
              <div className="flex justify-center items-center gap-12">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={actions.declineCall}
                    className="p-5 rounded-full bg-red-600/90 active:bg-red-700 text-white transition-colors"
                  >
                    <PhoneOff className="w-8 h-8" />
                  </button>
                  <span className="text-xs text-zinc-400">Decline</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => {
                      actions.acceptCall();
                      actions.setMinimized(false);
                    }}
                    className="p-5 rounded-full bg-emerald-600/90 active:bg-emerald-700 text-white transition-colors animate-pulse"
                  >
                    <PhoneIncoming className="w-8 h-8" />
                  </button>
                  <span className="text-xs text-zinc-400">Accept</span>
                </div>
              </div>
            ) : status === "connected" ? (
              <div className="flex justify-center items-center gap-6">
                {/* Speaker */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={toggleSpeaker}
                    className={`p-4 rounded-full transition-colors ${
                      speakerMode 
                        ? "bg-violet-600 text-white" 
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {speakerMode ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  </button>
                  <span className="text-xs text-zinc-500">Speaker</span>
                </div>

                {/* Mute */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={actions.toggleMute}
                    className={`p-4 rounded-full transition-colors ${
                      isMuted 
                        ? "bg-white text-black" 
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                  <span className="text-xs text-zinc-500">Mute</span>
                </div>

                {/* End Call */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={actions.endCall}
                    className="p-4 rounded-full bg-red-600/90 active:bg-red-700 text-white transition-colors"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                  <span className="text-xs text-zinc-500">End</span>
                </div>
              </div>
            ) : (
              /* Calling / Connecting */
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={actions.endCall}
                  className="p-5 rounded-full bg-red-600/90 active:bg-red-700 text-white transition-colors"
                >
                  <PhoneOff className="w-8 h-8" />
                </button>
                <span className="text-sm text-zinc-400">Cancel</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom safe area padding */}
        <div className="absolute bottom-0 left-0 right-0 h-[env(safe-area-inset-bottom)]" />
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(callContent, document.body);
}