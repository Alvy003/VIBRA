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
  fadeWidth = 3,
}: MarqueeTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const animatedElementRef = useRef<HTMLDivElement>(null);
  
  const [shouldScroll, setShouldScroll] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  
  const translateXRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Visibility detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0, rootMargin: '100px' }
    );
    
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
      translateXRef.current = 0;
      setIsPaused(true);
      if (animatedElementRef.current) {
        animatedElementRef.current.style.transform = 'translate3d(0, 0, 0)';
      }
    });
    
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [text, checkOverflow]);

  useEffect(() => {
    translateXRef.current = 0;
    setIsPaused(true);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (animatedElementRef.current) {
      animatedElementRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
  }, [text]);

  useEffect(() => {
    if (!shouldScroll || disabled || textWidth === 0 || !isVisible) return;

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

        translateXRef.current = -easedProgress * cycleDistance;
        
        // Direct DOM update (no React re-render)
        if (animatedElementRef.current) {
          animatedElementRef.current.style.transform = 
            `translate3d(${translateXRef.current}px, 0, 0)`;
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          timeoutRef.current = setTimeout(() => {
            translateXRef.current = 0;
            if (animatedElementRef.current) {
              animatedElementRef.current.style.transform = 'translate3d(0, 0, 0)';
            }
            setIsPaused(true);
          }, 100);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return cleanup;
  }, [isPaused, shouldScroll, disabled, textWidth, gap, speed, pauseDuration, isVisible]);

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
        ref={animatedElementRef}
        className="flex whitespace-nowrap will-change-transform"
        style={{ 
          paddingLeft: fadeWidth, 
          paddingRight: fadeWidth,
          transform: 'translate3d(0, 0, 0)', // Initial value
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