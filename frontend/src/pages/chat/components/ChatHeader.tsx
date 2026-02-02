// pages/chat/components/ChatHeader.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChatStore } from "@/stores/useChatStore";
import { 
  ArrowLeft, 
  Phone, 
  PhoneOff, 
  PhoneIncoming, 
  PhoneOutgoing,
  X,
  Reply,
  Copy,
  Trash2
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useCallStore } from "@/stores/useCallStore";
import { motion, AnimatePresence } from "framer-motion";

interface ChatHeaderProps {
  selectionMode?: boolean;
  selectedCount?: number;
  onCancelSelection?: () => void;
  onDeleteSelected?: () => void;
  onReplySelected?: () => void;
  onCopySelected?: () => void;
  onReactionSelected?: (emoji: string) => void; // ADD THIS
  canCopy?: boolean;
  canDelete?: boolean;
}

const ChatHeader = ({
  selectionMode = false,
  selectedCount = 0,
  onCancelSelection,
  onDeleteSelected,
  onReplySelected,
  onCopySelected,
  canCopy = false,
  canDelete = false,
}: ChatHeaderProps) => {
  const { selectedUser, onlineUsers, setSelectedUser, userActivities } = useChatStore();
  const { user } = useUser();
  const myId = user?.id || null;

  const status = useCallStore((s) => s.status);
  const peerId = useCallStore((s) => s.peerId);
  const incomingFrom = useCallStore((s) => s.incomingFrom);
  const actions = useCallStore((s) => s.actions);

  if (!selectedUser) return null;

  const isInAnyCall = status === "calling" || status === "connecting" || status === "connected";
  const isIncomingFromSelected = status === "incoming" && incomingFrom === selectedUser.clerkId;
  const isInCallWithSelected = isInAnyCall && peerId === selectedUser.clerkId;
  const isOnline = onlineUsers.has(selectedUser.clerkId);
  
  const userActivity = userActivities?.get(selectedUser.clerkId);
  const isPlaying = isOnline && userActivity && userActivity !== "Idle" && userActivity.startsWith("Playing ");

  const getStatusText = () => {
    if (isInCallWithSelected) {
      if (status === "calling") return "Ringing...";
      if (status === "connecting") return "Connecting...";
      if (status === "connected") return "In call";
    }
    if (isPlaying) {
      return userActivity;
    }
    return isOnline ? "Online" : "Offline";
  };

  return (
    <div className="shrink-0 relative overscroll-contain">
      {/* Selection Mode Header */}
      <AnimatePresence>
        {selectionMode && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-x-0 top-0 z-50 bg-[#1a1a22] px-2 py-2 sm:py-3 flex items-center gap-2 border-b border-zinc-800"
          >
            <button
              onClick={onCancelSelection}
              className="p-2 text-white hover:bg-white/10 active:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <span className="text-white font-medium flex-1 text-lg">
              {selectedCount}
            </span>

            {/* Action buttons only - no reactions here */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={onReplySelected}
                className="p-2.5 text-white hover:bg-white/10 active:bg-white/20 rounded-full transition-colors"
                title="Reply"
              >
                <Reply className="w-5 h-5" />
              </button>
              
              {canCopy && onCopySelected && (
                <button
                  onClick={onCopySelected}
                  className="p-2.5 text-white hover:bg-white/10 active:bg-white/20 rounded-full transition-colors"
                  title="Copy"
                >
                  <Copy className="w-5 h-5" />
                </button>
              )}
              
              {canDelete && onDeleteSelected && (
                <button
                  onClick={onDeleteSelected}
                  className="p-2.5 text-white hover:bg-white/10 active:bg-white/20 rounded-full transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Normal Header */}
      <div className={`px-2 py-2 sm:px-4 sm:py-3 md:border-b border-zinc-800 bg-[#121318] ${selectionMode ? 'invisible' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          {/* Left side */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setSelectedUser(null)}
              className="lg:hidden p-2 -ml-1 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-[#2a2a35]/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* User info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="size-10 ring-2 ring-[#2a2a35]/50">
                  <AvatarImage src={selectedUser.imageUrl} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400">
                    {selectedUser.fullName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#121318] ${
                  isOnline ? "bg-violet-500" : "bg-zinc-600"
                }`} />
              </div>

              <div className="leading-tight flex-1 min-w-0">
                <h2 className="font-medium text-white text-[15px] truncate">
                  {selectedUser.fullName}
                </h2>
                <p className={`text-xs truncate ${
                  isInCallWithSelected 
                    ? "text-violet-400" 
                    : isPlaying 
                      ? "text-violet-400"
                      : isOnline 
                        ? "text-zinc-400" 
                        : "text-zinc-500"
                }`}>
                  {isInCallWithSelected && (
                    <span className="inline-flex items-center gap-1">
                      {status === "calling" && <PhoneOutgoing className="w-3 h-3" />}
                      {getStatusText()}
                    </span>
                  )}
                  {!isInCallWithSelected && getStatusText()}
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Call buttons */}
          <div className="flex items-center gap-1">
            {isIncomingFromSelected ? (
              <>
                <button
                  onClick={() => {
                    actions.acceptCall();
                    actions.setMinimized(false);
                  }}
                  className="p-2.5 rounded-full bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-600/20 transition-all active:scale-95"
                  title="Accept"
                >
                  <PhoneIncoming className="w-5 h-5" />
                </button>
                <button
                  onClick={actions.declineCall}
                  className="p-2.5 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                  title="Decline"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </>
            ) : isInCallWithSelected ? (
              <>
                <button
                  onClick={() => actions.setMinimized(false)}
                  className="p-2.5 rounded-full bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-600/20 transition-all active:scale-95"
                  title="Open call"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  onClick={actions.endCall}
                  className="p-2.5 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                  title="End call"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </>
            ) : (
              !isInAnyCall && myId && (
                <button
                  onClick={() => {
                    actions.startCall(selectedUser.clerkId);
                    actions.setMinimized(false);
                  }}
                  className="p-2.5 rounded-full text-zinc-400 hover:text-white hover:bg-[#2a2a35]/50 transition-all active:scale-95"
                  title="Voice call"
                >
                  <Phone className="w-5 h-5" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;