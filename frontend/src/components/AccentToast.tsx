// src/components/AccentToast.tsx
import React, { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, ListPlus } from "lucide-react";

type ToastKind = "success" | "like" | "remove";
type ToastItem = { id: string; message: string; kind?: ToastKind };

const ToastContext = createContext<{ show: (msg: string, kind?: ToastKind) => void } | null>(null);

export const useAccentToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useAccentToast must be used within AccentToastProvider");
  return ctx;
};

export const AccentToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((t) => [...t, { id, message, kind }]);
    // auto-remove after 2500ms
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <div aria-live="assertive" className="fixed inset-0 pointer-events-none z-[99999]">
              <div className="absolute left-0 right-0 bottom-[4.25rem] flex justify-center px-4">
                <AnimatePresence initial={false}>
                  {toasts.map((toast) => (
                    <motion.div
                      key={toast.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ type: "spring", stiffness: 700, damping: 30 }}
                      className="pointer-events-auto"
                    >
                      <div
                        className="flex items-center gap-3 max-w-[90vw] sm:max-w-[420px] bg-violet-500/95 text-white rounded-full px-4 py-2 shadow-lg"
                      >
                        <div className="flex-none">
                          {toast.kind === "like" ? (
                            <Heart className="h-5 w-5 text-white" />
                          ) : toast.kind === "remove" ? (
                            <Heart className="h-5 w-5 text-white/80" />
                          ) : (
                            <ListPlus className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="text-sm font-medium">{toast.message}</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
};
