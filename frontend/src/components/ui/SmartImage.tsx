import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type SmartImageProps = {
  src?: string | null;
  alt?: string;
  fallback: React.ReactNode;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
};

const SmartImage = ({
  src,
  alt = "",
  fallback,
  className,
  imgClassName,
  loading = "lazy",
}: SmartImageProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset state if src changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  const shouldShowFallback = !src || hasError;

  return (
    <div className={cn("relative w-full h-full", className)}>
      {!shouldShowFallback && (
        <img
          src={src as string}
          alt={alt}
          loading={loading}
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            imgClassName
          )}
        />
      )}

      {/* Fallback */}
      {shouldShowFallback && (
        <div className="absolute inset-0">
          {fallback}
        </div>
      )}

      {/* Optional loading shimmer before image loads */}
      {!shouldShowFallback && !isLoaded && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
      )}
    </div>
  );
};

export default SmartImage;