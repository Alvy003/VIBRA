// src/lib/animations.ts
export const sheetTransition = {
    high: {
      type: "spring",
      damping: 26,
      stiffness: 280,
    },
    medium: {
      type: "spring",
      damping: 30,
      stiffness: 220,
    },
    low: {
      duration: 0.22,
      ease: "easeOut",
    },
  };
  
  export const fadeTransition = {
    high: { duration: 0.25 },
    medium: { duration: 0.2 },
    low: { duration: 0.15 },
  };
  
  export const contentVariants = {
    high: {
      initial: { y: 32, opacity: 0 },
      animate: { y: 0, opacity: 1 },
    },
    medium: {
      initial: { y: 16, opacity: 0 },
      animate: { y: 0, opacity: 1 },
    },
    low: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    },
  };
  
  export const albumArtVariants = {
    high: {
      initial: { scale: 0.92, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
    },
    medium: {
      initial: { scale: 0.97, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
    },
    low: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    },
  };
  