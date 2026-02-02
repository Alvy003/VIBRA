// src/hooks/useImageColors.ts
import { useState, useEffect } from "react";

interface ImageColors {
  primary: string;
  secondary: string;
}

// Predefined color palettes as fallback
const colorPalettes = [
  { primary: "rgb(124, 58, 237)", secondary: "rgb(62, 29, 118)" }, // Violet
  { primary: "rgb(139, 92, 246)", secondary: "rgb(69, 46, 123)" }, // Purple
  { primary: "rgb(236, 72, 153)", secondary: "rgb(118, 36, 76)" }, // Pink
  { primary: "rgb(59, 130, 246)", secondary: "rgb(29, 65, 123)" }, // Blue
  { primary: "rgb(16, 185, 129)", secondary: "rgb(8, 92, 64)" },   // Green
  { primary: "rgb(245, 158, 11)", secondary: "rgb(122, 79, 5)" },  // Amber
  { primary: "rgb(239, 68, 68)", secondary: "rgb(119, 34, 34)" },  // Red
  { primary: "rgb(168, 85, 247)", secondary: "rgb(84, 42, 123)" }, // Fuchsia
];

const defaultColors = colorPalettes[0]; // Violet as default

export function useImageColors(imageUrl?: string | null): ImageColors {
  const [colors, setColors] = useState<ImageColors>(defaultColors);

  useEffect(() => {
    if (!imageUrl) {
      setColors(defaultColors);
      return;
    }

    // Create a hash from the URL to get consistent colors for the same image
    const getHashColor = (url: string) => {
      let hash = 0;
      for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return colorPalettes[Math.abs(hash) % colorPalettes.length];
    };

    const img = new Image();
    img.crossOrigin = "anonymous";

    const timeoutId = setTimeout(() => {
      // If image takes too long, use hash-based color
      setColors(getHashColor(imageUrl));
    }, 2000);

    img.onload = () => {
      clearTimeout(timeoutId);
      
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setColors(getHashColor(imageUrl));
          return;
        }

        const size = 50;
        canvas.width = size;
        canvas.height = size;

        ctx.drawImage(img, 0, 0, size, size);
        
        let imageData;
        try {
          imageData = ctx.getImageData(0, 0, size, size).data;
        } catch (e) {
          // CORS error - use hash-based color
          setColors(getHashColor(imageUrl));
          return;
        }

        // Sample colors from the image
        const colorCounts: Map<string, { count: number; r: number; g: number; b: number }> = new Map();

        for (let i = 0; i < imageData.length; i += 16) { // Sample every 4th pixel for speed
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];

          // Skip very dark, very light, and grayish colors
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const brightness = (r + g + b) / 3;
          const saturation = max === 0 ? 0 : (max - min) / max;

          if (brightness < 30 || brightness > 220) continue;
          if (saturation < 0.2) continue;

          // Quantize
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;

          const existing = colorCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            colorCounts.set(key, { count: 1, r: qr, g: qg, b: qb });
          }
        }

        const sorted = Array.from(colorCounts.values()).sort((a, b) => b.count - a.count);

        if (sorted.length === 0) {
          setColors(getHashColor(imageUrl));
          return;
        }

        // Pick the most vibrant from top 5
        let best = sorted[0];
        let maxScore = 0;

        for (const color of sorted.slice(0, 5)) {
          const max = Math.max(color.r, color.g, color.b);
          const min = Math.min(color.r, color.g, color.b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          const brightness = (color.r + color.g + color.b) / 3;
          const score = saturation * 0.7 + (brightness / 255) * 0.3;
          
          if (score > maxScore) {
            maxScore = score;
            best = color;
          }
        }

        setColors({
          primary: `rgb(${best.r}, ${best.g}, ${best.b})`,
          secondary: `rgb(${Math.round(best.r * 0.4)}, ${Math.round(best.g * 0.4)}, ${Math.round(best.b * 0.4)})`,
        });
      } catch (e) {
        setColors(getHashColor(imageUrl));
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      setColors(getHashColor(imageUrl));
    };

    img.src = imageUrl;

    return () => clearTimeout(timeoutId);
  }, [imageUrl]);

  return colors;
}