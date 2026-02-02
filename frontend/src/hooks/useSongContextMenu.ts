// src/hooks/useSongContextMenu.ts
import { useState, useRef, useCallback } from "react";
import { Song } from "@/types";

const LONG_PRESS_DURATION = 500; // ms - increase from whatever you have
const MOVE_THRESHOLD = 10; // pixels - if finger moves more than this, cancel

export const useSongContextMenu = () => {
  const [contextSong, setContextSong] = useState<Song | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  const openContextMenu = useCallback((e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    e.stopPropagation();
    setContextSong(song);
    setContextMenu({ x: e.clientX, y: e.clientY });
    setShowOptions(true);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, song: Song) => {
    // Don't interfere with scroll
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    hasMoved.current = false;

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      // Only trigger if finger hasn't moved significantly
      if (!hasMoved.current && startPosRef.current) {
        // Vibrate for haptic feedback if supported
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        setContextSong(song);
        setContextMenu({ 
          x: startPosRef.current.x, 
          y: startPosRef.current.y 
        });
        setShowOptions(true);
      }
    }, LONG_PRESS_DURATION);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPosRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - startPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - startPosRef.current.y);
    
    // If moved more than threshold, cancel the long press
    if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
      hasMoved.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
    hasMoved.current = false;
  }, []);

  const closeContextMenu = useCallback(() => {
    setShowOptions(false);
    setContextSong(null);
    setContextMenu(null);
  }, []);

  return {
    contextSong,
    contextMenu,
    showOptions,
    openContextMenu,
    handleTouchStart,
    handleTouchMove, // Add this new handler
    handleTouchEnd,
    closeContextMenu,
  };
};