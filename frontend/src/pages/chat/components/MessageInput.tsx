// components/MessageInput.tsx
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/useChatStore";
import { useUser } from "@clerk/clerk-react";
import {
  Send,
  Mic,
  Square,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  AlertTriangle,
  Smile
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useRecorder } from "@/hooks/useRecorder";
import { axiosInstance } from "@/lib/axios";
import { motion, AnimatePresence } from "framer-motion";

type Props = { onFocus?: () => void };

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_FILES = 5;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'video/mp4', 'video/webm', 'video/quicktime',
];

interface FilePreview {
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'audio' | 'document';
}

// Complete emoji list with more emojis
const EMOJI_DATA = {
  recent: ["😊", "😂", "❤️", "👍", "🔥", "✨", "🎉", "💯", "🙌", "😍", "🥰", "😘"],
  smileys: [
    "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉",
    "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝",
    "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒",
    "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
    "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓",
    "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧",
    "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫"
  ],
  gestures: [
    "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘",
    "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛",
    "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾",
    "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀",
    "👁️", "👅", "👄", "💋", "🩸"
  ],
  music: [
    "🎵", "🎶", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🪕", "🎻",
    "🎙️", "🔊", "🔉", "🔈", "📻", "🎚️", "🎛️", "🎰", "🎬", "🎭", "🎨", "🎪",
    "🎟️", "🎫", "🎮", "🕹️", "🎲", "🧩", "♟️", "🎯", "🎳", "🎱"
  ],
  hearts: [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
    "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "❤️‍🔥", "❤️‍🩹", "💌"
  ],
  objects: [
    "⭐", "🌟", "✨", "💫", "🔥", "💥", "💢", "💦", "💨", "🕳️", "💣", "💬",
    "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈",
    "🥉", "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀",
    "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣"
  ],
};

type EmojiCategory = keyof typeof EMOJI_DATA;

function EmojiPicker({
  onSelect,
  onClose
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<EmojiCategory>("recent");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const categories: { key: EmojiCategory; icon: string; label: string }[] = [
    { key: "recent", icon: "🕐", label: "Recent" },
    { key: "smileys", icon: "😊", label: "Smileys" },
    { key: "gestures", icon: "👋", label: "Gestures" },
    { key: "music", icon: "🎵", label: "Music" },
    { key: "hearts", icon: "❤️", label: "Hearts" },
    { key: "objects", icon: "⭐", label: "Objects" },
  ];

  return (
    <motion.div
      ref={pickerRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full mb-0.5 left-2 right-2 sm:left-2 md:right-auto md:left-2 sm:right-auto sm:w-[340px] z-50"
    >
      <div className="bg-[#1c1c24] rounded-2xl border border-[#2a2a35] shadow-2xl overflow-hidden">
        {/* Search bar placeholder - optional */}
        <div className="px-3 py-2 border-b border-[#2a2a35]">
          <div className="text-xs text-zinc-500 font-medium">{categories.find(c => c.key === activeCategory)?.label}</div>
        </div>

        {/* Emoji grid - FIXED: More emojis visible */}
        <div className="p-2 h-[280px] overflow-y-auto">
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJI_DATA[activeCategory].map((emoji, index) => (
              <button
                key={`${activeCategory}-${emoji}-${index}`}
                onClick={() => {
                  onSelect(emoji);
                }}
                className="p-2 text-2xl hover:bg-[#2a2a35] rounded-lg transition-colors active:scale-90 flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex border-t border-[#2a2a35] px-1 py-1 gap-0.5 bg-[#15151d]">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex-1 py-2 rounded-lg text-lg transition-colors ${
                activeCategory === cat.key
                  ? "bg-violet-600/20 text-violet-400"
                  : "hover:bg-[#2a2a35] text-zinc-500"
              }`}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  type = "error"
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "error" | "warning" | "info";
}) {
  const iconColors = {
    error: "bg-red-500/10 text-red-500",
    warning: "bg-amber-500/10 text-amber-500",
    info: "bg-violet-500/10 text-violet-500",
  };

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
              className="bg-[#1c1c24] rounded-2xl shadow-2xl border border-[#2a2a35] w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColors[type]}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed ml-[52px]">{message}</p>
              </div>
              <div className="flex justify-end p-4 pt-0">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-[#2a2a35] hover:bg-[#3a3a45] text-white font-medium transition-colors text-sm"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

const MessageInput = ({ onFocus }: Props) => {
  const [newMessage, setNewMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "error" | "warning" | "info";
  }>({ isOpen: false, title: "", message: "", type: "error" });

  const { user } = useUser();
  const { selectedUser, sendMessage, socket, replyingTo, setReplyingTo } = useChatStore();
  const { isRecording, permissionError, start, stop, cancel } = useRecorder();

  const [recordingMode, setRecordingMode] = useState<
    "idle" | "holding" | "locked"
  >("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [slideCancelled, setSlideCancelled] = useState(false);
  
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartXRef = useRef<number>(0);
  const isHoldingRef = useRef(false);
  const didRecordRef = useRef(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showAlert = (title: string, message: string, type: "error" | "warning" | "info" = "error") => {
    setAlertDialog({ isOpen: true, title, message, type });
  };

  const closeAlert = () => {
    setAlertDialog(prev => ({ ...prev, isOpen: false }));
  };

  const getFileType = (mimeType: string): FilePreview['type'] => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getFileIcon = (type: FilePreview['type']) => {
    switch (type) {
      case 'image': return <ImageIcon className="size-4" />;
      case 'video': return <Film className="size-4" />;
      case 'audio': return <Music className="size-4" />;
      default: return <FileText className="size-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: FilePreview[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" is too large (${formatFileSize(file.size)})`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        const ext = file.name.split('.').pop() || 'unknown';
        errors.push(`"${file.name}" (.${ext}) is not supported`);
        continue;
      }
      const fileType = getFileType(file.type);
      const filePreview: FilePreview = { file, type: fileType };
      if (fileType === 'image') {
        filePreview.preview = URL.createObjectURL(file);
      }
      validFiles.push(filePreview);
    }

    if (errors.length > 0) {
      const isSizeError = errors.some(e => e.includes('too large'));
      const isTypeError = errors.some(e => e.includes('not supported'));
      let title = "File Error";
      let type: "error" | "warning" = "error";
      if (isSizeError && !isTypeError) {
        title = "File Too Large";
        type = "warning";
      } else if (isTypeError && !isSizeError) {
        title = "Unsupported Format";
        type = "warning";
      }
      showAlert(title, errors.length === 1 ? errors[0] : `${errors.length} files couldn't be added:\n• ${errors.join('\n• ')}`, type);
    }

    const totalFiles = selectedFiles.length + validFiles.length;
    if (totalFiles > MAX_FILES) {
      const canAdd = MAX_FILES - selectedFiles.length;
      if (canAdd <= 0) {
        showAlert("Maximum Files Reached", `You can only attach up to ${MAX_FILES} files at once.`, "info");
        validFiles.length = 0;
      } else {
        showAlert("Some Files Skipped", `Only ${canAdd} more file${canAdd > 1 ? 's' : ''} can be added. Maximum is ${MAX_FILES} files.`, "info");
        validFiles.splice(canAdd);
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles].slice(0, MAX_FILES));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

// Handle files dropped from ChatPage
  useEffect(() => {
  const handleFilesDropped = (e: CustomEvent<{ files: File[] }>) => {
    const droppedFiles = e.detail.files;
    const validFiles: FilePreview[] = [];
    const errors: string[] = [];

    for (const file of droppedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" is too large`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" is not supported`);
        continue;
      }
      const fileType = getFileType(file.type);
      const filePreview: FilePreview = { file, type: fileType };
      if (fileType === 'image') {
        filePreview.preview = URL.createObjectURL(file);
      }
      validFiles.push(filePreview);
    }

    if (errors.length > 0) {
      showAlert("Some files skipped", errors.join(', '), "warning");
    }

    const totalFiles = selectedFiles.length + validFiles.length;
    if (totalFiles > MAX_FILES) {
      validFiles.splice(MAX_FILES - selectedFiles.length);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles].slice(0, MAX_FILES));
    }
  };

  window.addEventListener('chat-files-dropped', handleFilesDropped as EventListener);
  
  return () => window.removeEventListener('chat-files-dropped', handleFilesDropped as EventListener);
}, [selectedFiles.length]);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const clearFiles = () => {
    selectedFiles.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setSelectedFiles([]);
  };

  const handleSendFiles = async () => {
    if (!selectedUser || !user || selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      selectedFiles.forEach(fp => {
        formData.append('files', fp.file);
      });

      const { data } = await axiosInstance.post('/chat/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      if (data.files && data.files.length > 0) {
        socket.emit("send_file", {
          senderId: user.id,
          receiverId: selectedUser.clerkId,
          files: data.files,
          content: newMessage.trim(),
          replyToId: replyingTo?._id || null,
        });
      }

      clearFiles();
      setNewMessage("");
      setReplyingTo(null);
      setTimeout(() => onFocus?.(), 50);

    } catch (error: any) {
      console.error("File upload failed:", error);
      showAlert("Upload Failed", error.response?.data?.error || "Failed to upload files. Please try again.", "error");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSendText = () => {
    if (selectedFiles.length > 0) {
      handleSendFiles();
      return;
    }

    const text = newMessage.trim();
    if (!selectedUser || !user || !text) return;

    sendMessage(selectedUser.clerkId, user.id, text, replyingTo?._id);
    setNewMessage("");
    setReplyingTo(null);
    setShowEmojiPicker(false);

    setTimeout(() => {
      inputRef.current?.focus();
      onFocus?.();
    }, 50);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  const startDurationTimer = () => {
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };
  
  const stopDurationTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingDuration(0);
  };
  
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (recordingTimerRef.current)
        clearInterval(recordingTimerRef.current);
    };
  }, []);
  
  const startRecording = async () => {
    await start();
    startDurationTimer();
  };
  
  const stopAndSend = async () => {
    stopDurationTimer();
    setRecordingMode("idle");
  
    const out = await stop();
    if (!out || out.duration < 0.5 || !selectedUser || !user) return;
  
    const form = new FormData();
    form.append("audio", out.blob, "voice.webm");
    form.append("duration", String(out.duration));
  
    const { data } = await axiosInstance.post(
      "/chat/voice/upload",
      form
    );
  
    socket.emit("send_voice", {
      senderId: user.id,
      receiverId: selectedUser.clerkId,
      audioUrl: data.url,
      duration: data.duration,
      replyToId: replyingTo?._id || null,
    });
  
    setReplyingTo(null);
  };
  
  const cancelRecording = () => {
    stopDurationTimer();
    setRecordingMode("idle");
    setSlideCancelled(false);
    cancel();
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  
    if (recordingMode === "locked") return;
  
    isHoldingRef.current = true;
    didRecordRef.current = false;
    setSlideCancelled(false);
  
    holdTimerRef.current = setTimeout(async () => {
      if (!isHoldingRef.current) return;
      didRecordRef.current = true;
      setRecordingMode("holding");
      await startRecording();
    }, 300);
  };
  
  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  
    isHoldingRef.current = false;
  
    if (recordingMode === "holding" && isRecording) {
      slideCancelled ? cancelRecording() : stopAndSend();
      e.preventDefault();
    }
  };

  const handlePointerLeave = () => {
    // Only relevant for mouse - cancel if dragged away while holding
    if (recordingMode === "holding" && isHoldingRef.current) {
      cancelRecording();
      isHoldingRef.current = false;
    }

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (recordingMode !== "holding") return;
    const deltaX = touchStartXRef.current - e.touches[0].clientX;
    setSlideCancelled(deltaX > 100);
  };
  
  const handleMicClick = async () => {
    if (didRecordRef.current) {
      didRecordRef.current = false;
      return;
    }
  
    if (recordingMode === "locked") {
      await stopAndSend();
    } else {
      setRecordingMode("locked");
      await startRecording();
    }
  };  

  const showSend = newMessage.trim().length > 0 || selectedFiles.length > 0;

  return (
    <>
      {/* Fully Transparent Container */}
      <div className="px-2 pt-1.5 pb-1.5 md:px-3 md:pb-2 relative">
        {/* File Previews */}
        <AnimatePresence>
          {selectedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 p-2.5 bg-[#1c1c24]/95 backdrop-blur-md rounded-2xl border border-[#2a2a35]/60 shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={clearFiles}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((fp, index) => (
                  <div key={index} className="relative group bg-[#2a2a35] rounded-xl overflow-hidden">
                    {fp.type === 'image' && fp.preview ? (
                      <div className="w-14 h-14 relative">
                        <img src={fp.preview} alt={fp.file.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-14 p-2 flex flex-col items-center justify-center gap-1">
                        <div className="p-1 bg-[#3a3a45] rounded text-zinc-400">
                          {getFileIcon(fp.type)}
                        </div>
                        <span className="text-[8px] text-zinc-400 truncate w-full text-center">
                          {fp.file.name.length > 6 ? fp.file.name.slice(0, 5) + '...' : fp.file.name}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="size-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Progress - UNCHANGED */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 px-3 py-2 bg-[#1c1c24]/95 backdrop-blur-md 
                         rounded-2xl border border-[#2a2a35]/60"
            >
              <div className="h-1.5 bg-[#2a2a35] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-violet-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 text-center">
                Uploading... {uploadProgress}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji Picker - UNCHANGED */}
        <AnimatePresence>
          {showEmojiPicker && (
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </AnimatePresence>

        {/* ===== RECORDING OVERLAY ===== */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 px-4 py-3 bg-[#1c1c24]/95 backdrop-blur-md 
                         rounded-2xl border border-[#2a2a35]/60 shadow-xl"
            >
              <div className="flex items-center justify-between">
                {/* Cancel button */}
                <button
                  onClick={cancelRecording}
                  className="flex items-center gap-2 text-red-400 
                             hover:text-red-300 transition-colors"
                >
                  <X className="size-5" />
                  <span className="text-sm font-medium">Cancel</span>
                </button>

                {/* Recording indicator */}
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                    }}
                    className="w-2.5 h-2.5 rounded-full bg-red-500"
                  />
                  <span className="text-white text-sm font-mono font-medium">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>

                {/* Mode indicator */}
                <div className="text-xs text-zinc-500">
                  {recordingMode === "holding" ? (
                    slideCancelled ? (
                      <span className="text-red-400">Release to cancel</span>
                    ) : (
                      "Release to send"
                    )
                  ) : (
                    "Tap mic to send"
                  )}
                </div>
              </div>

              {/* Slide to cancel hint (mobile, holding mode) */}
              {recordingMode === "holding" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-center"
                >
                  <span className="text-xs text-zinc-500">
                    ← Slide to cancel
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Input Row */}
        <div className="flex items-end gap-2">
          {/* Text Input Container - hide during recording */}
          {!isRecording ? (
            <div
              className="flex-1 flex items-center bg-[#1c1c24]/90 
                          backdrop-blur-md rounded-full border 
                          border-[#2a2a35]/60 shadow-xl min-h-[48px]"
            >
              {/* Emoji Button */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={isUploading || isRecording}
                className={`shrink-0 p-3 transition-colors ${
                  showEmojiPicker
                    ? "text-violet-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Emoji"
              >
                <Smile className="size-5" />
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                placeholder={
                  permissionError
                    ? permissionError
                    : replyingTo
                      ? "Type a reply..."
                      : "Message"
                }
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isUploading}
                className="flex-1 bg-transparent text-[15px] 
                           placeholder:text-zinc-500 text-white 
                           py-3 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendText();
                  }
                }}
                onFocus={() => {
                  setShowEmojiPicker(false);
                  onFocus?.();
                }}
              />

              {/* Attachment Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  isUploading ||
                  selectedFiles.length >= MAX_FILES ||
                  isRecording
                }
                className="shrink-0 p-3 pr-3.5 text-zinc-500 
                          active:text-zinc-200 transition-colors disabled:opacity-40"
                title="Attach files"
              >
                <Paperclip className="size-[18px] sm:size-5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_TYPES.join(",")}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            /* During recording, show expanded recording area */
            <div className="flex-1" />
          )}

          {/* ===== FIXED: Send / Mic Button ===== */}
          <AnimatePresence mode="wait">
            {showSend && !isRecording ? (
              <motion.div
                key="send"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  size="icon"
                  onClick={handleSendText}
                  disabled={isUploading}
                  className="size-12 rounded-full bg-violet-600 
                             hover:bg-violet-500 shadow-lg 
                             shadow-violet-600/25 border-0"
                  title="Send"
                >
                  <Send className="size-5" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="relative"
              >
                <Button
                  size="icon"
                  className={`size-12 rounded-full shadow-lg 
                    transition-all border-0 select-none touch-none ${
                    isRecording
                      ? slideCancelled
                        ? "bg-zinc-600 hover:bg-zinc-500 shadow-zinc-600/25"
                        : "bg-red-600 hover:bg-red-500 shadow-red-600/25"
                      : "bg-violet-500 hover:bg-violet-500 shadow-violet-600/25"
                  }`}
                  title={
                    isRecording
                      ? recordingMode === "locked"
                        ? "Tap to send"
                        : "Release to send"
                      : "Hold to record / Tap for hands-free"
                  }
                  disabled={isUploading}
                  // FIXED: Separate click from hold properly
                  onClick={handleMicClick}
                  onMouseDown={handlePointerDown}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerLeave}
                  onTouchStart={handlePointerDown}
                  onTouchEnd={handlePointerUp}
                  onTouchMove={handleTouchMove}
                  onTouchCancel={() => {
                    if (isRecording) cancelRecording();
                    isHoldingRef.current = false;
                    if (holdTimerRef.current) {
                      clearTimeout(holdTimerRef.current);
                      holdTimerRef.current = null;
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {isRecording ? (
                    recordingMode === "locked" ? (
                      <Send className="size-5" />
                    ) : (
                      <Square className="size-5" fill="white" />
                    )
                  ) : (
                    <Mic className="size-5" />
                  )}
                </Button>

                {/* Recording pulse indicator */}
                {isRecording && !slideCancelled && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-4 w-4 
                               pointer-events-none"
                  >
                    <span
                      className="animate-ping absolute inline-flex 
                                   h-full w-full rounded-full 
                                   bg-red-400 opacity-75"
                    />
                    <span
                      className="relative inline-flex rounded-full 
                                   h-4 w-4 bg-red-500 items-center 
                                   justify-center"
                    >
                      <span className="text-[8px] text-white font-bold">
                        ●
                      </span>
                    </span>
                  </motion.span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={closeAlert}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </>
  );
};

export default MessageInput;