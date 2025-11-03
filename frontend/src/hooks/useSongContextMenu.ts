import { useState, useRef, useCallback } from "react";

export function useSongContextMenu() {
  const [contextSong, setContextSong] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const touchTimeout = useRef<any>(null);

  const openContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent, song: any) => {
    if ("type" in e && e.type === "contextmenu") {
      e.preventDefault(); // only for right-click, not touch
    }

    const x = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const y = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setContextSong(song);
    setContextMenu({ x, y });
    setShowOptions(true);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, song: any) => {
    touchTimeout.current = setTimeout(() => {
      openContextMenu(e, song);
    }, 600); // Long press time
  }, [openContextMenu]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(touchTimeout.current);
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
    handleTouchEnd,
    closeContextMenu,
  };
}
