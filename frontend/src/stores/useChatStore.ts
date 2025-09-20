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
  fetchMessages: (userId: string) => Promise<void>;
  setSelectedUser: (user: User | null) => void;

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
  socket: socket,
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
      get().clearUnreadMessages(user.clerkId);
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

  initSocket: (userId: string) => {
    if (!get().isConnected) {
      (socket as any).auth = { userId };
      socket.connect();

      socket.emit("user_connected", userId);
      set({ currentUserId: userId });

      socket.on("users_online", (users: string[]) => {
        set({ onlineUsers: new Set(users) });
      });

      socket.on("activities", (activities: [string, string][]) => {
        set({ userActivities: new Map(activities) });
      });

      socket.on("user_connected", (userId: string) => {
        set((state) => ({
          onlineUsers: new Set([...state.onlineUsers, userId]),
        }));
      });

      socket.on("user_disconnected", (userId: string) => {
        set((state) => {
          const newOnlineUsers = new Set(state.onlineUsers);
          newOnlineUsers.delete(userId);
          return { onlineUsers: newOnlineUsers };
        });
      });

      socket.on("receive_message", (message: Message) => {
        const { currentUserId } = get();
        if (!currentUserId) return;

        const otherUserId =
          message.senderId === currentUserId ? message.receiverId : message.senderId;

        set((state) => {
          const updatedMessages = [
            ...(state.messagesByUser[otherUserId] || []),
            message,
          ];

          const isChatOpen = state.selectedUser?.clerkId === otherUserId;

          // If the chat is not open, play notification sound.
          if (!isChatOpen) {
            const audio = new Audio("/notification.mp3");
            audio.play().catch((err) => {
              console.warn("Notification sound failed to play:", err);
            });

            // If user is offline, persist unread message count in localStorage
            if (!state.onlineUsers.has(currentUserId)) {
              const unreadCount = state.unreadMessagesByUser[otherUserId] || 0;
              localStorage.setItem(
                `unreadMessages_${currentUserId}`,
                JSON.stringify({
                  ...state.unreadMessagesByUser,
                  [otherUserId]: unreadCount + 1,
                })
              );
            }
          }

          return {
            messagesByUser: {
              ...state.messagesByUser,
              [otherUserId]: updatedMessages,
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
          const updatedMessages = [
            ...(state.messagesByUser[message.receiverId] || []),
            message,
          ];

          return {
            messagesByUser: {
              ...state.messagesByUser,
              [message.receiverId]: updatedMessages,
            },
          };
        });
      });

      socket.on("activity_updated", ({ userId, activity }) => {
        set((state) => {
          const newActivities = new Map(state.userActivities);
          newActivities.set(userId, activity);
          return { userActivities: newActivities };
        });
      });

      // Fetch messages after socket connection is established
      get().fetchMessages(userId);

      // Handle restoring unread messages from localStorage
      const storedUnreadMessages = localStorage.getItem(
        `unreadMessages_${userId}`
      );
      if (storedUnreadMessages) {
        set({
          unreadMessagesByUser: JSON.parse(storedUnreadMessages),
        });
        // Clear unread messages from localStorage after they are loaded
        localStorage.removeItem(`unreadMessages_${userId}`);
      }

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
    const socket = get().socket;
    if (!socket) return;

    socket.emit("send_message", { receiverId, senderId, content });
  },

  fetchMessages: async (userId: string) => {
    const { messagesByUser } = get();

    // Skip fetching if messages are already loaded
    if (messagesByUser[userId]) return;

    set({ isLoading: true, error: null });
    try {
      const response = await axiosInstance.get(`/users/messages/${userId}`);
      set((state) => ({
        messagesByUser: {
          ...state.messagesByUser,
          [userId]: response.data,
        },
      }));

      // Clear unread messages after loading
      get().clearUnreadMessages(userId);
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
      const newUnread = { ...state.unreadMessagesByUser };
      delete newUnread[userId];
      return { unreadMessagesByUser: newUnread };
    });
  },

  incrementUnreadMessages: (userId: string) => {
    set((state) => {
      const currentCount = state.unreadMessagesByUser[userId] || 0;
      return {
        unreadMessagesByUser: {
          ...state.unreadMessagesByUser,
          [userId]: currentCount + 1,
        },
      };
    });
  },
}));
