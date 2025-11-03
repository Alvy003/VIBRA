import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatStore } from "@/stores/useChatStore";
import { useUser } from "@clerk/clerk-react";
import { Send, Mic, Square } from "lucide-react";
import { useRef, useState } from "react";
import { useRecorder } from "@/hooks/useRecorder";
import { axiosInstance } from "@/lib/axios";

type Props = { onFocus?: () => void };

const MessageInput = ({ onFocus }: Props) => {
  const [newMessage, setNewMessage] = useState("");
  const { user } = useUser();
  const { selectedUser, sendMessage, socket } = useChatStore();

  const { isRecording, permissionError, start, stop, cancel } = useRecorder();
  const holdTimerRef = useRef<number | null>(null);

  const handleSendText = () => {
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

  const showSend = newMessage.trim().length > 0;

  return (
    // ✅ Fixed positioning with consistent padding
    <div className="p-1 lg:p-4 mb-0 lg:mb-0 border-t border-zinc-800 bg-zinc-900/60 w-full">
      <div className="flex gap-2 items-center w-full">
        <Input
          placeholder={permissionError ? permissionError : "Message"}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-zinc-700/60 text-sm placeholder:text-zinc-400 text-white border-none rounded-2xl lg:rounded-lg"
          onKeyDown={(e) => e.key === "Enter" && handleSendText()}
          onFocus={() => {
            onFocus?.();
            setTimeout(() => onFocus?.(), 120);
          }}
        />

        {showSend ? (
          <Button
            size="icon"
            onClick={handleSendText}
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
  );
};

export default MessageInput;