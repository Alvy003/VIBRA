// src/components/call/CallMiniBar.tsx
import { motion, PanInfo } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PhoneOff, Mic, MicOff, Phone, Volume2, VolumeX, GripVertical } from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
import { useCallStore } from "@/stores/useCallStore";
import { useState, useEffect, useRef } from "react";

export function CallMiniBar() {
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 80 });
  const constraintsRef = useRef<HTMLDivElement>(null);

  const isActive = status === "calling" || status === "connecting" || status === "connected";
  const showMiniBar = minimized && isActive;

  const partner = users.find((u: any) => u.clerkId === peerId) || selectedUser || null;
  const name = partner?.fullName || peerName || "Unknown";
  const avatar = partner?.imageUrl || peerAvatar || undefined;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleSpeaker = () => setSpeakerMode(!speakerMode);

  // Save position to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('callWidgetPosition');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(parsed);
      } catch {}
    }
  }, []);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const newX = position.x + info.offset.x;
    const newY = position.y + info.offset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - (isExpanded ? 200 : 64);
    const maxY = window.innerHeight - 64;
    
    const constrainedPos = {
      x: Math.max(8, Math.min(newX, maxX)),
      y: Math.max(8, Math.min(newY, maxY)),
    };
    
    setPosition(constrainedPos);
    localStorage.setItem('callWidgetPosition', JSON.stringify(constrainedPos));
  };

  if (!showMiniBar) return null;

  return (
    <>
      {/* Invisible constraints container */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 9998 }} />
      
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          x: position.x,
          y: position.y,
        }}
        exit={{ scale: 0, opacity: 0 }}
        whileDrag={{ scale: 1.05 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed touch-none select-none cursor-grab active:cursor-grabbing"
        style={{ 
          zIndex: 9999,
          top: 0,
          left: 0,
        }}
        onDoubleClick={() => actions.setMinimized(false)}
      >
        {/* Main floating widget */}
        <motion.div
          layout
          className={`
            relative overflow-hidden rounded-2xl shadow-2xl
            ${isExpanded ? 'w-52' : 'w-auto'}
          `}
          style={{
            background: 'linear-gradient(135deg, rgba(39, 39, 42, 0.98) 0%, rgba(24, 24, 27, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: `
              0 25px 50px -12px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(255, 255, 255, 0.05),
              ${status === 'connected' ? '0 0 30px -5px rgba(16, 185, 129, 0.3)' : '0 0 30px -5px rgba(234, 179, 8, 0.3)'}
            `,
          }}
        >
          {/* Glow effect based on status */}
          <div 
            className={`absolute inset-0 opacity-20 ${
              status === 'connected' ? 'bg-gradient-to-br from-violet-500 to-transparent' : 
              'bg-gradient-to-br from-yellow-500 to-transparent'
            }`} 
          />

          {/* Content */}
          <div className="relative p-2">
            {isExpanded ? (
              /* Expanded View */
              <div className="flex flex-col gap-2">
                {/* Header with avatar and info */}
                <div 
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setIsExpanded(false)}
                >
                  {/* Avatar with status ring */}
                  <div className="relative">
                    <motion.div
                      className={`absolute -inset-1 rounded-full ${
                        status === 'connected' ? 'bg-violet-500/30' : 'bg-yellow-500/30'
                      }`}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <Avatar className={`size-10 ring-2 ${
                      status === 'connected' ? 'ring-violet-500/60' : 'ring-yellow-500/60'
                    }`}>
                      <AvatarImage src={avatar} />
                      <AvatarFallback className="bg-zinc-700 text-xs">{name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{name}</p>
                    <div className="flex items-center gap-1.5">
                      <motion.span 
                        className={`size-1.5 rounded-full ${
                          status === 'connected' ? 'bg-violet-400' : 'bg-yellow-400'
                        }`}
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span className={`text-xs font-mono ${
                        status === 'connected' ? 'text-violet-400' : 'text-yellow-400'
                      }`}>
                        {status === 'connected' ? formatTime(elapsed) : 
                         status === 'calling' ? 'Calling' : 'Connecting'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  {status === 'connected' && (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); toggleSpeaker(); }}
                        className={`p-2 rounded-full transition-all ${
                          speakerMode 
                            ? 'bg-violet-600 hover:bg-violet-500' 
                            : 'bg-zinc-700 hover:bg-zinc-600'
                        }`}
                      >
                        {speakerMode ? <Volume2 className="w-3.5 h-3.5 text-white" /> : <VolumeX className="w-3.5 h-3.5 text-white" />}
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); actions.toggleMute(); }}
                        className={`p-2 rounded-full transition-all ${
                          isMuted 
                            ? 'bg-red-600 hover:bg-red-500' 
                            : 'bg-zinc-700 hover:bg-zinc-600'
                        }`}
                      >
                        {isMuted ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-white" />}
                      </motion.button>
                    </>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); actions.setMinimized(false); }}
                    className="p-2 rounded-full bg-violet-600 hover:bg-violet-500 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 text-white" />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); actions.endCall(); }}
                    className="p-2 rounded-full bg-red-600 hover:bg-red-500 transition-all"
                  >
                    <PhoneOff className="w-3.5 h-3.5 text-white" />
                  </motion.button>
                </div>
              </div>
            ) : (
              /* Compact View - Just avatar pill */
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setIsExpanded(true)}
              >
                {/* Avatar with animated ring */}
                <div className="relative">
                  <motion.div
                    className={`absolute -inset-0.5 rounded-full ${
                      status === 'connected' ? 'bg-violet-500' : 'bg-yellow-500'
                    }`}
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <Avatar className="size-12 relative ring-2 ring-zinc-800">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="bg-zinc-700 text-sm">{name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  
                  {/* Timer badge */}
                  <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    status === 'connected' 
                      ? 'bg-violet-600 text-white' 
                      : 'bg-yellow-600 text-black'
                  }`}>
                    {status === 'connected' ? formatTime(elapsed) : '...'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drag indicator */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 opacity-30">
            <GripVertical className="w-3 h-3 text-white" />
          </div>
        </motion.div>

        {/* Quick action buttons when collapsed (always visible) */}
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1"
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); actions.endCall(); }}
              className="p-1.5 rounded-full bg-red-600 hover:bg-red-500 shadow-lg"
            >
              <PhoneOff className="w-3 h-3 text-white" />
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}