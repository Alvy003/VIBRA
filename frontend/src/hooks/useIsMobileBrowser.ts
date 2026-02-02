export const useIsMobileBrowser = () => {
    if (typeof window === "undefined") return false;
  
    const isStandalone =
      (window.navigator as any).standalone ||
      window.matchMedia("(display-mode: standalone)").matches;
  
    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
    return isMobile && !isStandalone;
  };
  