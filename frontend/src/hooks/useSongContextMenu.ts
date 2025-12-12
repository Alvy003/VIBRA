import { useState, useRef, useCallback } from "react";

export function useSongContextMenu() {
  const [contextSong, setContextSong] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const touchTimeout = useRef<any>(null);
  const touchMoved = useRef(false);

  const openContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent, song: any) => {
    if ("type" in e && e.type === "contextmenu") {
      e.preventDefault();
    }

    const x = "touches" in e ? e.touches[0].clientX : (e as any).clientX;
    const y = "touches" in e ? e.touches[0].clientY : (e as any).clientY;

    setContextSong(song);
    setContextMenu({ x, y });
    setShowOptions(true);
  }, []);

  // 🟣 Start touch → begin long-press timer
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, song: any) => {
      touchMoved.current = false;

      touchTimeout.current = setTimeout(() => {
        if (!touchMoved.current) {
          openContextMenu(e, song);
        }
      }, 600); // perfect long-press delay
    },
    [openContextMenu]
  );

  // 🟣 Finger moves → cancel long-press
  const handleTouchMove = useCallback(() => {
    touchMoved.current = true;
    clearTimeout(touchTimeout.current);
  }, []);

  // 🟣 Finger lifted → cancel
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
    handleTouchMove,   // ← add this
    handleTouchEnd,
    closeContextMenu,
  };
}
