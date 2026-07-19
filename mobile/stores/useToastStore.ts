import { create } from 'zustand';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  message: string;
  iconType?: 'heart' | 'none';
  action?: ToastAction;
  duration?: number;
}

interface ToastStore {
  activeToast: ToastOptions | null;
  queue: ToastOptions[];
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
  processQueue: () => void;
}

const DUPLICATE_WINDOW_MS = 1000;
let lastMessage = '';
let lastTriggeredAt = 0;
let dismissTimer: NodeJS.Timeout | null = null;

export const useToastStore = create<ToastStore>((set, get) => ({
  activeToast: null,
  queue: [],

  showToast: (options) => {
    const now = Date.now();
    // Collapse identical consecutive notifications within a short window (~1 second)
    if (options.message === lastMessage && now - lastTriggeredAt < DUPLICATE_WINDOW_MS) {
      return;
    }

    lastMessage = options.message;
    lastTriggeredAt = now;

    set((state) => ({ queue: [...state.queue, options] }));
    get().processQueue();
  },

  processQueue: () => {
    // If there is already a toast showing, wait in the queue
    if (get().activeToast) return;

    const { queue } = get();
    if (queue.length === 0) return;

    const nextToast = queue[0];
    const remainingQueue = queue.slice(1);

    // Clear any previous running timer
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }

    set({
      activeToast: nextToast,
      queue: remainingQueue,
    });

    const duration = nextToast.duration || 2500;
    dismissTimer = setTimeout(() => {
      get().hideToast();
    }, duration);
  },

  hideToast: () => {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }

    set({ activeToast: null });

    // Brief gap between toasts for smooth animations
    setTimeout(() => {
      get().processQueue();
    }, 200);
  },
}));
