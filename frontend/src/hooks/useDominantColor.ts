import { useState, useEffect, useRef } from "react";

/** Shared cache so colors persist across components and prefetches */
const colorCache = new Map<string, string>();

/** Safe fallback — dark cinematic neutral */
const DEFAULT_COLOR = "hsl(240, 15%, 12%)";

/* =========================
   Color Math Helpers
   ========================= */

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;

    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
  };
}

/** Critical normalization for premium-looking UI */
function normalizeHsl({
  h,
  s,
  l,
}: {
  h: number;
  s: number;
  l: number;
}) {
  return {
    h,

    // Prevent muddy / gray backgrounds
    s: Math.max(s, 60),

    // Keep background cinematic & rich
    l: Math.min(Math.max(l, 32), 46),
  };
}

/* =========================
   Extraction Logic
   ========================= */

function extractColor(imageUrl: string): Promise<string> {
  if (colorCache.has(imageUrl)) {
    return Promise.resolve(colorCache.get(imageUrl)!);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 50;
        canvas.height = 50;

        const ctx = canvas.getContext("2d", {
          willReadFrequently: true,
        });

        if (!ctx) {
          resolve(DEFAULT_COLOR);
          return;
        }

        ctx.drawImage(img, 0, 0, 50, 50);

        const data = ctx.getImageData(0, 0, 50, 50).data;

        let r = 0,
          g = 0,
          b = 0,
          count = 0;

        for (let i = 0; i < data.length; i += 16) {
          const pr = data[i];
          const pg = data[i + 1];
          const pb = data[i + 2];

          const brightness = (pr + pg + pb) / 3;

          // Skip near-black & near-white noise
          if (brightness > 20 && brightness < 235) {
            r += pr;
            g += pg;
            b += pb;
            count++;
          }
        }

        let result: string;

        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);

          const hsl = normalizeHsl(rgbToHsl(r, g, b));

          result = `hsl(${hsl.h.toFixed(0)}, ${hsl.s.toFixed(
            0
          )}%, ${hsl.l.toFixed(0)}%)`;
        } else {
          result = DEFAULT_COLOR;
        }

        colorCache.set(imageUrl, result);
        resolve(result);
      } catch {
        resolve(DEFAULT_COLOR);
      }
    };

    img.onerror = () => resolve(DEFAULT_COLOR);
    img.src = imageUrl;
  });
}

/* =========================
   Prefetch Support
   ========================= */

export function prefetchDominantColor(imageUrl: string | undefined) {
  if (!imageUrl || colorCache.has(imageUrl)) return;

  extractColor(imageUrl); // fire & forget
}

/* =========================
   React Hook
   ========================= */

export function useDominantColor(imageUrl: string | undefined) {
  const [color, setColor] = useState<string>(() => {
    if (imageUrl && colorCache.has(imageUrl)) {
      return colorCache.get(imageUrl)!;
    }

    return DEFAULT_COLOR;
  });

  const currentUrlRef = useRef(imageUrl);

  useEffect(() => {
    currentUrlRef.current = imageUrl;

    if (!imageUrl) {
      setColor(DEFAULT_COLOR);
      return;
    }

    if (colorCache.has(imageUrl)) {
      setColor(colorCache.get(imageUrl)!);
      return;
    }

    extractColor(imageUrl).then((result) => {
      if (currentUrlRef.current === imageUrl) {
        setColor(result);
      }
    });
  }, [imageUrl]);

  return color;
}
