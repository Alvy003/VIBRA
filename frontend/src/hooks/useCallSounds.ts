import { useEffect, useRef } from "react";

export function useCallSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null); 
  const vibrateIntervalRef = useRef<number | null>(null); 

  const ensureCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const stopVibration = () => {
    if (vibrateIntervalRef.current) {
      clearInterval(vibrateIntervalRef.current);
      vibrateIntervalRef.current = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  };

  const stop = () => {
    // Stop tone
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      gainRef.current?.disconnect();
      oscRef.current?.disconnect();
      oscRef.current?.stop();
    } catch {}
    gainRef.current = null;
    oscRef.current = null;

    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Stop vibration
    stopVibration();
  };

  const playTone = (freq: number, dutyMs: number, pauseMs: number) => {
    stop();
    const ctx = ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0;

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    oscRef.current = osc;
    gainRef.current = gain;

    const cycle = () => {
      if (!gainRef.current) return;
      gainRef.current.gain.setTargetAtTime(0.7, ctx.currentTime, 0.01);
      setTimeout(() => {
        if (!gainRef.current) return;
        gainRef.current.gain.setTargetAtTime(0.0, ctx.currentTime, 0.01);
      }, dutyMs);
    };
    cycle();
    timerRef.current = window.setInterval(cycle, dutyMs + pauseMs) as unknown as number;
  };

  // ✅ Play incoming call ringtone (with audio file + vibration)
  const playRingtone = () => {
    stop();

    // Try to play audio file
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/ringtone.mp3');
        audioRef.current.loop = true;
      }
      audioRef.current.volume = 0.8;
      audioRef.current.play().catch((err) => {
        console.warn("Audio play failed, using tone fallback:", err);
        // Fallback to tone if audio fails (e.g., no user interaction yet)
        playTone(425, 1000, 2000);
      });
    } catch (err) {
      console.warn("Audio creation failed, using tone fallback:", err);
      playTone(425, 1000, 2000);
    }

    // ✅ Vibrate continuously on mobile
    if ('vibrate' in navigator) {
      const vibratePattern = [500, 500]; // 500ms vibrate, 500ms pause
      navigator.vibrate(vibratePattern);
      
      // Keep vibrating every second
      vibrateIntervalRef.current = window.setInterval(() => {
        if ('vibrate' in navigator) {
          navigator.vibrate(vibratePattern);
        }
      }, 1000);
    }
  };

  // Caller ringback: 0.4s on / 0.8s off @ 480Hz
  const playRingback = () => {
    stop();
    playTone(480, 400, 800);
  };

  const stopAll = stop;

  useEffect(() => () => stopAll(), []);

  return { playRingtone, playRingback, stopAll };
}