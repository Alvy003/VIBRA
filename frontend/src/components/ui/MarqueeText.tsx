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
  pauseDuration = 2500,
  gap = 80,
  disabled = false,
  fadeWidth = 36,
}: MarqueeTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [phase, setPhase] = useState<'paused' | 'scrolling'>('paused');
  const [showFade, setShowFade] = useState(false);
  
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkOverflow = useCallback(() => {
    if (!containerRef.current || !textRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const measuredTextWidth = textRef.current.offsetWidth;
    
    setTextWidth(measuredTextWidth);
    setShouldScroll(measuredTextWidth > containerWidth + 2);
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [text, checkOverflow]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
      setTranslateX(0);
      setPhase('paused');
      setShowFade(false);
    });
    
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [checkOverflow]);

  useEffect(() => {
    setTranslateX(0);
    setPhase('paused');
    setShowFade(false);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [text]);

  useEffect(() => {
    if (!shouldScroll || disabled || textWidth === 0) {
      return;
    }

    const cleanup = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    cleanup();

    const cycleDistance = textWidth + gap;
    const totalDuration = (cycleDistance / speed) * 1000;

    if (phase === 'paused') {
      setShowFade(false);
      timeoutRef.current = setTimeout(() => {
        setPhase('scrolling');
      }, pauseDuration);
    } else if (phase === 'scrolling') {
      // Fade in the masks smoothly
      requestAnimationFrame(() => setShowFade(true));
      
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        
        if (progress >= 1) {
          // Fade out masks before resetting
          setShowFade(false);
          
          timeoutRef.current = setTimeout(() => {
            setTranslateX(0);
            setPhase('paused');
          }, 300); // Wait for fade out transition
          return;
        }
        
        // Very subtle easing - almost linear but smooth start/end
        let easedProgress = progress;
        const easeZone = 0.04;
        
        if (progress < easeZone) {
          const t = progress / easeZone;
          easedProgress = easeZone * (t * t);
        } else if (progress > 1 - easeZone) {
          const t = (progress - (1 - easeZone)) / easeZone;
          easedProgress = (1 - easeZone) + easeZone * (1 - (1 - t) * (1 - t));
        }
        
        setTranslateX(-easedProgress * cycleDistance);
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return cleanup;
  }, [phase, shouldScroll, disabled, textWidth, gap, speed, pauseDuration]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Generate mask style - fades to transparent at edges
  const getMaskStyle = () => {
    if (!showFade) return 'none';
  
    return `linear-gradient(
      to right,
      transparent 0%,
      rgba(0,0,0,0.15) ${fadeWidth * 0.35}px,
      rgba(0,0,0,1) ${fadeWidth}px,
      rgba(0,0,0,1) calc(100% - ${fadeWidth}px),
      rgba(0,0,0,0.15) calc(100% - ${fadeWidth * 0.35}px),
      transparent 100%
    )`;
  };
  
  // Non-scrolling - simple render
  if (!shouldScroll) {
    return (
      <div ref={containerRef} className={cn("overflow-hidden", className)}>
        <span 
          ref={textRef} 
          className="whitespace-nowrap inline-block"
          style={{
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        >
          {text}
        </span>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={cn("overflow-hidden", className)}
      style={{
        maskImage: getMaskStyle(),
        WebkitMaskImage: getMaskStyle(),
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
        transition: showFade 
          ? 'mask-image 0.5s ease, -webkit-mask-image 0.5s ease' 
          : 'mask-image 0.3s ease, -webkit-mask-image 0.3s ease',
      }}
    >
      <div 
        className="flex whitespace-nowrap"
        style={{ 
          transform: `translate3d(${translateX}px, 0, 0)`,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          backfaceVisibility: 'hidden',
          willChange: phase === 'scrolling' ? 'transform' : 'auto',
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