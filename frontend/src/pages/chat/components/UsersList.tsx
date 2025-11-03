import { motion, AnimatePresence } from "framer-motion";
import UsersListSkeleton from "@/components/skeletons/UsersListSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/useChatStore";
import { useEffect, useMemo, useState } from "react";
import { Search, PhoneIncoming, PhoneOutgoing, PhoneMissed, Mic } from "lucide-react"; // ✅ Add call icons
import type { User } from "@/types";

// Human label for list (Today/Yesterday/Date)
function listTimeLabel(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / oneDay);

  if (diffDays === 0) {
    // Show time for today
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";

  // Show date as DD/MM/YY
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="user-list"
        initial={{ x: -16, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -12, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={`border-r border-zinc-800 h-full bg-gradient-to-b from-zinc-900 to-zinc-900
          ${selectedUser ? "hidden sm:hidden lg:block" : "block"}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-3 border-b border-zinc-900">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search people"
                className="w-full bg-zinc-700/60 text-1.5sm placeholder:text-zinc-400 text-white py-2 lg:py-1.5 pl-10 pr-3 rounded-2xl lg:rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-210px)] sm:h-[calc(100vh-240px)]" type="hover">
            <div className="space-y-1 p-2 sm:p-3">
              {isLoading ? (
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
                    const timeLabel = lastMessage ? listTimeLabel(lastMessage.createdAt) : "";

                    // ✅ Last message preview with icons
                    let preview: React.ReactNode = "Start a conversation";
                    
                    if (lastMessage) {
                      const messageType = (lastMessage as any).type;
                      const isMine = (lastMessage as any).senderId === user.clerkId; // If false, I sent it
                      
                      if (messageType === "call_started") {
                        preview = (
                          <div className="flex items-center gap-1.5">
                            {isMine ? (
                              <PhoneIncoming className="w-3 h-3 text-green-300" />
                            ) : (
                              <PhoneOutgoing className="w-3 h-3 text-green-300" />
                            )}
                            <span>Voice call</span>
                          </div>
                        );
                      } else if (messageType === "call_missed") {
                        preview = (
                          <div className="flex items-center gap-1.5">
                            <PhoneMissed className="w-3 h-3 text-red-400" />
                            <span>Missed call</span>
                          </div>
                        );
                      } else if (messageType === "call_declined") {
                        preview = (
                          <div className="flex items-center gap-1.5">
                            <PhoneMissed className="w-3 h-3 text-orange-400" />
                            <span>Declined call</span>
                          </div>
                        );
                      } else if (messageType === "audio") {
                        preview = (
                          <div className="flex items-center gap-1.5">
                            <Mic className="w-3 h-3 text-violet-400" />
                            <span>Voice message</span>
                          </div>
                        );
                      } else {
                        preview = lastMessage.content || "Start a conversation";
                      }
                    }

                    return (
                      <div
                        key={user.clerkId}
                        onClick={() => setSelectedUser(user)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer select-none
                          ${isSelected ? "bg-zinc-800/50" : "hover:bg-zinc-800/30 transition-all duration-150"}`}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="size-10 sm:size-10">
                            <AvatarImage src={user.imageUrl} />
                            <AvatarFallback>{user.fullName[0]}</AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-900 ${
                              onlineUsers.has(user.clerkId) ? "bg-violet-500" : "bg-zinc-600"
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium max-w-[160px] truncate text-white text-sm sm:text-base">
                              {user.fullName}
                            </p>
                            <div className="text-[13px] text-zinc-400 max-w-[160px] truncate">
                              {preview}
                            </div>
                          </div>

                          <div className="flex flex-col items-end ml-2 lg:ml-1 shrink-0">
                            {timeLabel && (
                              <span className="text-[11.5px] text-zinc-400 whitespace-nowrap">
                                {timeLabel}
                              </span>
                            )}
                            {unreadCount > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-semibold leading-none text-white bg-violet-600 rounded-full px-1 mt-1">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </ScrollArea>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UsersList;