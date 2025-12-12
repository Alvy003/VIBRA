// components/MessageInput.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatStore } from "@/stores/useChatStore";
import { useUser } from "@clerk/clerk-react";
import { Send, Mic, Square, Paperclip, X, FileText, Image as ImageIcon, Film, Music, AlertTriangle } from "lucide-react";
import { useRef, useState } from "react";
import { useRecorder } from "@/hooks/useRecorder";
import { axiosInstance } from "@/lib/axios";
import { motion, AnimatePresence } from "framer-motion";

type Props = { onFocus?: () => void };

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 10MB
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

// ✅ Custom Alert Dialog Component
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
    info: "bg-blue-500/10 text-blue-500",
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
              className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColors[type]}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed ml-[52px]">
                  {message}
                </p>
              </div>

              <div className="flex justify-end p-4 pt-0">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors text-sm"
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
  
  // ✅ Alert dialog state
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "error" | "warning" | "info";
  }>({ isOpen: false, title: "", message: "", type: "error" });
  
  const { user } = useUser();
  const { selectedUser, sendMessage, socket } = useChatStore();
  const { isRecording, permissionError, start, stop, cancel } = useRecorder();
  
  const holdTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Show custom alert
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

    // ✅ Show errors with custom dialog
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
      
      showAlert(
        title,
        errors.length === 1 
          ? errors[0] 
          : `${errors.length} files couldn't be added:\n• ${errors.join('\n• ')}`,
        type
      );
    }

    // ✅ Check max files limit
    const totalFiles = selectedFiles.length + validFiles.length;
    if (totalFiles > MAX_FILES) {
      const canAdd = MAX_FILES - selectedFiles.length;
      if (canAdd <= 0) {
        showAlert(
          "Maximum Files Reached",
          `You can only attach up to ${MAX_FILES} files at once.`,
          "info"
        );
        validFiles.length = 0;
      } else {
        showAlert(
          "Some Files Skipped",
          `Only ${canAdd} more file${canAdd > 1 ? 's' : ''} can be added. Maximum is ${MAX_FILES} files.`,
          "info"
        );
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
        });
      }

      clearFiles();
      setNewMessage("");
      setTimeout(() => onFocus?.(), 50);

    } catch (error: any) {
      console.error("File upload failed:", error);
      showAlert(
        "Upload Failed",
        error.response?.data?.error || "Failed to upload files. Please try again.",
        "error"
      );
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
    sendMessage(selectedUser.clerkId, user.id, text);
    setNewMessage("");
    setTimeout(() => onFocus?.(), 50);
  };

  const startRecording = async () => {
    await start();
  };

  const stopAndSend = async () => {
    const out = await stop();
    if (!out || !selectedUser || !user) return;
    try {
      const form = new FormData();
      form.append("audio", out.blob, "voice.webm");
      form.append("duration", String(out.duration));
      const { data } = await axiosInstance.post("/chat/voice/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { url, duration } = data || {};
      if (url) {
        socket.emit("send_voice", {
          senderId: user.id,
          receiverId: selectedUser.clerkId,
          audioUrl: url,
          duration,
        });
      }
    } catch (e) {
      console.error("Voice upload failed:", e);
    }
  };

  const cancelRecording = () => cancel();

  const onHoldStart = () => {
    holdTimerRef.current = window.setTimeout(() => startRecording(), 120) as unknown as number;
  };

  const onHoldEnd = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isRecording) stopAndSend();
  };

  const onHoldCancel = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isRecording) cancelRecording();
  };

  const showSend = newMessage.trim().length > 0 || selectedFiles.length > 0;

  return (
    <>
      <div className="p-1 lg:p-4 mb-0 lg:mb-0 border-t border-zinc-800 bg-zinc-900/60 w-full">
        {/* File Previews */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
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
                <div
                  key={index}
                  className="relative group bg-zinc-700/50 rounded-lg overflow-hidden"
                >
                  {fp.type === 'image' && fp.preview ? (
                    <div className="w-16 h-16 relative">
                      <img
                        src={fp.preview}
                        alt={fp.file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 p-2 flex flex-col items-center justify-center gap-1">
                      <div className="p-1.5 bg-zinc-600 rounded">
                        {getFileIcon(fp.type)}
                      </div>
                      <span className="text-[10px] text-zinc-300 truncate w-full text-center">
                        {fp.file.name.length > 10 
                          ? fp.file.name.slice(0, 8) + '...' 
                          : fp.file.name}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        {formatFileSize(fp.file.size)}
                      </span>
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="mb-3 px-1">
            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1">Uploading... {uploadProgress}%</p>
          </div>
        )}

        {/* Input Row */}
        <div className="flex gap-2 items-center w-full">
          {/* File Picker Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || selectedFiles.length >= MAX_FILES || isRecording}
            className="shrink-0 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-2xl lg:rounded-lg"
            title="Attach files"
          >
            <Paperclip className="size-5" />
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />

          <Input
            placeholder={permissionError ? permissionError : "Message"}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isUploading}
            className="flex-1 bg-zinc-700/60 text-sm placeholder:text-zinc-400 text-white border-none rounded-2xl lg:rounded-lg"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendText()}
            onFocus={() => {
              onFocus?.();
              setTimeout(() => onFocus?.(), 120);
            }}
          />

          {showSend ? (
            <Button
              size="icon"
              onClick={handleSendText}
              disabled={isUploading}
              className="rounded-2xl lg:rounded-lg bg-violet-600 shrink-0"
              title="Send"
            >
              <Send className="size-4" />
            </Button>
          ) : (
            <div className="relative shrink-0">
              <Button
                size="icon"
                className={`rounded-2xl lg:rounded-lg ${
                  isRecording ? "bg-red-600" : "bg-violet-600"
                }`}
                title={isRecording ? "Stop & send" : "Hold to record"}
                disabled={isUploading}
                onClick={async () => {
                  if (!isRecording) await startRecording();
                  else await stopAndSend();
                }}
                onMouseDown={onHoldStart}
                onMouseUp={onHoldEnd}
                onMouseLeave={onHoldCancel}
                onTouchStart={onHoldStart}
                onTouchEnd={onHoldEnd}
                onTouchCancel={onHoldCancel}
              >
                {isRecording ? <Square className="size-4" /> : <Mic className="size-4" />}
              </Button>
              {isRecording && (
                <span className="absolute -top-2 -right-2 inline-flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ✅ Custom Alert Dialog */}
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