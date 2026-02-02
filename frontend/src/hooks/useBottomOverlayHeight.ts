import { usePlayerStore } from "@/stores/usePlayerStore";
import { useIsMobileBrowser } from "@/hooks/useIsMobileBrowser";

export const useBottomOverlayHeight = () => {
  const { currentSong } = usePlayerStore();
  const isMobileBrowser = useIsMobileBrowser();

  const bottomNav = 56;
  const miniPlayer = currentSong ? 64 : 0;
  const browserExtra = isMobileBrowser ? 16 : 0;

  return `calc(${bottomNav + miniPlayer + browserExtra}px + env(safe-area-inset-bottom))`;
};
