import { axiosInstance } from "@/lib/axios";
import { Message, User } from "@/types";
import { create } from "zustand";
import { io } from "socket.io-client";

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

  fetchUsers: () => Promise<void>;
  initSocket: (userId: string) => void;
  disconnectSocket: () => void;
  sendMessage: (receiverId: string, senderId: string, content: string) => void;
  fetchMessages: (userId: string, force?: boolean) => Promise<void>;
  setSelectedUser: (user: User | null) => void;

  fetchUnreadCounts: () => Promise<void>;
  markConversationRead: (otherUserId: string) => Promise<void>;
  clearUnreadMessages: (userId: string) => void;
  incrementUnreadMessages: (userId: string) => void;
}

const baseURL =
  import.meta.env.MODE === "development" ? "http://localhost:5000" : "/";

const socket = io(baseURL, {
  autoConnect: false,
  withCredentials: true,
});

export const useChatStore = create<ChatStore>((set, get) => ({
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

  setSelectedUser: (user) => {
    set({ selectedUser: user });
    if (user) {
      const { currentUserId, socket, markConversationRead } = get();
      // Clear locally
      get().clearUnreadMessages(user.clerkId);
      // Mark read via socket
      if (currentUserId) {
        socket.emit("mark_messages_read", {
          userId: currentUserId,
          otherUserId: user.clerkId,
        });
      }
      // Mark read via REST (belt-and-suspenders)
      markConversationRead(user.clerkId).catch(() => {});
    }
  },

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get("/users");
      set({ users: response.data });
    } catch (error: any) {
      set({ error: error.response?.data?.message || "Failed to fetch users" });
    } finally {
      set({ isLoading: false });
    }
  },

  markConversationRead: async (otherUserId: string) => {
    try {
      await axiosInstance.post("/users/messages/mark-read", { otherUserId });
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

      // Optional: you can ignore offline_messages to avoid double writes,
      // or set them directly (not merge) if you trust server counts:
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

      socket.on("receive_message", (message: Message) => {
        const { currentUserId } = get();
        if (!currentUserId) return;

        const otherUserId =
          message.senderId === currentUserId
            ? message.receiverId
            : message.senderId;

        set((state) => {
          const updated = [
            ...(state.messagesByUser[otherUserId] || []),
            message,
          ];

          const isChatOpen = state.selectedUser?.clerkId === otherUserId;

          if (!isChatOpen) {
            const audio = new Audio("/notification.mp3");
            audio.play().catch(() => {});
          } else {
            // Mark read both ways immediately
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
            unreadMessagesByUser: isChatOpen
              ? state.unreadMessagesByUser
              : {
                  ...state.unreadMessagesByUser,
                  [otherUserId]:
                    (state.unreadMessagesByUser[otherUserId] || 0) + 1,
                },
          };
        });
      });

      socket.on("message_sent", (message: Message) => {
        set((state) => {
          const updated = [
            ...(state.messagesByUser[message.receiverId] || []),
            message,
          ];
          return {
            messagesByUser: {
              ...state.messagesByUser,
              [message.receiverId]: updated,
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

      set({ isConnected: true });
    }
  },

  disconnectSocket: () => {
    if (get().isConnected) {
      socket.disconnect();
      set({ isConnected: false });
    }
  },

  sendMessage: async (receiverId, senderId, content) => {
    const s = get().socket;
    if (!s) return;
    s.emit("send_message", { receiverId, senderId, content });
  },

  fetchMessages: async (userId: string, force = false) => {
    const { messagesByUser } = get();
    if (messagesByUser[userId] && !force) return;

    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(`/users/messages/${userId}`);
      set((state) => ({
        messagesByUser: {
          ...state.messagesByUser,
          [userId]: response.data,
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
}));
