// src/hooks/useRecorder.ts
import { useRef, useState } from "react";

function pickAudioMime() {
  // Prefer Opus/WebM when supported (Chrome/Edge/Android), fall back to AAC/MP4 for Safari/iOS
  const can = (t: string) => (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || false;

  if (can("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (can("audio/webm")) return "audio/webm";
  if (can("audio/ogg;codecs=opus")) return "audio/ogg;codecs=opus";
  if (can("audio/ogg")) return "audio/ogg";
  if (can("audio/mp4;codecs=aac")) return "audio/mp4;codecs=aac";
  if (can("audio/aac")) return "audio/aac";
  // Let the browser choose if nothing matched
  return "";
}

export function useRecorder() {
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startAtRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const mime = pickAudioMime();
      const options: MediaRecorderOptions = mime
        ? { mimeType: mime, audioBitsPerSecond: 128000 }
        : { audioBitsPerSecond: 128000 };

      const rec = new MediaRecorder(stream, options);
      chunksRef.current = [];
      startAtRef.current = Date.now();

      rec.ondataavailable = (e) => e.data && e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        try {
          streamRef.current?.getTracks().forEach((t) => t.stop());
        } finally {
          streamRef.current = null;
        }
      };

      recRef.current = rec;
      rec.start(200);
      setIsRecording(true);
      setPermissionError(null);
    } catch (e: any) {
      setPermissionError(e?.message || "Mic permission denied");
    }
  };

  const stop = async (): Promise<{ blob: Blob; duration: number } | null> => {
    const rec = recRef.current;
    if (!rec) return null;

    return new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const dur = startAtRef.current ? (Date.now() - startAtRef.current) / 1000 : 0;
        try {
          streamRef.current?.getTracks().forEach((t) => t.stop());
        } finally {
          streamRef.current = null;
        }
        resolve({ blob, duration: Math.max(0, Math.round(dur)) });
      };
      rec.stop();
      recRef.current = null;
      setIsRecording(false);
    });
  };

  const cancel = () => {
    const rec = recRef.current;
    if (!rec) return;
    rec.onstop = () => {
      chunksRef.current = [];
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
      } finally {
        streamRef.current = null;
      }
    };
    rec.stop();
    recRef.current = null;
    setIsRecording(false);
  };

  return { isRecording, permissionError, start, stop, cancel };
}