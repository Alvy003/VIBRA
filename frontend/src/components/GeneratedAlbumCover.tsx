// src/components/GeneratedAlbumCover.tsx
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface GeneratedAlbumCoverProps {
  title: string;
  previewImages?: string[];
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

// Text placement positions
const TEXT_POSITIONS = [
  { align: "items-end justify-start", text: "text-left", padding: "p-3 pb-4" },
  { align: "items-end justify-end", text: "text-right", padding: "p-3 pb-4" },
  { align: "items-start justify-start", text: "text-left", padding: "p-3 pt-4" },
  { align: "items-center justify-start", text: "text-left", padding: "p-3" },
  { align: "items-end justify-center", text: "text-center", padding: "p-3 pb-4" },
] as const;

// Overlay styles - clean and minimal, no heavy blur
const OVERLAY_STYLES = [
  // Clean gradient overlays
  {
    overlay: "bg-gradient-to-t from-black/75 via-black/35 to-transparent",
    textColor: "text-white",
  },
  {
    overlay: "bg-gradient-to-t from-black/70 via-black/30 to-black/5",
    textColor: "text-white",
  },
  {
    overlay: "bg-gradient-to-br from-black/60 via-black/30 to-transparent",
    textColor: "text-white",
  },
  {
    overlay: "bg-gradient-to-r from-black/70 via-black/35 to-transparent",
    textColor: "text-white",
  },
  {
    overlay: "bg-gradient-to-t from-black/80 via-black/40 to-black/10",
    textColor: "text-white",
  },
  // Subtle tinted overlays
  {
    overlay: "bg-gradient-to-t from-slate-900/75 via-slate-900/35 to-transparent",
    textColor: "text-white",
  },
  {
    overlay: "bg-gradient-to-t from-zinc-900/80 via-zinc-900/40 to-transparent",
    textColor: "text-white",
  },
  {
    overlay: "bg-gradient-to-t from-neutral-900/75 via-neutral-900/35 to-transparent",
    textColor: "text-white",
  },
];

// Fallback gradient backgrounds when no image available
const FALLBACK_GRADIENTS = [
  "bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800",
  "bg-gradient-to-br from-rose-600 via-pink-700 to-purple-800",
  "bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800",
  "bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800",
  "bg-gradient-to-br from-orange-600 via-red-700 to-rose-800",
  "bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800",
  "bg-gradient-to-br from-fuchsia-600 via-purple-700 to-violet-800",
  "bg-gradient-to-br from-amber-600 via-orange-700 to-red-800",
];

// Hash function for deterministic randomness
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Smart text extraction
const extractDisplayText = (title: string): {
  line1?: string;
  line2: string;
  layout: "single" | "stacked";
} => {
  const cleanTitle = title.trim();

  const prefixMatch = cleanTitle.match(
    /^(best|top|new|hot|fresh|pure|ultimate|essential|the\s+best)\s+(of\s+)?(.+)/i
  );
  if (prefixMatch) {
    return {
      line1: prefixMatch[1].replace(/^the\s+/i, "").toUpperCase(),
      line2: prefixMatch[3],
      layout: "stacked",
    };
  }

  const suffixMatch = cleanTitle.match(
    /^(.+?)\s+(hits|mix|vibes|essentials|classics|favorites|playlist|songs|tracks|collection)$/i
  );
  if (suffixMatch) {
    return {
      line1: suffixMatch[2].toUpperCase(),
      line2: suffixMatch[1],
      layout: "stacked",
    };
  }

  const words = cleanTitle.split(/\s+/);
  if (words.length >= 3) {
    const mid = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, mid).join(" "),
      line2: words.slice(mid).join(" "),
      layout: "stacked",
    };
  }

  return {
    line2: cleanTitle,
    layout: "single",
  };
};

const getMainFontSize = (text: string, size: "sm" | "md" | "lg" | "xl"): string => {
  const len = text.length;

  const matrix: Record<string, Record<string, string>> = {
    sm: { short: "text-lg", medium: "text-base", long: "text-sm" },
    md: { short: "text-2xl", medium: "text-xl", long: "text-base" },
    lg: { short: "text-3xl", medium: "text-2xl", long: "text-lg" },
    xl: { short: "text-4xl", medium: "text-3xl", long: "text-xl" },
  };

  const category = len <= 8 ? "short" : len <= 14 ? "medium" : "long";
  return matrix[size][category];
};

const getSubFontSize = (size: "sm" | "md" | "lg" | "xl"): string => {
  const map = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-xs",
    xl: "text-sm",
  };
  return map[size];
};

const GeneratedAlbumCover = ({
  title,
  previewImages = [],
  className,
  size = "md",
}: GeneratedAlbumCoverProps) => {
  const coverData = useMemo(() => {
    const hash = hashString(title.toLowerCase());
    const displayText = extractDisplayText(title);

    const validImages = previewImages.filter(Boolean);
    const hasImage = validImages.length > 0;
    const selectedImage = hasImage 
      ? validImages[hash % validImages.length] 
      : null;

    const position = TEXT_POSITIONS[hash % TEXT_POSITIONS.length];
    const overlayStyle = OVERLAY_STYLES[hash % OVERLAY_STYLES.length];
    const fallbackGradient = FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];

    return {
      displayText,
      selectedImage,
      hasImage,
      position,
      overlayStyle,
      fallbackGradient,
    };
  }, [title, previewImages]);

  const { displayText, selectedImage, hasImage, position, overlayStyle, fallbackGradient } = coverData;

  // Strong text shadows for readability without blur
  const textShadowSub = "0 1px 2px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.7), 0 0 16px rgba(0,0,0,0.5)";
  const textShadowMain = "0 2px 4px rgba(0,0,0,0.95), 0 4px 12px rgba(0,0,0,0.8), 0 8px 24px rgba(0,0,0,0.6)";

  return (
    <div
      className={cn(
        "relative overflow-hidden aspect-square rounded-lg",
        !hasImage && fallbackGradient,
        className
      )}
    >
      {/* Background Image - crisp and clear */}
      {hasImage && selectedImage && (
        <img
          src={selectedImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Overlay gradient */}
      <div className={cn("absolute inset-0", overlayStyle.overlay)} />

      {/* Noise texture for premium feel */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Text container */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col",
          position.align,
          position.padding
        )}
      >
        <div className={cn("flex flex-col gap-0.5", position.text)}>
          {/* Subtitle line */}
          {displayText.line1 && (
            <span
              className={cn(
                "font-bold uppercase tracking-[0.2em] opacity-95",
                overlayStyle.textColor,
                getSubFontSize(size)
              )}
              style={{ textShadow: textShadowSub }}
            >
              {displayText.line1}
            </span>
          )}

          {/* Main title */}
          <span
            className={cn(
              "font-extrabold leading-none tracking-tight",
              overlayStyle.textColor,
              getMainFontSize(displayText.line2, size)
            )}
            style={{ textShadow: textShadowMain }}
          >
            {displayText.line2}
          </span>
        </div>
      </div>

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.25)",
        }}
      />
    </div>
  );
};

export default GeneratedAlbumCover;