// src/components/ui/MarqueeText.tsx
import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface MarqueeTextProps {
  text: string;
  className?: string;
  speed?: number;
  pauseDuration?: number;
  gap?: number;
  disabled?: boolean;
  fadeWidth?: number;
}

const MarqueeText = ({
  text,
  className,
  speed = 25,
  pauseDuration = 2000,
  gap = 60,
  disabled = false,
  fadeWidth = 3, // Reduced to 20px so text is closer to the edge
}: MarqueeTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkOverflow = useCallback(() => {
    if (!containerRef.current || !textRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const measuredTextWidth = textRef.current.offsetWidth;
    const contentVisibleWidth = containerWidth - (fadeWidth * 2);
    
    setTextWidth(measuredTextWidth);
    setShouldScroll(measuredTextWidth > contentVisibleWidth);
  }, [fadeWidth]);

  useEffect(() => {
    checkOverflow();
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
      setTranslateX(0);
      setIsPaused(true);
    });
    
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [text, checkOverflow]);

  useEffect(() => {
    setTranslateX(0);
    setIsPaused(true);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [text]);

  useEffect(() => {
    if (!shouldScroll || disabled || textWidth === 0) return;

    const cleanup = () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    cleanup();

    const cycleDistance = textWidth + gap;
    const totalDuration = (cycleDistance / speed) * 1000;

    if (isPaused) {
      timeoutRef.current = setTimeout(() => {
        setIsPaused(false);
      }, pauseDuration);
    } else {
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        
        let easedProgress = progress;
        const easeZone = 0.05;
        
        if (progress < easeZone) {
          const t = progress / easeZone;
          easedProgress = easeZone * (t * t); 
        } else if (progress > 1 - easeZone) {
          const t = (progress - (1 - easeZone)) / easeZone;
          easedProgress = (1 - easeZone) + easeZone * (1 - (1 - t) * (1 - t));
        }

        setTranslateX(-easedProgress * cycleDistance);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          timeoutRef.current = setTimeout(() => {
            setTranslateX(0);
            setIsPaused(true);
          }, 100);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return cleanup;
  }, [isPaused, shouldScroll, disabled, textWidth, gap, speed, pauseDuration]);

  const maskStyle = shouldScroll ? `linear-gradient(
    to right,
    transparent 0px,
    black ${fadeWidth}px,
    black calc(100% - ${fadeWidth}px),
    transparent 100%
  )` : undefined;

  if (!shouldScroll) {
    return (
      <div ref={containerRef} className={cn("overflow-hidden", className)}>
        <span
          ref={textRef}
          className="whitespace-nowrap inline-block"
          style={{ paddingLeft: fadeWidth }}
        >
          {text}
        </span>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={cn("overflow-hidden relative select-none", className)}
      style={{
        maskImage: maskStyle,
        WebkitMaskImage: maskStyle,
      }}
    >
      <div 
        className="flex whitespace-nowrap will-change-transform"
        style={{ 
          transform: `translate3d(${translateX}px, 0, 0)`,
          // Padding matches fade width exactly
          paddingLeft: fadeWidth, 
          paddingRight: fadeWidth, 
        }}
      >
        <span ref={textRef} className="inline-block flex-shrink-0">
          {text}
        </span>
        <span 
          className="inline-block flex-shrink-0"
          style={{ marginLeft: gap }}
          aria-hidden="true"
        >
          {text}
        </span>
      </div>
    </div>
  );
};

export default MarqueeText;