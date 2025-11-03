import Topbar from "@/components/Topbar";
import { useChatStore } from "@/stores/useChatStore";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useRef, useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import UsersList from "./components/UsersList";
import ChatHeader from "./components/ChatHeader";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import MessageInput from "./components/MessageInput";
import { ArrowDown, Play, Pause, PhoneIncoming, PhoneOutgoing, PhoneMissed, Trash2, AlertTriangle } from "lucide-react";
import { axiosInstance } from "@/lib/axios";

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const API_ORIGIN =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : window.location.origin;

function toAbsoluteVoiceUrl(url?: string | null) {
  if (!url) return "";
  
  if (/^https?:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      if (u.pathname.includes('/uploads/voice/')) {
        const filename = u.pathname.split('/').pop();
        return `${API_ORIGIN}/uploads/voice/${filename}`;
      }
      return url;
    } catch {
      return url;
    }
  }
  
  if (url.startsWith("/uploads")) return `${API_ORIGIN}${url}`;
  if (url.startsWith("uploads")) return `${API_ORIGIN}/${url}`;
  
  return url;
}

// ✅ Custom Delete Dialog
function DeleteDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = "Delete Message",
  message = "Are you sure you want to delete this message? This action cannot be undone."
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{title}</h3>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="flex gap-3 p-6 pt-4 bg-zinc-900/50">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ✅ Desktop delete menu
function DeleteMenu({ 
  onDelete,
  position 
}: { 
  onDelete: () => void;
  onClose: () => void;
  position: { x: number; y: number };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-50 min-w-[140px]"
      style={{ top: position.y, left: position.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onDelete}
        className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-zinc-700 transition-colors text-red-400 text-sm"
      >
        <Trash2 className="w-4 h-4" />
        <span className="hidden md:inline">Delete message</span>
      </button>
    </motion.div>
  );
}

function CallMessage({ 
  type, 
  mine, 
  timestamp 
}: { 
  type: "call_started" | "call_missed" | "call_declined";
  mine: boolean;
  timestamp: string;
}) {
  const getIcon = () => {
    if (type === "call_missed") {
      return <PhoneMissed className={`w-4 h-4 ${mine ? "text-orange-500" : "text-red-400"}`} />;
    }
    if (type === "call_declined") {
      return <PhoneMissed className={`w-4 h-4 ${mine ? "text-orange-300" : "text-orange-400"}`} />;
    }
    if (mine) {
      return <PhoneOutgoing className="w-4 h-4 text-teal-300" />;
    }
    return <PhoneIncoming className="w-4 h-4 text-green-400" />;
  };

  const getText = () => {
    if (type === "call_missed") return "Missed call";
    if (type === "call_declined") return "Declined call";
    return "Voice call";
  };

  const getTextColor = () => mine ? "text-white/90": "text-white/80";

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-2 ${getTextColor()} font-medium`}>
        {getIcon()}
        <span className="text-sm">{getText()}</span>
      </div>
      <span className={`text-[10px] ${mine ? "text-white/60" : "text-zinc-400"} text-right`}>
        {formatTime(timestamp)}
      </span>
    </div>
  );
}

function VoiceMessage({
  url,
  mine,
  initialDur,
  messageId,
  timestamp,
}: {
  url: string;
  mine: boolean;
  initialDur?: number;
  messageId?: string;
  timestamp: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [dur, setDur] = useState(initialDur || 0);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const src = toAbsoluteVoiceUrl(url);
  const hasPatchedRef = useRef(false);

  useEffect(() => {
    if (initialDur && initialDur > 0) {
      setDur(initialDur);
    }
  }, [initialDur]);

  useEffect(() => {
    setPlaying(false);
    setPos(0);
    setError(null);
    setLoading(false);
    hasPatchedRef.current = false;
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  }, [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const computeDuration = (audio: HTMLAudioElement) => {
      let d = audio.duration;
      if (!Number.isFinite(d) || d === Infinity) {
        if (audio.seekable && audio.seekable.length > 0) {
          d = audio.seekable.end(audio.seekable.length - 1);
        } else {
          d = 0;
        }
      }
      return d || 0;
    };

    const updateDuration = async (audio: HTMLAudioElement) => {
      const newDur = computeDuration(audio);
      if ((!initialDur || initialDur <= 0) && newDur > 0 && Math.abs(newDur - dur) > 0.2) {
        setDur(newDur);
        
        if (!hasPatchedRef.current && messageId) {
          hasPatchedRef.current = true;
          try {
            await axiosInstance.patch(`/chat/messages/${messageId}/duration`, {
              duration: Math.round(newDur)
            });
          } catch (err) {
            console.warn("Failed to update duration:", err);
          }
        }
      }
    };

    const handleLoadStart = () => {
      setLoading(true);
      setError(null);
    };

    const handleLoadedMetadata = () => {
      setLoading(false);
      updateDuration(a);
    };

    const handleLoadedData = () => {
      setLoading(false);
      updateDuration(a);
    };

    const handleCanPlay = () => {
      setLoading(false);
      updateDuration(a);
    };

    const handleDurationChange = () => {
      updateDuration(a);
    };

    const handleTimeUpdate = () => {
      setPos(a.currentTime || 0);
      if (dur === 0) {
        updateDuration(a);
      }
    };

    const handleEnded = () => {
      setPlaying(false);
      a.currentTime = 0;
      setPos(0);
    };

    const handleError = () => {
      setLoading(false);
      setPlaying(false);
      setError("Failed to load");
    };

    a.addEventListener('loadstart', handleLoadStart);
    a.addEventListener('loadedmetadata', handleLoadedMetadata);
    a.addEventListener('loadeddata', handleLoadedData);
    a.addEventListener('canplay', handleCanPlay);
    a.addEventListener('durationchange', handleDurationChange);
    a.addEventListener('timeupdate', handleTimeUpdate);
    a.addEventListener('ended', handleEnded);
    a.addEventListener('error', handleError);

    return () => {
      a.removeEventListener('loadstart', handleLoadStart);
      a.removeEventListener('loadedmetadata', handleLoadedMetadata);
      a.removeEventListener('loadeddata', handleLoadedData);
      a.removeEventListener('canplay', handleCanPlay);
      a.removeEventListener('durationchange', handleDurationChange);
      a.removeEventListener('timeupdate', handleTimeUpdate);
      a.removeEventListener('ended', handleEnded);
      a.removeEventListener('error', handleError);
    };
  }, [src, dur, initialDur, messageId]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    
    if (a.paused) {
      try {
        setError(null);
        await a.play();
        setPlaying(true);
      } catch (e: any) {
        console.warn("Play failed:", e);
        setError("Cannot play");
        setPlaying(false);
      }
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;
  
  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-3 ${mine ? "text-white" : "text-zinc-100"}`}>
        <button
          onClick={toggle}
          disabled={loading || !!error}
          className={`p-2 rounded-full transition ${
            mine 
              ? "bg-white/20 hover:bg-white/30 disabled:opacity-50" 
              : "bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50"
          }`}
          title={error ? error : (playing ? "Pause" : "Play")}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
          ) : error ? (
            <div className="w-4 h-4 text-red-400">!</div>
          ) : playing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
        
        <div className="flex-1 min-w-[100px] lg:min-w-[150px]">
          <div className={`h-1.5 rounded-full ${mine ? "bg-white/30" : "bg-zinc-700"}`}>
            <div
              className={`h-1.5 rounded-full transition-all duration-100 ${
                mine ? "bg-white" : "bg-violet-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          
          <div className="mt-1 text-[10px] opacity-70">
            {playing ? (
              <span>{fmt(pos)} / {error ? "--:--" : fmt(dur)}</span>
            ) : (
              <span>{error ? "--:--" : fmt(dur)}</span>
            )}
          </div>
        </div>
        
        <audio
          key={src}
          ref={audioRef}
          src={src}
          crossOrigin="anonymous"
          preload="metadata"
          playsInline
          className="hidden"
        />
      </div>
      
      <span className={`-mt-4 text-[10px] ${mine ? "text-white/60" : "text-zinc-400"} text-right`}>
        {formatTime(timestamp)}
      </span>
    </div>
  );
}

const ChatPage = () => {
  const { user } = useUser();
  const { selectedUser, fetchUsers, fetchMessages, messagesByUser } = useChatStore();

  const messages = selectedUser ? messagesByUser[selectedUser.clerkId] || [] : [];

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [atBottom, setAtBottom] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    messageId: string;
    position: { x: number; y: number };
  } | null>(null);
  
  // ✅ State for delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  useEffect(() => {
    if (user) fetchUsers();
  }, [fetchUsers, user]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.clerkId);
    }
  }, [selectedUser, fetchMessages]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const vp = viewportRef.current;
    if (vp) {
      vp.scrollTo({ top: vp.scrollHeight, behavior });
    } else {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    }
  };

  const isNearBottom = (vp: HTMLDivElement | null, threshold = 16) => {
    if (!vp) return true;
    const distance = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
    return distance <= threshold;
  };

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const onScroll = () => setAtBottom(isNearBottom(vp));
    vp.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const onResize = () => onScroll();
    window.addEventListener("resize", onResize);

    return () => {
      vp.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [selectedUser?.clerkId]);

  useLayoutEffect(() => {
    if (!selectedUser) return;
    requestAnimationFrame(() => scrollToBottom("auto"));
    const t1 = setTimeout(() => scrollToBottom("auto"), 70);
    const t2 = setTimeout(() => scrollToBottom("auto"), 160);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selectedUser?.clerkId]);

  useEffect(() => {
    if (!selectedUser || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.senderId === user?.id || isNearBottom(viewportRef.current)) {
      scrollToBottom("smooth");
    }
  }, [messages.length, selectedUser?.clerkId, user?.id]);

  useEffect(() => {
    if (isDesktop || !selectedUser) return;

    let startX: number | null = null;
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (startX === null) return;
      const diff = e.touches[0].clientX - startX;
      if (diff > 90) {
        useChatStore.getState().setSelectedUser(null);
        startX = null;
      }
    };
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [selectedUser, isDesktop]);

  useEffect(() => {
    if (!contextMenu) return;
    
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const isFirstInGroup = (idx: number) =>
    idx === 0 || messages[idx - 1]?.senderId !== messages[idx]?.senderId;

  const isLastInGroup = (idx: number) =>
    idx === messages.length - 1 || messages[idx + 1]?.senderId !== messages[idx]?.senderId;

  // ✅ Delete with axiosInstance
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await axiosInstance.delete(`/chat/messages/${messageId}`);
      
      if (selectedUser) {
        fetchMessages(selectedUser.clerkId, true);
      }
    } catch (error: any) {
      console.error("Failed to delete message:", error);
      alert(error.response?.data?.error || "Failed to delete message");
    }
  };

  // ✅ Open delete dialog
  const openDeleteDialog = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string, mine: boolean) => {
    if (!mine) return;
    
    e.preventDefault();
    setContextMenu({
      messageId,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  // ✅ Fixed long-press handler - NO preventDefault
  const handleLongPressStart = (messageId: string, mine: boolean) => {
    if (!mine) return null;
    
    let timer: number | null = null;
    
    const start = () => {
      timer = window.setTimeout(() => {
        openDeleteDialog(messageId);
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, 500);
    };
    
    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    
    return {
      onTouchStart: start,
      onTouchEnd: clear,
      onTouchMove: clear,
    };
  };

  const showScrollButton = !atBottom && messages.length > 0;

  return (
    <main className="h-full rounded-lg bg-gradient-to-b from-zinc-900 to-zinc-900 overflow-hidden">
      <Topbar />

      <div className="grid h-[calc(100vh-180px)] grid-cols-1 lg:grid-cols-[300px_1fr]">
        <div className={`${selectedUser ? "hidden sm:hidden lg:block" : "block"} border-r border-zinc-800`}>
          <UsersList />
        </div>

        <AnimatePresence mode="wait">
          {selectedUser ? (
            <motion.div
              key={selectedUser.clerkId}
              initial={isDesktop ? false : { x: "100%", opacity: 0 }}
              animate={isDesktop ? {} : { x: 0, opacity: 1 }}
              exit={isDesktop ? undefined : { x: "100%", opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex flex-col h-full w-full relative"
            >
              <ChatHeader />

              <div className="flex-1 relative overflow-hidden">
                <div
                  ref={viewportRef}
                  className="absolute inset-0 overflow-y-auto overscroll-contain no-scrollbar pr-1"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div className="p-4 space-y-1 pb-24">
                    {messages.map((message: any, idx: number) => {
                      const mine = message.senderId === user?.id;
                      const showAvatar = isFirstInGroup(idx);
                      const lastInGroup = isLastInGroup(idx);
                      
                      const longPressProps = handleLongPressStart(message._id, mine) || {};

                      return (
                        <div
                          key={message._id}
                          className={`flex items-end gap-2 py-1 ${
                            mine ? "justify-end pl-12" : "justify-start pr-12"
                          }`}
                        >
                          {!mine && showAvatar && (
                            <Avatar className="size-7 shrink-0 shadow-sm ring-1 ring-white/10">
                              <AvatarImage src={selectedUser.imageUrl} />
                            </Avatar>
                          )}
                          {!mine && !showAvatar && <div className="w-7" />}

                          <div
                            className={[
                              "group relative",
                              "max-w-[78%] sm:max-w-[70%] md:max-w-[60%]",
                              "rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                              mine
                                ? "bg-gradient-to-br from-violet-600 to-violet-700 text-white shadow-md ring-1 ring-white/10"
                                : "bg-zinc-800 text-zinc-100 ring-1 ring-white/5",
                              mine && lastInGroup ? "rounded-br-md" : "",
                              !mine && lastInGroup ? "rounded-bl-md" : "",
                            ].join(" ")}
                            onContextMenu={(e) => handleContextMenu(e, message._id, mine)}
                            {...longPressProps}
                            style={{
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              WebkitTouchCallout: 'none',
                              touchAction: 'manipulation'
                            }}
                          >
                            {message.type === "audio" && message.audioUrl ? (
                              <VoiceMessage 
                                url={message.audioUrl} 
                                mine={mine} 
                                initialDur={message.audioDuration}
                                messageId={message._id}
                                timestamp={message.createdAt}
                              />
                            ) : message.type === "call_started" || 
                              message.type === "call_missed" || 
                              message.type === "call_declined" ? (
                              <CallMessage type={message.type} mine={mine} timestamp={message.createdAt} />
                            ) : (
                              <>
                                <p>{message.content}</p>
                                <span className={`mt-1 block text-[10px] ${mine ? "text-white/70" : "text-zinc-400"} text-right`}>
                                  {formatTime(message.createdAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                </div>

                {!atBottom && (
                  <div className="pointer-events-none absolute bottom-14 left-0 right-0 h-10" />
                )}

                {showScrollButton && (
                  <button
                    onClick={() => scrollToBottom("smooth")}
                    className="absolute bottom-20 right-4 z-40 bg-zinc-900/50 lg:hover:bg-zinc-900/80 text-white rounded-full p-3 shadow-lg ring-1 ring-white/10 transition-transform active:scale-95"
                    aria-label="Scroll to bottom"
                  >
                    <ArrowDown className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="shrink-0 px-3">
                <MessageInput />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="no-chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="hidden lg:flex flex-col flex-1 items-center justify-center p-6"
            >
              <NoConversationPlaceholder />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ✅ Desktop context menu */}
      <AnimatePresence>
        {contextMenu && (
          <DeleteMenu
            position={contextMenu.position}
            onDelete={() => openDeleteDialog(contextMenu.messageId)}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* ✅ Delete dialog */}
      <DeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setMessageToDelete(null);
        }}
        onConfirm={() => {
          if (messageToDelete) {
            handleDeleteMessage(messageToDelete);
          }
          setMessageToDelete(null);
        }}
      />
    </main>
  );
};

export default ChatPage;

const NoConversationPlaceholder = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-6">
    <img src="/vibra.png" alt="Vibra" className="size-16 animate-bounce" />
    <div className="text-center">
      <h3 className="text-zinc-300 text-lg font-medium mb-1">
        No conversation selected
      </h3>
      <p className="text-zinc-500 text-sm">Choose a friend to start chatting</p>
    </div>
  </div>
);