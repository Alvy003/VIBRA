// pages/chat/components/UsersList.tsx
import { motion, AnimatePresence } from "framer-motion";
import UsersListSkeleton from "@/components/skeletons/UsersListSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/useChatStore";
import { useEffect, useMemo, useState, useRef } from "react";
import { 
  Search, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Mic,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  Paperclip,
  X,
  Check, 
  CheckCheck
} from "lucide-react";
import type { User } from "@/types";
import { MobileOverlaySpacer } from "@/components/MobileOverlaySpacer";
import { getUserPreview } from "@/layout/components/getUserPreview";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

// Human label for list (Today/Yesterday/Date)
const listTimeLabel = (dateStr?: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / oneDay);

  if (diffDays === 0) {
    // UPDATED: Forced en-US and hour12 to match MessageBubble
    return d.toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: true 
    });
  }

  if (diffDays === 1) return "Yesterday";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

// ✅ Get message preview with reaction support
function getMessagePreview(
  lastMessage: any, 
  _otherUserClerkId: string,
  currentUserId?: string | null
): React.ReactNode {
  if (!lastMessage) return "Start a conversation";

  const messageType = lastMessage.type;
  const files = lastMessage.files;
  const isMine = lastMessage.senderId === currentUserId;
  const reactions = lastMessage.reactions;

  // ✅ Check if someone reacted to this message
  if (reactions && reactions.length > 0) {
    const latestReaction = reactions[reactions.length - 1];
    
    // If I sent the message and someone else reacted to it
    if (isMine && latestReaction.userId !== currentUserId) {
      return (
        <span className="flex items-center gap-1">
          <span>{latestReaction.emoji}</span>
          <span className="text-zinc-500">Reacted to your message</span>
        </span>
      );
    }
    
    // If I reacted to their message
    const myReaction = reactions.find((r: any) => r.userId === currentUserId);
    if (!isMine && myReaction) {
      return (
        <span className="flex items-center gap-1">
          <span>{myReaction.emoji}</span>
          <span className="text-zinc-400/90">You reacted</span>
        </span>
      );
    }
  }

  // Call types
  if (messageType === "call_started") {
    return (
      <span className="flex items-center gap-1.5">
        {isMine ? (
          <PhoneOutgoing className="w-3 h-3 text-green-400" />
        ) : (
          <PhoneIncoming className="w-3 h-3 text-green-400" />
        )}
        <span>Voice call</span>
      </span>
    );
  }
  
  if (messageType === "call_missed") {
    return (
      <span className="flex items-center gap-1.5">
        <PhoneMissed className="w-3 h-3 text-red-400" />
        <span>Missed call</span>
      </span>
    );
  }
  
  if (messageType === "call_declined") {
    return (
      <span className="flex items-center gap-1.5">
        <PhoneMissed className="w-3 h-3 text-orange-400" />
        <span>Declined call</span>
      </span>
    );
  }

  // Voice message
  if (messageType === "audio") {
    return (
      <span className="flex items-center gap-1.5">
        <Mic className="w-3 h-3 text-violet-400" />
        <span>Voice message</span>
      </span>
    );
  }

  // File messages
  if (messageType === "file" && files && files.length > 0) {
    const fileCount = files.length;
    
    const hasImages = files.some((f: any) => f.mimetype?.startsWith('image/'));
    const hasVideos = files.some((f: any) => f.mimetype?.startsWith('video/'));
    const hasAudio = files.some((f: any) => f.mimetype?.startsWith('audio/'));
    const hasDocs = files.some((f: any) => 
      f.mimetype?.includes('pdf') || 
      f.mimetype?.includes('document') ||
      f.mimetype?.includes('text')
    );

    if (lastMessage.content && lastMessage.content.trim()) {
      const Icon = hasImages ? ImageIcon : hasVideos ? Film : Paperclip;
      return (
        <span className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-zinc-400 shrink-0" />
          <span className="truncate">{lastMessage.content}</span>
        </span>
      );
    }

    if (hasImages) {
      return (
        <span className="flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3 text-violet-400" />
          <span>{fileCount === 1 ? "Photo" : `${fileCount} Photos`}</span>
        </span>
      );
    }
    
    if (hasVideos) {
      return (
        <span className="flex items-center gap-1.5">
          <Film className="w-3 h-3 text-violet-400" />
          <span>{fileCount === 1 ? "Video" : `${fileCount} Videos`}</span>
        </span>
      );
    }
    
    if (hasAudio) {
      return (
        <span className="flex items-center gap-1.5">
          <Music className="w-3 h-3 text-violet-400" />
          <span>Audio file</span>
        </span>
      );
    }
    
    if (hasDocs) {
      return (
        <span className="flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-violet-400" />
          <span>{fileCount === 1 ? "Document" : `${fileCount} Documents`}</span>
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1.5">
        <Paperclip className="w-3 h-3 text-violet-400" />
        <span>{fileCount === 1 ? "File" : `${fileCount} Files`}</span>
      </span>
    );
  }

  // Regular text message
  if (lastMessage.content) {
    return lastMessage.content;
  }

  return "Start a conversation";
}

const UsersList = () => {
  const {
    users,
    selectedUser,
    isLoading,
    setSelectedUser,
    onlineUsers,
    unreadMessagesByUser,
    messagesByUser,
    fetchMessages,
    fetchUnreadCounts,
    userActivities, // Add this to get user activities
    currentUserId,
  } = useChatStore();

  const [q, setQ] = useState("");

  useEffect(() => {
    if (users.length > 0) {
      fetchUnreadCounts();
    }
  }, [users.length, fetchUnreadCounts]);

  useEffect(() => {
    users.forEach((u) => {
      if (u?.clerkId && !messagesByUser[u.clerkId]) {
        fetchMessages(u.clerkId);
      }
    });
  }, [users]);

  const filtered = useMemo(() => {
    if (!q.trim()) return users;
    const s = q.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(s) ||
        u.email?.toLowerCase()?.includes(s)
    );
  }, [users, q]);

  const initialLoadDone = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (users.length > 0 && !initialLoadDone.current) {
      initialLoadDone.current = true;
      setIsInitializing(false);
    }
  }, [users.length]);

  const [showMusicActivity, setShowMusicActivity] = useState(false);

  const { showMusicActivityInChat } = usePreferencesStore();

  const clearSearch = () => setQ("");

  useEffect(() => {
  const interval = setInterval(() => {
    setShowMusicActivity(prev => !prev);
  }, 5000); // Toggle every 5 seconds
  
  return () => clearInterval(interval);
}, []);

  // Check if we're on mobile (for conditional preview logic)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
  const showSkeleton = isLoading && isInitializing && users.length === 0;

  return (
<div
  className={`md:border-r md:border-zinc-800 h-full bg-[#121318]/85
    ${selectedUser ? "hidden sm:hidden lg:block" : "block"}`}
>

        <div className="flex flex-col h-full">
          <div className="p-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400/80" size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search"
                className="w-full bg-[#1c1c24]/90 text-1.5sm placeholder:text-zinc-400/80 text-white py-2.5 lg:py-2 pl-10 pr-3 rounded-full border border-[#2a2a35]/60 shadow-none focus:outline-none"
              />
                {q.length > 0 && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-zinc-400 active:text-zinc-200 active:bg-zinc-600/50 transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-125px)] md:h-[calc(100vh-240px)]" type="hover">
            <div className="space-y-1 p-1 md:p-2">
              {showSkeleton  ? (
                <UsersListSkeleton />
              ) : (
                [...filtered]
                  .sort((a, b) => {
                    const lastA = messagesByUser[a.clerkId]?.slice(-1)[0];
                    const lastB = messagesByUser[b.clerkId]?.slice(-1)[0];
                    const timeA = lastA ? new Date(lastA.createdAt).getTime() : 0;
                    const timeB = lastB ? new Date(lastB.createdAt).getTime() : 0;
                    const unreadA = unreadMessagesByUser[a.clerkId] || 0;
                    const unreadB = unreadMessagesByUser[b.clerkId] || 0;
                    if (unreadA !== unreadB) return unreadB - unreadA;
                    return timeB - timeA;
                  })
                  .map((user: User) => {
                    if (!user?.clerkId) return null;
                  
                    const unreadCount = unreadMessagesByUser[user.clerkId] || 0;
                    const isSelected = selectedUser?.clerkId === user.clerkId;
                    const userMessages = messagesByUser[user.clerkId] || [];
                    const lastMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
                    const isLastMessageMine = lastMessage?.senderId === currentUserId;
                    const isLastMessageRead = lastMessage?.read === true;
                    const timeLabel = lastMessage ? listTimeLabel(lastMessage.createdAt) : "";
                    
                    const isOnline = onlineUsers.has(user.clerkId);
                    const userActivity = userActivities?.get(user.clerkId);
                    
                    // Check if playing music
                    const isPlaying = isOnline && userActivity && userActivity !== "Idle" && userActivity.startsWith("Playing ");
                    const showingMusic = isMobile && showMusicActivityInChat && unreadCount === 0 && isPlaying && showMusicActivity;
                    
                    // Get preview
                    let preview: React.ReactNode;
                    
                    if (isMobile && showMusicActivityInChat) {
                      const previewResult = getUserPreview({
                        lastMessage,
                        unreadCount,
                        isOnline,
                        userActivity,
                        otherUserClerkId: user.clerkId,
                        getMessagePreview: (msg: any, oderId: string) => getMessagePreview(msg, oderId, currentUserId),
                        showMusicActivity,
                      });
                      preview = previewResult.content;
                    } else {
                      preview = getMessagePreview(lastMessage, user.clerkId, currentUserId);
                    }
                  
                    return (
                      <div
                        key={user.clerkId}
                        onClick={() => setSelectedUser(user)}
                        className={`flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer select-none
                          ${
                            isSelected
                              ? "bg-[#1c1c24]/90"
                              : "hover:bg-[#1c1c24]/50 transition-all duration-150"
                          }`}
                                              >
                        {/* Avatar section */}
                        <div className="relative shrink-0">
                          <Avatar className="size-10 sm:size-10">
                            <AvatarImage src={user.imageUrl} />
                            <AvatarFallback className="bg-zinc-800 text-zinc-400">
                              {user.fullName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-[#0f0f13] ${
                              isOnline ? "bg-violet-500" : "bg-zinc-600"
                            }`}
                          />
                        </div>
                  
                        <div className="flex-1 min-w-0 flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="max-w-[160px] truncate text-white font-normal text-[14.5px]">
                              {user.fullName}
                            </p>
                            
                            {/* Message preview - NO animation to prevent jump */}
                            <div className="text-[12.5px] text-zinc-400/95 max-w-[200px] md:max-w-[150px] h-[20px] relative overflow-hidden">
                              <div className="flex items-center gap-1 truncate">
                                {/* Read tick for sent messages */}
                                {isLastMessageMine && lastMessage && (
                                  isLastMessageRead ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                  )
                                )}
                                
                                {/* Only animate when music activity toggles */}
                                {showingMusic ? (
                                  <AnimatePresence mode="wait">
                                    <motion.span
                                      key={`music-${user.clerkId}`}
                                      initial={{ opacity: 0, y: 6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -6 }}
                                      transition={{ duration: 0.25 }}
                                      className="truncate"
                                    >
                                      {preview}
                                    </motion.span>
                                  </AnimatePresence>
                                ) : (
                                  <span className="truncate">{preview}</span>
                                )}
                              </div>
                            </div>
                          </div>
                  
                          {/* Time and unread badge section unchanged */}
                          <div className="flex flex-col items-end ml-2 lg:ml-1 shrink-0">
                            {timeLabel && (
                              <span className="text-[11px] text-zinc-400/95 whitespace-nowrap">
                                {timeLabel}
                              </span>
                            )}
                            {unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-semibold leading-none text-black bg-violet-600 rounded-full px-1 py-1 mt-1">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
              <MobileOverlaySpacer />
            </div>
          </ScrollArea>
        </div>
      </div>
  );
};

export default UsersList;