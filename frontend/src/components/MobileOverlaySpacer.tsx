import { usePlayerStore } from "@/stores/usePlayerStore";
import { useIsMobileBrowser } from "@/hooks/useIsMobileBrowser";

export const MobileOverlaySpacer = () => {
  const { currentSong } = usePlayerStore();
  const isMobileBrowser = useIsMobileBrowser();

  const base = currentSong
    ? "calc(56px + 64px + env(safe-area-inset-bottom))"
    : "calc(56px + env(safe-area-inset-bottom))";

  // 👇 add extra only for mobile browser (NOT PWA) 16px
  const extra = isMobileBrowser ? "45px" : "0px";

  return (
    <div
      className="md:hidden"
      style={{
        height: `calc(${base} + ${extra})`,
      }}
    />
  );
};
