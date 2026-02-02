// src/stores/useChatStore.ts
import { axiosInstance } from "@/lib/axios";
import { Message, User } from "@/types";
import { create } from "zustand";
import { io } from "socket.io-client";
import { persist, createJSONStorage } from "zustand/middleware";

interface ChatStore {
  users: User[];
  isLoading: boolean;
  error: string | null;
  socket: any;
  isConnected: boolean;
  onlineUsers: Set<string>;
  userActivities: Map<string, string>;
  messagesByUser: Record<string, Message[]>;
  unreadMessagesByUser: Record<string, number>;
  selectedUser: User | null;
  currentUserId: string | null;
  typingUsers: Set<string>;
  replyingTo: Message | null;
  _lastOnlineCheck: number;
  
  // Cache management
  _usersCacheTimestamp: number;
  _messagesCacheTimestamps: Record<string, number>;
  _isUsersCacheFresh: () => boolean;
  _isMessagesCacheFresh: (userId: string) => boolean;

  fetchUsers: (forceRefresh?: boolean) => Promise<void>;
  initSocket: (userId: string) => void;
  disconnectSocket: () => void;
  sendMessage: (receiverId: string, senderId: string, content: string, replyToId?: string) => void;
  fetchMessages: (userId: string, force?: boolean) => Promise<void>;
  setSelectedUser: (user: User | null) => void;

  fetchUnreadCounts: () => Promise<void>;
  markConversationRead: (otherUserId: string) => Promise<void>;
  clearUnreadMessages: (userId: string) => void;
  incrementUnreadMessages: (userId: string) => void;
  setTyping: (isTyping: boolean) => void;
  setReplyingTo: (message: Message | null) => void;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string) => Promise<void>;
  updateMessageReactions: (messageId: string, reactions: any[]) => void;
  refreshOnlineStatus: () => void;
}

const baseURL =
  import.meta.env.MODE === "development" ? "http://localhost:5000" : "/";

const socket = io(baseURL, {
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
});

const USERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MESSAGES_CACHE_TTL = 2 * 60 * 1000; // 2 minutes (messages update frequently)

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
  users: [],
  isLoading: false,
  error: null,
  socket,
  isConnected: false,
  onlineUsers: new Set(),
  userActivities: new Map(),
  messagesByUser: {},
  unreadMessagesByUser: {},
  selectedUser: null,
  currentUserId: null,
  typingUsers: new Set(),
  replyingTo: null,
  _lastOnlineCheck: 0,
  
  // Cache timestamps
  _usersCacheTimestamp: 0,
  _messagesCacheTimestamps: {},

  _isUsersCacheFresh: () => {
    return Date.now() - get()._usersCacheTimestamp < USERS_CACHE_TTL;
  },

  _isMessagesCacheFresh: (userId: string) => {
    const timestamp = get()._messagesCacheTimestamps[userId] || 0;
    return Date.now() - timestamp < MESSAGES_CACHE_TTL;
  },

  setSelectedUser: (user) => {
    set({ selectedUser: user, replyingTo: null });
    if (user) {
      const { currentUserId, socket, markConversationRead, clearUnreadMessages } = get();
      
      clearUnreadMessages(user.clerkId);
      
      if (currentUserId) {
        socket.emit("mark_messages_read", {
          userId: currentUserId,
          otherUserId: user.clerkId,
        });
      }
      
      markConversationRead(user.clerkId).catch(() => {});
    }
  },

  setReplyingTo: (message) => {
    set({ replyingTo: message });
  },

  setTyping: (isTyping: boolean) => {
    const { socket, currentUserId, selectedUser } = get();
    if (!socket || !currentUserId || !selectedUser) return;
    
    socket.emit("typing", {
      senderId: currentUserId,
      receiverId: selectedUser.clerkId,
      isTyping,
    });
  },

  addReaction: async (messageId: string, emoji: string) => {
    try {
      const response = await axiosInstance.post(`/chat/messages/${messageId}/reactions`, { emoji });
      get().updateMessageReactions(messageId, response.data.reactions);
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  },

  removeReaction: async (messageId: string) => {
    try {
      const response = await axiosInstance.delete(`/chat/messages/${messageId}/reactions`);
      get().updateMessageReactions(messageId, response.data.reactions);
    } catch (error) {
      console.error("Failed to remove reaction:", error);
    }
  },

  updateMessageReactions: (messageId: string, reactions: any[]) => {
    set((state) => {
      const newMessagesByUser = { ...state.messagesByUser };
      
      for (const oderId in newMessagesByUser) {
        newMessagesByUser[oderId] = newMessagesByUser[oderId].map((msg) => {
          if (msg._id === messageId) {
            return { ...msg, reactions };
          }
          return msg;
        });
      }
      
      return { messagesByUser: newMessagesByUser };
    });
  },

  refreshOnlineStatus: () => {
    const { socket, isConnected, currentUserId } = get();
    if (socket && isConnected && currentUserId) {
      socket.emit("get_online_users");
      set({ _lastOnlineCheck: Date.now() });
    }
  },

  fetchUsers: async (forceRefresh = false) => {
    const state = get();
    const hasData = state.users.length > 0;
    const isFresh = state._isUsersCacheFresh();
    
    // Skip if fresh and not forcing
    if (hasData && isFresh && !forceRefresh) {
      return;
    }
    
    // Background refresh if stale but has data
    if (hasData && !isFresh && !forceRefresh) {
      try {
        const response = await axiosInstance.get("/users");
        set({ users: response.data, _usersCacheTimestamp: Date.now() });
      } catch (error) {
        // Silently fail background refresh
      }
      return;
    }
    
    // Normal fetch with loading state
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/users");
      set({ users: response.data, _usersCacheTimestamp: Date.now() });
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to fetch users" });
    } finally {
      set({ isLoading: false });
    }
  },

  markConversationRead: async (otherUserId: string) => {
    try {
      await axiosInstance.post("/users/messages/mark-read", { otherUserId });
      
      set((state) => {
        const messages = state.messagesByUser[otherUserId];
        if (!messages) return state;
        
        const updated = messages.map((msg) => {
          if (msg.senderId === otherUserId && !msg.read) {
            return { ...msg, read: true, readAt: new Date().toISOString() };
          }
          return msg;
        });
        
        return {
          messagesByUser: {
            ...state.messagesByUser,
            [otherUserId]: updated,
          },
          unreadMessagesByUser: {
            ...state.unreadMessagesByUser,
            [otherUserId]: 0,
          },
        };
      });
    } catch (e) {
      console.warn("Failed to mark conversation read", e);
    }
  },

  fetchUnreadCounts: async () => {
    try {
      const res = await axiosInstance.get("/users/unread-counts");
      const counts = res.data || {};
      const { selectedUser } = get();
      if (selectedUser?.clerkId) {
        delete counts[selectedUser.clerkId];
      }
      set({ unreadMessagesByUser: counts });
    } catch (err) {
      console.warn("Failed to fetch unread counts", err);
    }
  },

  initSocket: (userId: string) => {
    if (!get().isConnected) {
      (socket as any).auth = { userId };
      socket.connect();

      socket.emit("user_connected", userId);
      set({ currentUserId: userId });

      socket.on("connect", async () => {
        await get().fetchUnreadCounts();
        socket.emit("user_connected", userId);
      });

      socket.on("disconnect", (reason) => {
        if (reason === "io server disconnect" || reason === "io client disconnect") {
          set({ isConnected: false });
        }
      });
      
      socket.on("reconnect", () => {
        socket.emit("user_connected", userId);
        socket.emit("get_online_users");
      });

      socket.on("offline_messages", (counts: Record<string, number>) => {
        const { selectedUser } = get();
        const next = { ...counts };
        if (selectedUser?.clerkId) delete next[selectedUser.clerkId];
        set({ unreadMessagesByUser: next });
      });

      socket.on("users_online", (users: string[]) => {
        set({ onlineUsers: new Set(users) });
      });

      socket.on("user_connected", (uid: string) => {
        set((state) => ({
          onlineUsers: new Set([...state.onlineUsers, uid]),
        }));
      });

      socket.on("user_disconnected", (uid: string) => {
        set((state) => {
          const next = new Set(state.onlineUsers);
          next.delete(uid);
          return { onlineUsers: next };
        });
      });

      socket.on("activities", (activities: [string, string][]) => {
        set({ userActivities: new Map(activities) });
      });

      socket.on("user_typing", ({ senderId, isTyping }: { senderId: string; isTyping: boolean }) => {
        set((state) => {
          const next = new Set(state.typingUsers);
          if (isTyping) {
            next.add(senderId);
          } else {
            next.delete(senderId);
          }
          return { typingUsers: next };
        });
      });

      socket.on("messages_read", ({ by }: { by: string }) => {
        set((state) => {
          const messages = state.messagesByUser[by];
          if (!messages) return state;
          
          const updated = messages.map((msg) => {
            if (msg.senderId === state.currentUserId && !msg.read) {
              return { ...msg, read: true, readAt: new Date().toISOString() };
            }
            return msg;
          });
          
          return {
            messagesByUser: {
              ...state.messagesByUser,
              [by]: updated,
            },
          };
        });
      });

      socket.on("message_reaction", ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
        get().updateMessageReactions(messageId, reactions);
      });

      socket.on("receive_message", (message: Message) => {
        const { currentUserId, selectedUser } = get();
        if (!currentUserId) return;

        const otherUserId =
          message.senderId === currentUserId
            ? message.receiverId
            : message.senderId;

        const isChatOpen = selectedUser?.clerkId === otherUserId;

        set((state) => {
          const updated = [
            ...(state.messagesByUser[otherUserId] || []),
            message,
          ];

          const newUnreadCount = isChatOpen 
            ? (state.unreadMessagesByUser[otherUserId] || 0)
            : (state.unreadMessagesByUser[otherUserId] || 0) + 1;

          if (!isChatOpen) {
            const audio = new Audio("/notification.mp3");
            audio.play().catch(() => {});
          } else {
            socket.emit("mark_messages_read", {
              userId: currentUserId,
              otherUserId,
            });
            axiosInstance
              .post("/users/messages/mark-read", { otherUserId })
              .catch(() => {});
          }

          return {
            messagesByUser: {
              ...state.messagesByUser,
              [otherUserId]: updated,
            },
            unreadMessagesByUser: {
              ...state.unreadMessagesByUser,
              [otherUserId]: isChatOpen ? 0 : newUnreadCount,
            },
            // Update cache timestamp since we have fresh data
            _messagesCacheTimestamps: {
              ...state._messagesCacheTimestamps,
              [otherUserId]: Date.now(),
            },
          };
        });
      });

      socket.on("message_sent", (message: Message) => {
        set((state) => {
          const existing = state.messagesByUser[message.receiverId] || [];
          const alreadyExists = existing.some(m => m._id === message._id);
          
          if (alreadyExists) return state;
          
          return {
            messagesByUser: {
              ...state.messagesByUser,
              [message.receiverId]: [...existing, message],
            },
            _messagesCacheTimestamps: {
              ...state._messagesCacheTimestamps,
              [message.receiverId]: Date.now(),
            },
          };
        });
      });

      socket.on("activity_updated", ({ userId: uid, activity }) => {
        set((state) => {
          const next = new Map(state.userActivities);
          next.set(uid, activity);
          return { userActivities: next };
        });
      });

      const refreshInterval = setInterval(() => {
        if (get().isConnected) {
          socket.emit("get_online_users");
        }
      }, 30000); // 30 seconds
      
      (socket as any)._refreshInterval = refreshInterval;

      set({ isConnected: true });
    }
  },

  disconnectSocket: () => {
    if (get().isConnected) {
      if ((socket as any)._refreshInterval) {
        clearInterval((socket as any)._refreshInterval);
      }
      socket.disconnect();
      set({ isConnected: false, onlineUsers: new Set() });
    }
  },

  sendMessage: (receiverId: string, senderId: string, content: string, replyToId?: string) => {
    const s = get().socket;
    if (!s) return;
    s.emit("send_message", { receiverId, senderId, content, replyToId: replyToId || null });
    set({ replyingTo: null });
  },

  fetchMessages: async (userId: string, force = false) => {
    const state = get();
    const hasData = state.messagesByUser[userId] && state.messagesByUser[userId].length > 0;
    const isFresh = state._isMessagesCacheFresh(userId);
    
    // Skip if has data and fresh (unless forced)
    if (hasData && isFresh && !force) {
      return;
    }
    
    // Background refresh if stale but has data
    if (hasData && !isFresh && !force) {
      try {
        const response = await axiosInstance.get(`/users/messages/${userId}`);
        set((state) => ({
          messagesByUser: {
            ...state.messagesByUser,
            [userId]: response.data,
          },
          _messagesCacheTimestamps: {
            ...state._messagesCacheTimestamps,
            [userId]: Date.now(),
          },
        }));
      } catch (error) {
        // Silently fail background refresh
      }
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(`/users/messages/${userId}`);
      set((state) => ({
        messagesByUser: {
          ...state.messagesByUser,
          [userId]: response.data,
        },
        _messagesCacheTimestamps: {
          ...state._messagesCacheTimestamps,
          [userId]: Date.now(),
        },
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to fetch messages",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  clearUnreadMessages: (userId: string) => {
    set((state) => {
      const next = { ...state.unreadMessagesByUser };
      delete next[userId];
      return { unreadMessagesByUser: next };
    });
  },

  incrementUnreadMessages: (userId: string) => {
    set((state) => {
      const current = state.unreadMessagesByUser[userId] || 0;
      return {
        unreadMessagesByUser: {
          ...state.unreadMessagesByUser,
          [userId]: current + 1,
        },
      };
    });
  },
}),
{
  name: "vibra-chat-store",
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    users: state.users,
    messagesByUser: state.messagesByUser,
    unreadMessagesByUser: state.unreadMessagesByUser,
    _usersCacheTimestamp: state._usersCacheTimestamp,
    _messagesCacheTimestamps: state._messagesCacheTimestamps,
  }),
}
)
);
