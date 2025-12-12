import Topbar from "@/components/Topbar";
import { useChatStore } from "@/stores/useChatStore";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useRef, useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import UsersList from "./components/UsersList";
import ChatHeader from "./components/ChatHeader";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import MessageInput from "./components/MessageInput";
import { ArrowDown, Play, Pause, PhoneIncoming, PhoneOutgoing, PhoneMissed, Trash2, AlertTriangle } from "lucide-react";
import { axiosInstance } from "@/lib/axios";
import { FileText, Image as ImageIcon, Film, Music, Download, X } from "lucide-react";

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

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
      
      // Clean up
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

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

// ✅ Custom Audio Player for file audio messages (matches VoiceMessage style)
function AudioFileMessage({
  url,
  filename,
  mine,
  timestamp,
}: {
  url: string;
  filename: string;
  mine: boolean;
  timestamp: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [dur, setDur] = useState(0);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const handleLoadStart = () => {
      setLoading(true);
      setError(null);
    };

    const handleLoadedMetadata = () => {
      setLoading(false);
      if (Number.isFinite(a.duration)) {
        setDur(a.duration);
      }
    };

    const handleCanPlay = () => {
      setLoading(false);
      if (Number.isFinite(a.duration)) {
        setDur(a.duration);
      }
    };

    const handleTimeUpdate = () => {
      setPos(a.currentTime || 0);
    };

    const handleEnded = () => {
      setPlaying(false);
      a.currentTime = 0;
      setPos(0);
    };

    const handleError = () => {
      setLoading(false);
      setPlaying(false);
      setError("Failed to load");
    };

    a.addEventListener('loadstart', handleLoadStart);
    a.addEventListener('loadedmetadata', handleLoadedMetadata);
    a.addEventListener('canplay', handleCanPlay);
    a.addEventListener('timeupdate', handleTimeUpdate);
    a.addEventListener('ended', handleEnded);
    a.addEventListener('error', handleError);

    return () => {
      a.removeEventListener('loadstart', handleLoadStart);
      a.removeEventListener('loadedmetadata', handleLoadedMetadata);
      a.removeEventListener('canplay', handleCanPlay);
      a.removeEventListener('timeupdate', handleTimeUpdate);
      a.removeEventListener('ended', handleEnded);
      a.removeEventListener('error', handleError);
    };
  }, [url]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;

    if (a.paused) {
      try {
        setError(null);
        await a.play();
        setPlaying(true);
      } catch (e: any) {
        console.warn("Play failed:", e);
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

  return (
    <div className="flex flex-col gap-1">
      {/* Filename */}
      <div className={`flex items-center gap-2 mb-1 ${mine ? "text-white/80" : "text-zinc-300"}`}>
        <Music className="size-3.5" />
        <span className="text-xs truncate max-w-[150px]">{filename}</span>
      </div>
      
      {/* Player controls */}
      <div className={`flex items-center gap-3 ${mine ? "text-white" : "text-zinc-100"}`}>
        <button
          onClick={toggle}
          disabled={loading || !!error}
          className={`p-2 rounded-full transition ${
            mine
              ? "bg-white/20 hover:bg-white/30 disabled:opacity-50"
              : "bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50"
          }`}
          title={error ? error : playing ? "Pause" : "Play"}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
          ) : error ? (
            <div className="w-4 h-4 text-red-400">!</div>
          ) : playing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-[100px] lg:min-w-[150px]">
          <div className={`h-1.5 rounded-full ${mine ? "bg-white/30" : "bg-zinc-700"}`}>
            <div
              className={`h-1.5 rounded-full transition-all duration-100 ${
                mine ? "bg-white" : "bg-violet-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-1 text-[10px] opacity-70">
            {playing ? (
              <span>
                {fmt(pos)} / {error ? "--:--" : fmt(dur)}
              </span>
            ) : (
              <span>{error ? "--:--" : fmt(dur)}</span>
            )}
          </div>
        </div>

        <audio
          ref={audioRef}
          src={url}
          crossOrigin="anonymous"
          preload="metadata"
          playsInline
          className="hidden"
        />
      </div>

      <span className={`-mt-3 text-[10px] ${mine ? "text-white/60" : "text-zinc-400"} text-right`}>
        {formatTime(timestamp)}
      </span>
    </div>
  );
}

// ✅ Updated FileMessage component
function FileMessage({
  files,
  mine,
  timestamp,
  content,
  onImageClick,
}: {
  files: Array<{
    url: string;
    filename: string;
    mimetype: string;
    size: number;
  }>;
  mine: boolean;
  timestamp: string;
  content?: string;
  onImageClick?: (url: string) => void;
}) {
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
      case 'image': return <ImageIcon className="size-5" />;
      case 'video': return <Film className="size-5" />;
      case 'audio': return <Music className="size-5" />;
      default: return <FileText className="size-5" />;
    }
  };

  const handleDownload = (e: React.MouseEvent, fileUrl: string, filename: string) => {
    e.preventDefault();
    e.stopPropagation();
    downloadFile(fileUrl, filename);
  };

  // Check if all files are the same type for grid layout
  const allImages = files.every(f => getFileType(f.mimetype) === 'image');

  return (
    <div className="flex flex-col gap-2">
      <div className={`grid gap-2 ${allImages && files.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {files.map((file, index) => {
          const fileType = getFileType(file.mimetype);
          const fileUrl = toAbsoluteFileUrl(file.url);

          if (fileType === 'image') {
            return (
              <button
                key={index}
                onClick={() => onImageClick?.(fileUrl)}
                className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity cursor-zoom-in"
              >
                <img
                  src={fileUrl}
                  alt={file.filename}
                  className="max-w-full max-h-52 object-cover rounded-lg"
                  loading="lazy"
                />
              </button>
            );
          }

          if (fileType === 'video') {
            return (
              <video
                key={index}
                src={fileUrl}
                controls
                className="max-w-full max-h-52 rounded-lg"
                preload="metadata"
              />
            );
          }

          // ✅ Use custom audio player for audio files
          if (fileType === 'audio') {
            return (
              <AudioFileMessage
                key={index}
                url={fileUrl}
                filename={file.filename}
                mine={mine}
                timestamp={timestamp}
              />
            );
          }

          // Document/other files
          return (
            <button
              key={index}
              onClick={(e) => handleDownload(e, fileUrl, file.filename)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors text-left w-full ${
                mine
                  ? 'bg-white/10 hover:bg-white/20'
                  : 'bg-zinc-700/50 hover:bg-zinc-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${mine ? 'bg-white/20' : 'bg-zinc-600'}`}>
                {getFileIcon(file.mimetype)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.filename}</p>
                <p className={`text-xs ${mine ? 'text-white/60' : 'text-zinc-400'}`}>
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Download className="size-4 opacity-60 shrink-0" />
            </button>
          );
        })}
      </div>

      {content && <p className="mt-1">{content}</p>}

      {/* Only show timestamp if not an audio file (audio shows its own) */}
      {!files.some(f => getFileType(f.mimetype) === 'audio') && (
        <span className={`text-[10px] ${mine ? "text-white/60" : "text-zinc-400"} text-right`}>
          {formatTime(timestamp)}
        </span>
      )}
    </div>
  );
}

function ImagePreviewModal({
  imageUrl,
  onClose,
}: {
  imageUrl: string | null;
  onClose: () => void;
}) {
  if (!imageUrl) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Extract filename from URL or use default
    const filename = imageUrl.split('/').pop() || 'image.jpg';
    downloadFile(imageUrl, filename);
  };

  return (
    <AnimatePresence>
      {imageUrl && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Image Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top bar with buttons */}
              <div className="absolute -top-12 right-0 flex items-center gap-2">
                {/* Download button */}
                <button
                  onClick={handleDownload}
                  className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
                  title="Download"
                >
                  <Download className="size-6" />
                </button>
                
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
                  title="Close"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* Image */}
              <img
                src={imageUrl}
                alt="Preview"
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ✅ Custom Delete Dialog
function DeleteDialog({ 
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
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{title}</h3>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="flex gap-3 p-6 pt-4 bg-zinc-900/50">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
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

// ✅ Desktop delete menu
function DeleteMenu({ 
  onDelete,
  position 
}: { 
  onDelete: () => void;
  onClose: () => void;
  position: { x: number; y: number };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden z-50 min-w-[140px]"
      style={{ top: position.y, left: position.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onDelete}
        className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-zinc-700 transition-colors text-red-400 text-sm"
      >
        <Trash2 className="w-4 h-4" />
        <span className="hidden md:inline">Delete message</span>
      </button>
    </motion.div>
  );
}

function CallMessage({ 
  type, 
  mine, 
  timestamp 
}: { 
  type: "call_started" | "call_missed" | "call_declined";
  mine: boolean;
  timestamp: string;
}) {
  const getIcon = () => {
    if (type === "call_missed") {
      return <PhoneMissed className={`w-4 h-4 ${mine ? "text-orange-500" : "text-red-400"}`} />;
    }
    if (type === "call_declined") {
      return <PhoneMissed className={`w-4 h-4 ${mine ? "text-orange-300" : "text-orange-400"}`} />;
    }
    if (mine) {
      return <PhoneOutgoing className="w-4 h-4 text-teal-300" />;
    }
    return <PhoneIncoming className="w-4 h-4 text-green-400" />;
  };

  const getText = () => {
    if (type === "call_missed") return "Missed call";
    if (type === "call_declined") return "Declined call";
    return "Voice call";
  };

  const getTextColor = () => mine ? "text-white/90": "text-white/80";

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-2 ${getTextColor()} font-medium`}>
        {getIcon()}
        <span className="text-sm">{getText()}</span>
      </div>
      <span className={`text-[10px] ${mine ? "text-white/60" : "text-zinc-400"} text-right`}>
        {formatTime(timestamp)}
      </span>
    </div>
  );
}

function VoiceMessage({
  url,
  mine,
  initialDur,
  messageId,
  timestamp,
}: {
  url: string;
  mine: boolean;
  initialDur?: number;
  messageId?: string;
  timestamp: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [dur, setDur] = useState(initialDur || 0);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const src = toAbsoluteVoiceUrl(url);
  const hasPatchedRef = useRef(false);

  useEffect(() => {
    if (initialDur && initialDur > 0) {
      setDur(initialDur);
    }
  }, [initialDur]);

  useEffect(() => {
    setPlaying(false);
    setPos(0);
    setError(null);
    setLoading(false);
    hasPatchedRef.current = false;
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
  }, [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const computeDuration = (audio: HTMLAudioElement) => {
      let d = audio.duration;
      if (!Number.isFinite(d) || d === Infinity) {
        if (audio.seekable && audio.seekable.length > 0) {
          d = audio.seekable.end(audio.seekable.length - 1);
        } else {
          d = 0;
        }
      }
      return d || 0;
    };

    const updateDuration = async (audio: HTMLAudioElement) => {
      const newDur = computeDuration(audio);
      if ((!initialDur || initialDur <= 0) && newDur > 0 && Math.abs(newDur - dur) > 0.2) {
        setDur(newDur);
        
        if (!hasPatchedRef.current && messageId) {
          hasPatchedRef.current = true;
          try {
            await axiosInstance.patch(`/chat/messages/${messageId}/duration`, {
              duration: Math.round(newDur)
            });
          } catch (err) {
            console.warn("Failed to update duration:", err);
          }
        }
      }
    };

    const handleLoadStart = () => {
      setLoading(true);
      setError(null);
    };

    const handleLoadedMetadata = () => {
      setLoading(false);
      updateDuration(a);
    };

    const handleLoadedData = () => {
      setLoading(false);
      updateDuration(a);
    };

    const handleCanPlay = () => {
      setLoading(false);
      updateDuration(a);
    };

    const handleDurationChange = () => {
      updateDuration(a);
    };

    const handleTimeUpdate = () => {
      setPos(a.currentTime || 0);
      if (dur === 0) {
        updateDuration(a);
      }
    };

    const handleEnded = () => {
      setPlaying(false);
      a.currentTime = 0;
      setPos(0);
    };

    const handleError = () => {
      setLoading(false);
      setPlaying(false);
      setError("Failed to load");
    };

    a.addEventListener('loadstart', handleLoadStart);
    a.addEventListener('loadedmetadata', handleLoadedMetadata);
    a.addEventListener('loadeddata', handleLoadedData);
    a.addEventListener('canplay', handleCanPlay);
    a.addEventListener('durationchange', handleDurationChange);
    a.addEventListener('timeupdate', handleTimeUpdate);
    a.addEventListener('ended', handleEnded);
    a.addEventListener('error', handleError);

    return () => {
      a.removeEventListener('loadstart', handleLoadStart);
      a.removeEventListener('loadedmetadata', handleLoadedMetadata);
      a.removeEventListener('loadeddata', handleLoadedData);
      a.removeEventListener('canplay', handleCanPlay);
      a.removeEventListener('durationchange', handleDurationChange);
      a.removeEventListener('timeupdate', handleTimeUpdate);
      a.removeEventListener('ended', handleEnded);
      a.removeEventListener('error', handleError);
    };
  }, [src, dur, initialDur, messageId]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    
    if (a.paused) {
      try {
        setError(null);
        await a.play();
        setPlaying(true);
      } catch (e: any) {
        console.warn("Play failed:", e);
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

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-3 ${mine ? "text-white" : "text-zinc-100"}`}>
        <button
          onClick={toggle}
          disabled={loading || !!error}
          className={`p-2 rounded-full transition ${
            mine 
              ? "bg-white/20 hover:bg-white/30 disabled:opacity-50" 
              : "bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50"
          }`}
          title={error ? error : (playing ? "Pause" : "Play")}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
          ) : error ? (
            <div className="w-4 h-4 text-red-400">!</div>
          ) : playing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
        
        <div className="flex-1 min-w-[100px] lg:min-w-[150px]">
          <div className={`h-1.5 rounded-full ${mine ? "bg-white/30" : "bg-zinc-700"}`}>
            <div
              className={`h-1.5 rounded-full transition-all duration-100 ${
                mine ? "bg-white" : "bg-violet-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          
          <div className="mt-1 text-[10px] opacity-70">
            {playing ? (
              <span>{fmt(pos)} / {error ? "--:--" : fmt(dur)}</span>
            ) : (
              <span>{error ? "--:--" : fmt(dur)}</span>
            )}
          </div>
        </div>
        
        <audio
          key={src}
          ref={audioRef}
          src={src}
          crossOrigin="anonymous"
          preload="metadata"
          playsInline
          className="hidden"
        />
      </div>
      
      <span className={`-mt-4 text-[10px] ${mine ? "text-white/60" : "text-zinc-400"} text-right`}>
        {formatTime(timestamp)}
      </span>
    </div>
  );
}

const ChatPage = () => {
  const { user } = useUser();
  const { selectedUser, fetchUsers, fetchMessages, messagesByUser } = useChatStore();

  const messages = selectedUser ? messagesByUser[selectedUser.clerkId] || [] : [];

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [atBottom, setAtBottom] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    messageId: string;
    position: { x: number; y: number };
  } | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // ✅ State for delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  useEffect(() => {
    if (user) fetchUsers();
  }, [fetchUsers, user]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.clerkId);
    }
  }, [selectedUser, fetchMessages]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const vp = viewportRef.current;
    if (vp) {
      vp.scrollTo({ top: vp.scrollHeight, behavior });
    } else {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    }
  };

  const isNearBottom = (vp: HTMLDivElement | null, threshold = 16) => {
    if (!vp) return true;
    const distance = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
    return distance <= threshold;
  };

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const onScroll = () => setAtBottom(isNearBottom(vp));
    vp.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const onResize = () => onScroll();
    window.addEventListener("resize", onResize);

    return () => {
      vp.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [selectedUser?.clerkId]);

  useLayoutEffect(() => {
    if (!selectedUser) return;
    requestAnimationFrame(() => scrollToBottom("auto"));
    const t1 = setTimeout(() => scrollToBottom("auto"), 70);
    const t2 = setTimeout(() => scrollToBottom("auto"), 160);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selectedUser?.clerkId]);

  useEffect(() => {
    if (!selectedUser || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.senderId === user?.id || isNearBottom(viewportRef.current)) {
      scrollToBottom("smooth");
    }
  }, [messages.length, selectedUser?.clerkId, user?.id]);

  useEffect(() => {
    if (isDesktop || !selectedUser) return;

    let startX: number | null = null;
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (startX === null) return;
      const diff = e.touches[0].clientX - startX;
      if (diff > 90) {
        useChatStore.getState().setSelectedUser(null);
        startX = null;
      }
    };
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [selectedUser, isDesktop]);

  useEffect(() => {
    if (!contextMenu) return;
    
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const isFirstInGroup = (idx: number) =>
    idx === 0 || messages[idx - 1]?.senderId !== messages[idx]?.senderId;

  const isLastInGroup = (idx: number) =>
    idx === messages.length - 1 || messages[idx + 1]?.senderId !== messages[idx]?.senderId;

  // ✅ Delete with axiosInstance
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await axiosInstance.delete(`/chat/messages/${messageId}`);
      
      if (selectedUser) {
        fetchMessages(selectedUser.clerkId, true);
      }
    } catch (error: any) {
      console.error("Failed to delete message:", error);
      alert(error.response?.data?.error || "Failed to delete message");
    }
  };

  // ✅ Open delete dialog
  const openDeleteDialog = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string, mine: boolean) => {
    if (!mine) return;
    
    e.preventDefault();
    setContextMenu({
      messageId,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  // ✅ Fixed long-press handler - NO preventDefault
  const handleLongPressStart = (messageId: string, mine: boolean) => {
    if (!mine) return null;
    
    let timer: number | null = null;
    
    const start = () => {
      timer = window.setTimeout(() => {
        openDeleteDialog(messageId);
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, 500);
    };
    
    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    
    return {
      onTouchStart: start,
      onTouchEnd: clear,
      onTouchMove: clear,
    };
  };

  const showScrollButton = !atBottom && messages.length > 0;

  return (
    <main className="h-full rounded-lg bg-gradient-to-b from-zinc-900 to-zinc-900 overflow-hidden">
      <Topbar />

      <div className="grid h-[calc(100vh-180px)] grid-cols-1 lg:grid-cols-[300px_1fr]">
        <div className={`${selectedUser ? "hidden sm:hidden lg:block" : "block"} border-r border-zinc-800`}>
          <UsersList />
        </div>

        <AnimatePresence mode="wait">
          {selectedUser ? (
            <motion.div
              key={selectedUser.clerkId}
              initial={isDesktop ? false : { x: "100%", opacity: 0 }}
              animate={isDesktop ? {} : { x: 0, opacity: 1 }}
              exit={isDesktop ? undefined : { x: "100%", opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex flex-col h-full w-full relative"
            >
              <ChatHeader />

              <div className="flex-1 relative overflow-hidden">
                <div
                  ref={viewportRef}
                  className="absolute inset-0 overflow-y-auto overscroll-contain no-scrollbar pr-1"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div className="p-4 space-y-1 pb-24">
                    {messages.map((message: any, idx: number) => {
                      const mine = message.senderId === user?.id;
                      const showAvatar = isFirstInGroup(idx);
                      const lastInGroup = isLastInGroup(idx);
                      
                      const longPressProps = handleLongPressStart(message._id, mine) || {};

                      return (
                        <div
                          key={message._id}
                          className={`flex items-end gap-2 py-1 ${
                            mine ? "justify-end pl-12" : "justify-start pr-12"
                          }`}
                        >
                          {!mine && showAvatar && (
                            <Avatar className="size-7 shrink-0 shadow-sm ring-1 ring-white/10">
                              <AvatarImage src={selectedUser.imageUrl} />
                            </Avatar>
                          )}
                          {!mine && !showAvatar && <div className="w-7" />}

                          <div
                            className={[
                              "group relative",
                              "max-w-[78%] sm:max-w-[70%] md:max-w-[60%]",
                              "rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
                              mine
                                ? "bg-gradient-to-br from-violet-600 to-violet-700 text-white shadow-md ring-1 ring-white/10"
                                : "bg-zinc-800 text-zinc-100 ring-1 ring-white/5",
                              mine && lastInGroup ? "rounded-br-md" : "",
                              !mine && lastInGroup ? "rounded-bl-md" : "",
                            ].join(" ")}
                            onContextMenu={(e) => handleContextMenu(e, message._id, mine)}
                            {...longPressProps}
                            style={{
                              touchAction: 'manipulation'
                            }}
                          >
                            {/* Inside the message bubble div */}
                            {message.type === "audio" && message.audioUrl ? (
                              <VoiceMessage
                                url={message.audioUrl}
                                mine={mine}
                                initialDur={message.audioDuration}
                                messageId={message._id}
                                timestamp={message.createdAt}
                              />
                            ) : message.type === "call_started" ||
                              message.type === "call_missed" ||
                              message.type === "call_declined" ? (
                              <CallMessage type={message.type} mine={mine} timestamp={message.createdAt} />
                            ) : message.type === "file" && message.files?.length > 0 ? (
                              <FileMessage
                                files={message.files}
                                mine={mine}
                                timestamp={message.createdAt}
                                content={message.content}
                                onImageClick={(url) => setImagePreview(url)}
                              />
                            ) : (
                              <>
                                <p>{message.content}</p>
                                <span className={`mt-1 block text-[10px] ${mine ? "text-white/70" : "text-zinc-400"} text-right`}>
                                  {formatTime(message.createdAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                </div>

                {!atBottom && (
                  <div className="pointer-events-none absolute bottom-14 left-0 right-0 h-10" />
                )}

                {showScrollButton && (
                  <button
                    onClick={() => scrollToBottom("smooth")}
                    className="absolute bottom-20 right-4 z-40 bg-zinc-900/50 lg:hover:bg-zinc-900/80 text-white rounded-full p-3 shadow-lg ring-1 ring-white/10 transition-transform active:scale-95"
                    aria-label="Scroll to bottom"
                  >
                    <ArrowDown className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="shrink-0 px-3">
                <MessageInput />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="no-chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="hidden lg:flex flex-col flex-1 items-center justify-center p-6"
            >
              <NoConversationPlaceholder />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ✅ Desktop context menu */}
      <AnimatePresence>
        {contextMenu && (
          <DeleteMenu
            position={contextMenu.position}
            onDelete={() => openDeleteDialog(contextMenu.messageId)}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      <ImagePreviewModal
        imageUrl={imagePreview}
        onClose={() => setImagePreview(null)}
      />

      {/* ✅ Delete dialog */}
      <DeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setMessageToDelete(null);
        }}
        onConfirm={() => {
          if (messageToDelete) {
            handleDeleteMessage(messageToDelete);
          }
          setMessageToDelete(null);
        }}
      />
    </main>
  );
};

export default ChatPage;

const NoConversationPlaceholder = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-6">
    <img src="/vibra.png" alt="Vibra" className="size-16 animate-bounce" />
    <div className="text-center">
      <h3 className="text-zinc-300 text-lg font-medium mb-1">
        No conversation selected
      </h3>
      <p className="text-zinc-500 text-sm">Choose a friend to start chatting</p>
    </div>
  </div>
);