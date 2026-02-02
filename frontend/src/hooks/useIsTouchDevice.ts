import { useEffect, useState } from "react";

export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const detected =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    setIsTouch(detected);

    const handleFirstTouch = () => {
      setIsTouch(true);
      window.removeEventListener("touchstart", handleFirstTouch);
    };

    window.addEventListener("touchstart", handleFirstTouch, { passive: true });

    return () =>
      window.removeEventListener("touchstart", handleFirstTouch);
  }, []);

  return isTouch;
}
