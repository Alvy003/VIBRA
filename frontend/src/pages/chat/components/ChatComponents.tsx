// components/chat/ChatComponents.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowDown, 
  Trash2, 
  Reply,
  AlertTriangle, 
  X, 
  Download,
  Copy,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";

// Date separator helper
export const formatDateSeparator = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const messageDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (messageDate.getTime() === today.getTime()) return "Today";
  if (messageDate.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: messageDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

export const shouldShowDateSeparator = (currentMsg: any, prevMsg: any) => {
  if (!prevMsg) return true;
  const currentDate = new Date(currentMsg.createdAt).toDateString();
  const prevDate = new Date(prevMsg.createdAt).toDateString();
  return currentDate !== prevDate;
};

// Date Separator
export function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-3">
      <div className="bg-[#11111a]/90 backdrop-blur-sm text-zinc-400/90 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-[#2a2a35]/40">
        {formatDateSeparator(date)}
      </div>
    </div>
  );
}

// Unread Indicator
export function UnreadIndicator({ count, onClick }: { count: number; onClick?: () => void }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-center my-3">
      <button 
        onClick={onClick}
        className="bg-violet-600 text-white text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition-colors active:scale-95"
      >
        <ArrowDown className="w-3 h-3" />
        <span>{count} unread message{count > 1 ? "s" : ""}</span>
      </button>
    </div>
  );
}

// Typing Indicator
export function TypingIndicator({ userName }: { userName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2"
    >
      <div className="bg-[#1c1c24] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 border border-[#2a2a35]/50">
        <div className="flex gap-1">
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-zinc-500 rounded-full" />
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} className="w-2 h-2 bg-zinc-500 rounded-full" />
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} className="w-2 h-2 bg-zinc-500 rounded-full" />
        </div>
        <span className="text-xs text-zinc-400">{userName} is typing...</span>
      </div>
    </motion.div>
  );
}

// Reply Input Preview
export function ReplyInputPreview({ replyTo, onCancel }: { replyTo: any; onCancel: () => void }) {
  if (!replyTo) return null;

  const getPreviewText = () => {
    if (replyTo.type === "audio") return "🎤 Voice message";
    if (replyTo.type === "file") return "📎 File";
    return replyTo.content?.substring(0, 60) + (replyTo.content?.length > 60 ? "..." : "");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2 bg-[#1c1c24]/95 backdrop-blur-sm border-l-2 border-violet-500 mx-3 rounded-lg mb-2"
    >
      <Reply className="w-4 h-4 text-violet-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-violet-400 font-medium">Reply to message</p>
        <p className="text-sm text-zinc-300 truncate">{getPreviewText()}</p>
      </div>
      <button onClick={onCancel} className="p-1.5 hover:bg-[#2a2a35] rounded-full transition-colors">
        <X className="w-4 h-4 text-zinc-400" />
      </button>
    </motion.div>
  );
}

// Empty Conversation
export function EmptyConversation({ user }: { user: any }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center mb-6 shadow-xl shadow-violet-600/20">
          <Avatar className="size-20 ring-4 ring-[#0a0a0f]">
            <AvatarImage src={user.imageUrl} />
          </Avatar>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="absolute -bottom-1 -right-1 w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center text-lg shadow-lg"
        >
          👋
        </motion.div>
      </motion.div>
      
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">{user.fullName}</h3>
        <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
          This is the very beginning of your conversation with <span className="text-violet-400">{user.fullName.split(' ')[0]}</span>. Send a message to say hi!
        </p>
      </motion.div>
    </div>
  );
}

// No Conversation Placeholder
export function NoConversationPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.5 }}>
        <img src="/vibra.png" alt="Vibra" className="size-20" />
      </motion.div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-center">
        <h3 className="text-zinc-300 text-xl font-medium mb-2">Welcome to Vibra</h3>
        <p className="text-zinc-500 text-sm max-w-sm">Select a conversation from the left to start chatting with your friends</p>
      </motion.div>
    </div>
  );
}

// Delete Dialog
export function DeleteDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = "Delete Message",
  message = "Are you sure you want to delete this message? This action cannot be undone."
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#1c1c24] rounded-2xl shadow-2xl border border-[#2a2a35] w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{title}</h3>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">{message}</p>
              </div>
              <div className="flex gap-3 p-6 pt-4">
                <button 
                  onClick={onClose} 
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#2a2a35] hover:bg-[#3a3a45] text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => { onConfirm(); onClose(); }} 
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Quick Reaction Emojis
const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

// Mobile Action Sheet - NO LONGER USED (replaced by header selection mode)
export function FloatingReactionBar({
  position,
  onReaction,
}: {
  position: { top: number; left: number; right: number; mine: boolean };
  onReaction: (emoji: string) => void;
}) {
  return (
    <motion.div
      data-reaction-bar
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      transition={{ type: "spring", damping: 25, stiffness: 400 }}
      className="absolute z-50 pointer-events-auto"
      style={{
        top: Math.max(10, position.top),
        ...(position.mine 
          ? { right: 16 } 
          : { left: 16 }
        ),
      }}
    >
      <div className="flex gap-1 bg-[#1c1c24] rounded-full px-2 py-0 shadow-2xl border border-[#2a2a35]">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReaction(emoji)}
            className="text-xl p-2 hover:bg-[#2a2a35] active:scale-125 rounded-full transition-all"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// Desktop Context Menu - Polished
export function MessageContextMenu({ 
  onDelete,
  onReply,
  onReaction,
  onCopy,
  mine,
  position,
  onClose,
  hasText
}: { 
  onDelete?: () => void;
  onReply: () => void;
  onReaction: (emoji: string) => void;
  onCopy?: () => void;
  mine: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  hasText?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.12 }}
      className="fixed bg-[#1c1c24] rounded-xl shadow-2xl border border-[#2a2a35] overflow-hidden z-50 min-w-[180px]"
      style={{ top: position.y, left: position.x }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Quick reactions row */}
      <div className="flex gap-1 p-2 border-b border-[#2a2a35]">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { 
              onReaction(emoji); // Pass emoji to handler
              onClose(); 
            }}
            className="text-xl p-2 hover:bg-[#2a2a35] rounded-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="py-1">
        <button 
          onClick={() => { onReply(); onClose(); }} 
          className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#2a2a35] transition-colors text-zinc-200 text-sm"
        >
          <Reply className="w-4 h-4 text-zinc-400" />
          <span>Reply</span>
        </button>
        
        {hasText && onCopy && (
          <button 
            onClick={() => { onCopy(); onClose(); }} 
            className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#2a2a35] transition-colors text-zinc-200 text-sm"
          >
            <Copy className="w-4 h-4 text-zinc-400" />
            <span>Copy</span>
          </button>
        )}
        
        {mine && onDelete && (
          <>
            <div className="h-px bg-[#2a2a35] my-1" />
            <button 
              onClick={() => { onDelete(); onClose(); }} 
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#2a2a35] transition-colors text-red-400 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// Image Gallery Modal - WhatsApp Style with navigation
export function ImagePreviewModal({ 
  images, 
  initialIndex = 0,
  onClose 
}: { 
  images: string[] | string | null; 
  initialIndex?: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Normalize to array
  const imageArray = images 
    ? (Array.isArray(images) ? images : [images])
    : [];

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };

    if (imageArray.length > 0) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [imageArray.length, currentIndex]);

  if (!imageArray.length) return null;

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : imageArray.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < imageArray.length - 1 ? prev + 1 : 0));
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const currentImage = imageArray[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-[100] flex flex-col"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
            >
              <X className="size-6" />
            </button>
            {imageArray.length > 1 && (
              <span className="text-white/70 text-sm">
                {currentIndex + 1} / {imageArray.length}
              </span>
            )}
          </div>
          
          <button 
            onClick={() => downloadFile(currentImage, currentImage.split("/").pop() || "image")}
            className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
          >
            <Download className="size-6" />
          </button>
        </div>

        {/* Image Container */}
        <div 
          className="flex-1 flex items-center justify-center relative px-4"
          onClick={onClose}
        >
          {/* Previous Button */}
          {imageArray.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="absolute left-4 p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-all z-10"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Image */}
          <motion.img
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            src={currentImage}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next Button */}
          {imageArray.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-4 p-3 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-all z-10"
            >
              <ChevronRight className="size-6" />
            </button>
          )}
        </div>

        {/* Thumbnail Strip */}
        {imageArray.length > 1 && (
          <div className="shrink-0 flex justify-center gap-2 p-4 bg-gradient-to-t from-black/50 to-transparent">
            {imageArray.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex 
                    ? "border-violet-500 scale-105" 
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img 
                  src={img} 
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Selection Header for Mobile (WhatsApp style)
export function SelectionHeader({
  selectedCount,
  onClose,
  onDelete,
  onReply,
  onCopy,
  canCopy,
  canDelete
}: {
  selectedCount: number;
  onClose: () => void;
  onDelete?: () => void;
  onReply: () => void;
  onCopy?: () => void;
  canCopy: boolean;
  canDelete: boolean;
}) {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="absolute inset-x-0 top-0 z-50 bg-violet-600 px-2 py-3 flex items-center gap-2"
    >
      <button
        onClick={onClose}
        className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      
      <span className="text-white font-medium flex-1">
        {selectedCount}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={onReply}
          className="p-2.5 text-white hover:bg-white/10 rounded-full transition-colors"
          title="Reply"
        >
          <Reply className="w-5 h-5" />
        </button>
        
        {canCopy && onCopy && (
          <button
            onClick={onCopy}
            className="p-2.5 text-white hover:bg-white/10 rounded-full transition-colors"
            title="Copy"
          >
            <Copy className="w-5 h-5" />
          </button>
        )}
        
        {canDelete && onDelete && (
          <button
            onClick={onDelete}
            className="p-2.5 text-white hover:bg-white/10 rounded-full transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}