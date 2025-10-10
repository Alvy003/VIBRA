// components/RightPanel.tsx
import { useUIStore } from "@/stores/useUIStore.ts";
import FriendsActivity from "./FriendsActivity.tsx";
import Queue from "@/pages/home/components/Queue.tsx";
import { AnimatePresence, motion } from "framer-motion";

const RightPanel = () => {
  const sidePanelView = useUIStore((s) => s.sidePanelView);

  return (
    <div className="h-full bg-zinc-900 rounded-lg flex flex-col overflow-hidden relative">
      <AnimatePresence mode="wait">
        {sidePanelView === "queue" ? (
          <motion.div
            key="queue"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Queue />
          </motion.div>
        ) : (
          <motion.div
            key="friends"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <FriendsActivity />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RightPanel;
