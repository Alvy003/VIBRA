// src/lib/getUserPreview.tsx
import { Headphones } from "lucide-react";
import type { Message } from "@/types";

interface GetUserPreviewParams {
  lastMessage: Message | null;
  unreadCount: number;
  isOnline: boolean;
  userActivity: string | undefined;
  otherUserClerkId: string;
  getMessagePreview: (lastMessage: Message | null, otherUserClerkId: string) => React.ReactNode;
  showMusicActivity: boolean; // Add this new param
}

interface PreviewResult {
  content: React.ReactNode;
  type: 'message' | 'activity' | 'placeholder';
}

export function getUserPreview({
  lastMessage,
  unreadCount,
  isOnline,
  userActivity,
  otherUserClerkId,
  getMessagePreview,
  showMusicActivity,
}: GetUserPreviewParams): PreviewResult {
  
  // Priority 1: Unread messages ALWAYS take priority
  if (unreadCount > 0) {
    return {
      content: getMessagePreview(lastMessage, otherUserClerkId),
      type: 'message',
    };
  }

  // Check if user is playing music
  const isPlaying = isOnline && userActivity && userActivity !== "Idle" && userActivity.startsWith("Playing ");

  // Priority 2: Rotating preview - show music only during music phase
  if (isPlaying && showMusicActivity) {
    const activityContent = userActivity.replace("Playing ", "");
    const parts = activityContent.split(" by ");
    const songTitle = parts[0] || "";
    const artistName = parts[1] || "";
    
    const displayText = artistName 
      ? `${songTitle} — ${artistName}`
      : songTitle;

    return {
      content: (
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Headphones className="w-3 h-3 text-violet-400 shrink-0" />
          <span className="line-clamp-1">
            <span className="text-zinc-400">{displayText}</span>
          </span>
        </div>
      ),
      type: 'activity',
    };
  }

  // Priority 3: Show message preview
  if (lastMessage) {
    return {
      content: getMessagePreview(lastMessage, otherUserClerkId),
      type: 'message',
    };
  }

  // Final fallback
  return {
    content: "Start a conversation",
    type: 'placeholder',
  };
}