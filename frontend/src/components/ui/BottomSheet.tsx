// src/components/ui/BottomSheet.tsx
import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
    forwardRef,
    useImperativeHandle,
  } from "react";
  import {
    motion,
    AnimatePresence,
    useMotionValue,
    useTransform,
    useAnimation,
    PanInfo,
  } from "framer-motion";
  import { createPortal } from "react-dom";
  
  export interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    snapPoints?: number[];
    initialSnap?: number;
    showHandle?: boolean;
    header?: React.ReactNode;
    className?: string;
    zIndex?: number;
    closeOnBackdrop?: boolean;
    dismissThreshold?: number;
    dismissVelocity?: number;
    lockScroll?: boolean;
  }
  
  export interface BottomSheetRef {
    snapTo: (index: number) => void;
  }
  
  const SPRING_CONFIG = {
    type: "tween" as const,
    damping: 40,
    stiffness: 300,
    mass: 1.2,
  };
  
  const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
    (
      {
        isOpen,
        onClose,
        children,
        snapPoints = [0.5],
        initialSnap = 0,
        showHandle = true,
        header,
        className = "",
        zIndex = 9998,
        closeOnBackdrop = true,
        dismissThreshold = 120,
        dismissVelocity = 600,
        lockScroll = true,
      },
      ref
    ) => {
      const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnap);
      const sheetRef = useRef<HTMLDivElement>(null);
      const contentRef = useRef<HTMLDivElement>(null);
      const isScrolledToTop = useRef(true);
      const isDraggingSheet = useRef(false);
      const controls = useAnimation();
      const [dragLocked, setDragLocked] = useState(false);

  
      const y = useMotionValue(0);
      const backdropOpacity = useTransform(
        y,
        [0, window.innerHeight * 0.4],
        [1, 0]
      );
  
      const getSnapHeight = useCallback(
        (index: number) => {
          const clampedIndex = Math.min(index, snapPoints.length - 1);
          return window.innerHeight * snapPoints[clampedIndex];
        },
        [snapPoints]
      );
  
      useImperativeHandle(ref, () => ({
        snapTo: (index: number) => {
          const clampedIndex = Math.min(index, snapPoints.length - 1);
          setCurrentSnapIndex(clampedIndex);
          controls.start({
            height: getSnapHeight(clampedIndex),
            transition: SPRING_CONFIG,
          });
        },
      }));
  
      useEffect(() => {
        if (!lockScroll) return;
        if (isOpen) {
          const scrollY = window.scrollY;
          document.body.style.position = "fixed";
          document.body.style.top = `-${scrollY}px`;
          document.body.style.left = "0";
          document.body.style.right = "0";
          document.body.style.overflow = "hidden";
          return () => {
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.left = "";
            document.body.style.right = "";
            document.body.style.overflow = "";
            window.scrollTo(0, scrollY);
          };
        }
      }, [isOpen, lockScroll]);

      useEffect(() => {
        const start = () => setDragLocked(true);
        const end = () => setDragLocked(false);
      
        window.addEventListener("queue-drag-start", start);
        window.addEventListener("queue-drag-end", end);
      
        return () => {
          window.removeEventListener("queue-drag-start", start);
          window.removeEventListener("queue-drag-end", end);
        };
      }, []);
           
  
      useEffect(() => {
        if (isOpen) {
          setCurrentSnapIndex(initialSnap);
          y.set(0);
          // Reset controls to initial snap height so re-open 
          // always starts fresh from bottom
          controls.set({ height: getSnapHeight(initialSnap) });
        }
      }, [isOpen, initialSnap, y, controls, getSnapHeight]); 
  
      const handleContentScroll = useCallback(() => {
        if (contentRef.current) {
          isScrolledToTop.current = contentRef.current.scrollTop <= 1;
        }
      }, []);
  
      const handleDragStart = useCallback(
        (event: PointerEvent | MouseEvent | TouchEvent) => {
      
          if (!(event.target instanceof HTMLElement)) {
            isDraggingSheet.current = false;
            return;
          }
      
          const el = event.target;
      
          const startedOnSheetHandle = el.closest("[data-sheet-handle]");
          const startedOnSheetHeader = el.closest("[data-sheet-header]");
      
          // ✅ ONLY allow drag from handle or header
          if (startedOnSheetHandle || startedOnSheetHeader) {
            isDraggingSheet.current = true;
            return;
          }
      
          // ❌ Everything else → NEVER drag sheet
          isDraggingSheet.current = false;
        },
        []
      );
      
      
  
      const handleDrag = useCallback(
        (_: any, info: PanInfo) => {
          if (!isDraggingSheet.current) {
            y.set(0);
            return;
          }
  
          if (info.offset.y < 0) {
            y.set(0); // NEVER move sheet upward
            return;
          }
          else {
            // Dragging DOWN
            y.set(info.offset.y);
          }
        },
        [y, currentSnapIndex, snapPoints.length]
      );
  
      const handleDragEnd = useCallback(
        (_: any, info: PanInfo) => {
          if (!isDraggingSheet.current) {
            y.set(0);
            return;
          }
      
          isDraggingSheet.current = false;
          const offsetY = info.offset.y;
          const velocityY = info.velocity.y;
      
          // --- DISMISS ---
          if (
            !dragLocked && (offsetY > dismissThreshold ||
            velocityY > dismissVelocity
          )) {
            onClose();
            return;
          }
      
          // --- Calculate where the sheet ended up ---
          const currentHeight = getSnapHeight(currentSnapIndex);
          const draggedHeight = currentHeight - offsetY;
          const draggedPercent = draggedHeight / window.innerHeight;
      
          // --- Determine target snap index ---
          let targetIndex = currentSnapIndex;
      
          // SNAP UP with velocity
          if (
            velocityY < -150 &&
            currentSnapIndex < snapPoints.length - 1
          ) {
            targetIndex = velocityY < -800 
              ? snapPoints.length - 1  // Fast swipe → max snap
              : currentSnapIndex + 1;
          }
          // SNAP DOWN with velocity
          else if (velocityY > 200 && currentSnapIndex > 0) {
            targetIndex = currentSnapIndex - 1;
          }
          // No strong velocity → find nearest by position
          else {
            let minDist = Infinity;
            for (let i = 0; i < snapPoints.length; i++) {
              const dist = Math.abs(snapPoints[i] - draggedPercent);
              if (dist < minDist) {
                minDist = dist;
                targetIndex = i;
              }
            }
          }
      
          // Apply the snap
          setCurrentSnapIndex(targetIndex);
          y.set(0);
          controls.start({
            height: getSnapHeight(targetIndex),
            transition: SPRING_CONFIG,
          });
        },
        [
          currentSnapIndex,
          snapPoints,
          dismissThreshold,
          dismissVelocity,
          getSnapHeight,
          onClose,
          y,
          controls,
        ]
      );
  
      return createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60"
                style={{
                  zIndex,
                  opacity: backdropOpacity,
                  WebkitTapHighlightColor: "transparent",
                }}
                onClick={closeOnBackdrop ? onClose : undefined}
                aria-hidden="true"
              />
  
              {/* Sheet */}
              <motion.div
                ref={sheetRef}
                initial={{ y: "100%", height: getSnapHeight(initialSnap) }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={SPRING_CONFIG}
                style={{ y, zIndex: zIndex + 1 }}
                drag={dragLocked ? false : "y"}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{
                    top: 0.05,
                    bottom: 0.35,
                }}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                className={`fixed inset-x-0 bottom-0 bg-zinc-900 
                    rounded-t-2xl shadow-2xl flex flex-col 
                    overflow-hidden select-none
                    ${className}`}
                >
                {/* Handle */}
                {showHandle && (
                  <div
                    data-sheet-handle
                    className="flex justify-center pt-3 pb-2 
                      cursor-grab active:cursor-grabbing
                      touch-none"
                  >
                    <div
                      className="w-9 h-[5px] rounded-full 
                      bg-white/[0.22] transition-colors
                      active:bg-white/40"
                    />
                  </div>
                )}
  
                {/* Header */}
                {header && (
                  <div
                    data-sheet-header
                    className="flex-shrink-0 touch-none"
                  >
                    {header}
                  </div>
                )}
  
                {/* Scrollable content */}
                <div
                  ref={contentRef}
                  onScroll={handleContentScroll}
                  className="flex-1 overflow-y-auto overscroll-contain"
                  style={{
                    touchAction: "pan-y",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  {children}
                </div>
  
                {/* Safe area bottom */}
                <div className="h-[env(safe-area-inset-bottom)]" />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      );
    }
  );
  
  BottomSheet.displayName = "BottomSheet";
  
  export default BottomSheet;