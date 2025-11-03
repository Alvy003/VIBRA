import { useEffect } from "react";

export default function useServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        // service-worker.js must be in public/ so it's served from /
        const reg = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });

        // Optional logs
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener("statechange", () => {
            // console.log("SW state:", newWorker.state);
          });
        });
      } catch (err) {
        console.error("SW registration failed:", err);
      }
    };

    register();
  }, []);
}