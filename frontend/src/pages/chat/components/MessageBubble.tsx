// components/chat/MessageBubble.tsx
import { useRef, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Reply, Check, CheckCheck, Smile,
  PhoneIncoming, PhoneOutgoing, PhoneMissed,
  FileText, Image as ImageIcon, Film, Music, Download
} from "lucide-react";
import type { Message, MessageReaction } from "@/types";

// WhatsApp-style time format (24h)
const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const API_ORIGIN =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : window.location.origin;

function toAbsoluteVoiceUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      if (u.pathname.includes('/uploads/voice/')) {
        const filename = u.pathname.split('/').pop();
        return `${API_ORIGIN}/uploads/voice/${filename}`;
      }
      return url;
    } catch {
      return url;
    }
  }
  if (url.startsWith("/uploads")) return `${API_ORIGIN}${url}`;
  if (url.startsWith("uploads")) return `${API_ORIGIN}/${url}`;
  return url;
}

function toAbsoluteFileUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/uploads")) return `${API_ORIGIN}${url}`;
  if (url.startsWith("uploads")) return `${API_ORIGIN}/${url}`;
  return url;
}

function ImageWithFallback({ 
  src, 
  alt, 
  className, 
  onClick 
}: { 
  src: string; 
  alt: string; 
  className?: string; 
  onClick?: () => void;
}) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-zinc-800/50 ${className}`}
        style={{ minHeight: '100px' }}
      >
        <ImageIcon className="w-8 h-8 text-zinc-500 mb-2" />
        <span className="text-xs text-zinc-500 text-center px-2">
          Image unavailable
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-zinc-800/50 ${className}`}>
          <div className="w-6 h-6 border-2 border-zinc-600 border-t-violet-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        loading="lazy"
        onClick={onClick}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}

const downloadFile = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed:', error);
    window.open(url, '_blank');
  }
};

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

// ============================================
// VIBRA COLORS (Dark Theme - Violet Accent)
// ============================================
const COLORS = {
  // Sent message bubble (dark violet)
  sent: {
    bg: "#2d1f3d", // Dark violet
    text: "#e9edef",
    time: "rgba(233, 237, 239, 0.6)",
    replyBg: "rgba(0, 0, 0, 0.2)",
    replyBorder: "rgba(167, 139, 250, 0.6)",
  },
  // Received message bubble
  received: {
    bg: "#1c1c24", // Dark slate with slight purple tint
    text: "#e9edef",
    time: "rgba(233, 237, 239, 0.5)",
    replyBg: "rgba(0, 0, 0, 0.15)",
    replyBorder: "#8b5cf6",
  },
  // Accents (violet-500 based)
  accent: "#8b5cf6", // violet-500
  accentDark: "#7c3aed", // violet-600
  readTick: "#a78bfa", // violet-400 for read
  unreadTick: "rgba(233, 237, 239, 0.5)",
};

// ============================================
// REACTION PICKER (Fixed positioning)
// ============================================
function ReactionPicker({
  onSelect,
  onClose,
  position,
  mine
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position: "top" | "bottom";
  mine: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: position === "top" ? 8 : -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: position === "top" ? 8 : -8 }}
      transition={{ duration: 0.15 }}
      className={`absolute z-50 ${
        position === "top" ? "bottom-full mb-2" : "top-full mt-2"
      } ${mine ? "right-0" : "left-0"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex gap-1 bg-[#1c1c24] rounded-full px-2 py-1.5 shadow-2xl border border-[#2a2a35]">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="text-xl p-1.5 hover:bg-[#2a2a35] rounded-full transition-all active:scale-110"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================
// MESSAGE REACTIONS
// ============================================
function MessageReactions({
  reactions,
  mine,
  currentUserId,
  onReactionClick
}: {
  reactions?: MessageReaction[];
  mine: boolean;
  currentUserId: string | null;
  onReactionClick: (emoji: string) => void;
}) {
  if (!reactions || reactions.length === 0) return null;

  const grouped = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`flex z-[5] gap-1 -mt-2 mb-1 ${mine ? "justify-end mr-2" : "justify-start ml-2"}`}>
      {Object.entries(grouped).map(([emoji, count]) => {
        const hasMyReaction = reactions.some(r => r.emoji === emoji && r.userId === currentUserId);
        return (
          <button
            key={emoji}
            onClick={() => onReactionClick(emoji)}
            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs shadow-md border transition-transform active:scale-95 ${
              hasMyReaction
                ? "bg-[#2d1f3d]/50 border-[#2d1f3d]"
                : "bg-[#1c1c24]/50 border-[#1c1c24]"
            }`}
          >
            <span>{emoji}</span>
            {count > 1 && <span className="text-[#e9edef]/70 text-[10px]">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// REPLY PREVIEW (Inside bubble)
// ============================================
function ReplyPreview({ replyTo, mine }: { replyTo?: Message | null; mine: boolean }) {
  if (!replyTo) return null;

  const colors = mine ? COLORS.sent : COLORS.received;

  const getPreviewText = () => {
    if (replyTo.type === "audio") return "🎤 Voice message";
    if (replyTo.type === "file") return "📎 File";
    if (replyTo.type === "call_started") return "📞 Voice call";
    return replyTo.content?.substring(0, 60) + (replyTo.content && replyTo.content.length > 60 ? "..." : "");
  };

  return (
    <div
      className="mb-1 px-2.5 py-1.5 rounded-md border-l-4 text-left"
      style={{
        backgroundColor: colors.replyBg,
        borderLeftColor: colors.replyBorder,
      }}
    >
      <p className="text-[11px] font-medium" style={{ color: COLORS.accent }}>
        Reply
      </p>
      <p className="text-[13px] truncate" style={{ color: `${colors.text}99` }}>
        {getPreviewText()}
      </p>
    </div>
  );
}

// ============================================
// CALL MESSAGE (WhatsApp style)
// ============================================
function CallMessage({
  type,
  mine,
  timestamp,
  read
}: {
  type: "call_started" | "call_missed" | "call_declined";
  mine: boolean;
  timestamp: string;
  read?: boolean;
}) {
  const colors = mine ? COLORS.sent : COLORS.received;

  const getCallInfo = () => {
    if (type === "call_missed") {
      return {
        icon: <PhoneMissed className="w-[18px] h-[18px]" />,
        iconColor: "#ef4444",
        text: "Missed voice call",
        subtext: "Tap to call back"
      };
    }
    if (type === "call_declined") {
      return {
        icon: <PhoneMissed className="w-[18px] h-[18px]" />,
        iconColor: "#f97316",
        text: "Declined",
        subtext: ""
      };
    }
    return {
      icon: mine
        ? <PhoneOutgoing className="w-[18px] h-[18px]" />
        : <PhoneIncoming className="w-[18px] h-[18px]" />,
      iconColor: COLORS.accent,
      text: "Voice call",
      subtext: mine ? "Outgoing" : "Incoming"
    };
  };

  const callInfo = getCallInfo();

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${callInfo.iconColor}20` }}
      >
        <span style={{ color: callInfo.iconColor }}>{callInfo.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium" style={{ color: colors.text }}>
          {callInfo.text}
        </p>
        {callInfo.subtext && (
          <p className="text-[12px]" style={{ color: colors.time }}>
            {callInfo.subtext}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 self-end">
        <span className="text-[11px]" style={{ color: colors.time }}>
          {formatTime(timestamp)}
        </span>
        {mine && (
          read ? (
            <CheckCheck className="w-4 h-4" style={{ color: COLORS.readTick }} />
          ) : (
            <Check className="w-4 h-4" style={{ color: COLORS.unreadTick }} />
          )
        )}
      </div>
    </div>
  );
}

// ============================================
// VOICE MESSAGE (WhatsApp style with waveform)
// ============================================
function VoiceMessage({
  url,
  mine,
  initialDur,
  timestamp,
  read
}: {
  url: string;
  mine: boolean;
  initialDur?: number;
  messageId?: string;
  timestamp: string;
  read?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [dur, setDur] = useState(initialDur || 0);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const src = toAbsoluteVoiceUrl(url);
  const colors = mine ? COLORS.sent : COLORS.received;

  useEffect(() => {
    if (initialDur && initialDur > 0) {
      setDur(initialDur);
    }
  }, [initialDur]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;

    if (a.paused) {
      try {
        setError(null);
        await a.play();
        setPlaying(true);
      } catch {
        setError("Cannot play");
        setPlaying(false);
      }
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  // Generate waveform bars (static visual)
  const waveformBars = Array.from({ length: 28 }, (_, i) => {
    const height = Math.sin((i / 28) * Math.PI * 2 + i * 0.5) * 0.5 + 0.5;
    return 4 + height * 14;
  });

  return (
    <div className="flex items-center gap-2 min-w-[220px] py-1">
      {/* Play button */}
      <button
        onClick={toggle}
        disabled={loading || !!error}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 shrink-0"
        style={{ backgroundColor: COLORS.readTick }}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : playing ? (
          <Pause className="w-5 h-5 text-black" fill="black" />
        ) : (
          <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-[2px] h-6">
          {waveformBars.map((height, i) => {
            const isPlayed = (i / waveformBars.length) * 100 <= pct;
            return (
              <div
                key={i}
                className="w-[3px] rounded-full transition-colors duration-100"
                style={{
                  height: `${height}px`,
                  backgroundColor: isPlayed ? COLORS.accent : `${colors.text}40`,
                }}
              />
            );
          })}
        </div>

        {/* Duration and time */}
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: colors.time }}>
            {playing ? fmt(pos) : fmt(dur)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[11px]" style={{ color: colors.time }}>
              {formatTime(timestamp)}
            </span>
            {mine && (
              read ? (
                <CheckCheck className="w-4 h-4" style={{ color: COLORS.readTick }} />
              ) : (
                <Check className="w-4 h-4" style={{ color: COLORS.unreadTick }} />
              )
            )}
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        playsInline
        className="hidden"
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          if (Number.isFinite(a.duration)) setDur(a.duration);
        }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
        onEnded={() => {
          setPlaying(false);
          setPos(0);
        }}
      />
    </div>
  );
}

// ============================================
// FILE MESSAGE
// ============================================
function FileMessage({
  files,
  mine,
  timestamp,
  content,
  onImageClick,
  read
}: {
  files: Array<{ url: string; filename: string; mimetype: string; size: number }>;
  mine: boolean;
  timestamp: string;
  content?: string;
  onImageClick: (urls: string[], initialIndex?: number) => void;
  read?: boolean;
}) {
  const colors = mine ? COLORS.sent : COLORS.received;

  const getFileType = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimetype: string) => {
    const type = getFileType(mimetype);
    switch (type) {
      case 'image': return <ImageIcon className="w-6 h-6" />;
      case 'video': return <Film className="w-6 h-6" />;
      case 'audio': return <Music className="w-6 h-6" />;
      default: return <FileText className="w-6 h-6" />;
    }
  };

  const allImages = files.every(f => getFileType(f.mimetype) === 'image');
  const isSingleImage = files.length === 1 && allImages;
  const imageUrls = files
  .filter(f => getFileType(f.mimetype) === 'image')
  .map(f => toAbsoluteFileUrl(f.url));

  return (
    <div className="flex flex-col">
      {/* Image grid */}
      {allImages && (
        <div className={`grid gap-0.5 overflow-hidden -m-1 mb-0 ${
          files.length === 1 ? '' :
          files.length === 2 ? 'grid-cols-2' :
          files.length === 3 ? 'grid-cols-2' :
          'grid-cols-2'
        }`}>
        {files.slice(0, 4).map((file, index) => {
          const fileUrl = toAbsoluteFileUrl(file.url);
          const isLastWithMore = index === 3 && files.length > 4;

        return (
          <button
            key={index}
            onClick={() => onImageClick?.(imageUrls, index)}
            className={`relative overflow-hidden ${
              isSingleImage ? 'rounded-lg' : ''
            } ${files.length === 3 && index === 0 ? 'row-span-2' : ''}`}
          >
            <ImageWithFallback
              src={fileUrl}
              alt={file.filename}
              className={`w-full object-cover ${
                isSingleImage ? 'max-h-[280px] rounded-lg' :
                files.length === 3 && index === 0 ? 'h-full min-h-[200px]' :
                'h-[100px]'
              }`}
              onClick={() => onImageClick?.(imageUrls, index)}
            />
            {isLastWithMore && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                <span className="text-white text-2xl font-medium">+{files.length - 4}</span>
              </div>
            )}
          </button>
        );
      })}
        </div>
      )}

      {/* Non-image files */}
      {!allImages && files.map((file, index) => {
        const fileType = getFileType(file.mimetype);
        const fileUrl = toAbsoluteFileUrl(file.url);

        if (fileType === 'video') {
          return (
            <div key={index} className="relative -m-1 mb-0 rounded-lg overflow-hidden">
              <video
                src={fileUrl}
                controls
                className="max-w-full max-h-[280px] rounded-lg"
                preload="metadata"
              />
            </div>
          );
        }

        // Document style
        return (
          <button
            key={index}
            onClick={() => downloadFile(fileUrl, file.filename)}
            className="flex items-center gap-3 p-2 rounded-lg transition-colors text-left w-full active:opacity-80"
            style={{ backgroundColor: `${colors.text}10` }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#dd5047' }}
            >
              {getFileIcon(file.mimetype)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium truncate" style={{ color: colors.text }}>
                {file.filename}
              </p>
              <p className="text-[12px]" style={{ color: colors.time }}>
                {formatFileSize(file.size)} • PDF
              </p>
            </div>
            <Download className="w-5 h-5" style={{ color: colors.time }} />
          </button>
        );
      })}

      {/* Caption */}
      {content && (
        <p className="text-[14.5px] leading-[19px] mt-1 px-1" style={{ color: colors.text }}>
          {content}
        </p>
      )}

      {/* Timestamp overlay for images */}
      {allImages && !content && (
        <div className="flex justify-end items-center gap-1 absolute bottom-2 right-2 bg-black/40 rounded px-1.5 py-0.5">
          <span className="text-[11px] text-white/90">{formatTime(timestamp)}</span>
          {mine && (
            read ? (
              <CheckCheck className="w-4 h-4" style={{ color: COLORS.readTick }} />
            ) : (
              <Check className="w-4 h-4 text-white/70" />
            )
          )}
        </div>
      )}

      {/* Regular timestamp for files with caption */}
      {(content || !allImages) && (
        <div className="flex justify-end items-center gap-1 mt-1 px-1">
          <span className="text-[11px]" style={{ color: colors.time }}>
            {formatTime(timestamp)}
          </span>
          {mine && (
            read ? (
              <CheckCheck className="w-4 h-4" style={{ color: COLORS.readTick }} />
            ) : (
              <Check className="w-4 h-4" style={{ color: COLORS.unreadTick }} />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN MESSAGE BUBBLE
// ============================================
interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  showAvatar: boolean;
  lastInGroup: boolean;
  selectedUser: any;
  currentUserId: string | null;
  messageIndex: number;
  totalMessages: number;
  isTouch: boolean;
  isSelected?: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onLongPress: (element: HTMLElement) => void;
  onReply: () => void;
  onReactionSelect: (emoji: string) => void;
  onImageClick: (urls: string[], initialIndex?: number) => void;
  showReactionPicker: boolean;
  onToggleReactionPicker: () => void;
}

export function MessageBubble({
  message,
  mine,
  lastInGroup,
  currentUserId,
  messageIndex,
  isTouch,
  isSelected = false,
  onContextMenu,
  onLongPress,
  onReply,
  onReactionSelect,
  onImageClick,
  showReactionPicker,
  onToggleReactionPicker,
}: MessageBubbleProps) {
  const longPressTimerRef = useRef<number | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const colors = mine ? COLORS.sent : COLORS.received;

  const handleTouchStart = useCallback(() => {
    longPressTimerRef.current = window.setTimeout(() => {
      if (bubbleRef.current) {
        onLongPress(bubbleRef.current);
      }
    }, 500);
  }, [onLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const isMediaOnly = message.type === "file" && message.files && message.files.length > 0 &&
    message.files.every(f => f.mimetype.startsWith('image/')) && !message.content;

  return (
    <div 
      className={`flex ${mine ? "justify-end" : "justify-start"} ${lastInGroup ? "mb-[10px]" : "mb-[2px]"} px-[4%]`}
      data-message-bubble
    >
      <div className="relative group flex flex-col max-w-[85%] sm:max-w-[65%]">
        {/* Hover actions - ONLY for non-touch */}
        {!isTouch && (
          <div
            className={`absolute ${mine ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10`}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onToggleReactionPicker(); }}
              className="p-1.5 rounded-full transition-colors"
              title="React"
            >
              <Smile className="w-4 h-4 text-[#8696a0]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReply(); }}
              className="p-1.5 rounded-full transition-colors"
              title="Reply"
            >
              <Reply className="w-4 h-4 text-[#8696a0]" />
            </button>
          </div>
        )}

        {/* Reaction picker - ONLY for non-touch */}
        <AnimatePresence>
          {showReactionPicker && !isTouch && (
            <ReactionPicker
              onSelect={onReactionSelect}
              onClose={onToggleReactionPicker}
              position={messageIndex < 3 ? "bottom" : "top"}
              mine={mine}
            />
          )}
        </AnimatePresence>

        {/* Message bubble */}
        <div
          ref={bubbleRef}
          className={`relative ${isMediaOnly ? 'p-[3px]' : 'px-[9px] py-[6px]'} ${
            isSelected ? 'ring-2 ring-violet-900 ring-offset-2 ring-offset-[#0a0a0f]' : ''
          }`}
          style={{
            backgroundColor: colors.bg,
            borderRadius: lastInGroup
              ? mine ? '8px 8px 0 8px' : '8px 8px 8px 0'
              : '8px',
          }}
          onContextMenu={onContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {/* Tail */}
          {lastInGroup && (
            <div
              className={`absolute bottom-0 w-[12px] h-[12px] ${mine ? '-right-[8px]' : '-left-[8px]'}`}
              style={{
                backgroundColor: colors.bg,
                clipPath: mine
                  ? 'polygon(0 0, 0 100%, 100% 100%)'
                  : 'polygon(100% 0, 0 100%, 100% 100%)',
              }}
            />
          )}

          {/* Reply preview */}
          {message.replyTo && <ReplyPreview replyTo={message.replyTo} mine={mine} />}

          {/* Content - same as before */}
          {message.type === "audio" && message.audioUrl ? (
            <VoiceMessage url={message.audioUrl} mine={mine} initialDur={message.audioDuration} messageId={message._id} timestamp={message.createdAt} read={message.read} />
          ) : message.type === "call_started" || message.type === "call_missed" || message.type === "call_declined" ? (
            <CallMessage type={message.type} mine={mine} timestamp={message.createdAt} read={message.read} />
          ) : message.type === "file" && message.files && message.files.length > 0 ? (
            <FileMessage files={message.files} mine={mine} timestamp={message.createdAt} content={message.content} onImageClick={onImageClick} read={message.read} />
          ) : (
            <div className="relative">
              <p className="text-[14.5px] leading-[19px] break-words whitespace-pre-wrap pr-[70px]" style={{ color: colors.text }}>
                {message.content}
              </p>
              <span className="float-right relative -mr-[4px] ml-[8px] -mb-[4px] flex items-center gap-1" style={{ marginTop: '-18px' }}>
                <span className="text-[11px]" style={{ color: colors.time }}>{formatTime(message.createdAt)}</span>
                {mine && (message.read ? <CheckCheck className="w-[18px] h-[18px]" style={{ color: COLORS.readTick }} /> : <Check className="w-[18px] h-[18px]" style={{ color: COLORS.unreadTick }} />)}
              </span>
            </div>
          )}
        </div>

        {/* Reactions */}
        <MessageReactions reactions={message.reactions} mine={mine} currentUserId={currentUserId} onReactionClick={onReactionSelect} />
      </div>
    </div>
  );
}