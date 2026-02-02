// src/layout/components/RightSidebar.tsx
import { useUIStore } from "@/stores/useUIStore";
// import { useChatStore } from "@/stores/useChatStore";
import FriendsActivity from "../components/FriendsActivity";
import Queue from "@/pages/home/components/Queue";
import { AnimatePresence, motion } from "framer-motion";
import { PanelRightClose, Users, ListMusic, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react"; //useMemo
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const RightSidebar = () => {
  const { 
    sidePanelView, 
    isRightSidebarCollapsed, 
    toggleRightSidebar,
  } = useUIStore();
  
  // const { users, onlineUsers } = useChatStore();
  
  const [isHovered, setIsHovered] = useState(false);
  const isTouch = useIsTouchDevice();

  // Calculate online count here
  // const onlineCount = useMemo(
  //   () => users.filter((u) => onlineUsers.has(u.clerkId)).length,
  //   [users, onlineUsers]
  // );

  // COLLAPSED STATE
  if (isRightSidebarCollapsed) {
    return (
      <TooltipProvider>
        <div 
          className="h-full rounded-lg bg-zinc-900 flex items-center justify-center"
          onMouseEnter={() => !isTouch && setIsHovered(true)}
          onMouseLeave={() => !isTouch && setIsHovered(false)}
        >
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleRightSidebar}
                className="size-10 rounded-lg transition-colors flex items-center justify-center"
              >
                <ChevronLeft className={cn(
                  "size-7 transition-colors",
                  isTouch || isHovered ? "text-white" : "text-zinc-500"
                )} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={12} className="bg-zinc-900 text-white border-zinc-800">
              Expand sidebar
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  // EXPANDED STATE
  return (
    <TooltipProvider>
      <div 
        className="h-full rounded-lg bg-zinc-900 flex flex-col overflow-hidden"
        onMouseEnter={() => !isTouch && setIsHovered(true)}
        onMouseLeave={() => !isTouch && setIsHovered(false)}
      >
        {/* Header with collapse button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40">
          <div className="flex items-center gap-1.5">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleRightSidebar}
                  className="size-8 rounded-lg hover:bg-zinc-800/60 transition-colors flex items-center justify-center"
                >
                  {isTouch || isHovered ? (
                    <PanelRightClose className="size-5 text-zinc-400 hover:text-white transition-colors" />
                  ) : (
                    sidePanelView === "queue" ? (
                      <ListMusic className="size-5 text-zinc-400" />
                    ) : (
                      <Users className="size-5 text-zinc-400" />
                    )
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-zinc-900 text-white border-zinc-800">
                Collapse sidebar
              </TooltipContent>
            </Tooltip>
            <h2 className="font-bold text-sm text-zinc-300">
              {sidePanelView === "queue" ? "Queue" : "Friend Activity"}
            </h2>
          </div>

          {/* Online count - shown only for Friends view */}
          {/* {sidePanelView === "friends" && onlineCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
              <span className="text-xs text-zinc-400">{onlineCount} online</span>
            </div>
          )} */}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 relative">
          <AnimatePresence mode="wait">
            {sidePanelView === "queue" ? (
              <motion.div
                key="queue"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
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
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
              >
                <FriendsActivity />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default RightSidebar;