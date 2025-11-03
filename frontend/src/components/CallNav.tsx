// CallNav.tsx
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCallStore } from "@/stores/useCallStore";

export default function CallNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const actions = useCallStore((s) => s.actions);
  const set = useCallStore((s) => s.set);
  const status = useCallStore((s) => s.status);
  const prevStatusRef = useRef(status);

  // ✅ Handle query params - just show the call screen, DON'T auto-accept
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const callId = params.get("callId");
    const fromId = params.get("fromId");

    if (callId && fromId) {
      // Prime store
      set({ callId, incomingFrom: fromId, peerId: fromId, status: "incoming" });
      
      // ✅ REMOVED auto-accept - just open call screen
      actions.setMinimized(false);
      navigate("/chat", { replace: true });
    }
  }, []);

  useEffect(() => {
    if (prevStatusRef.current === "incoming" && status === "connecting") {
      navigate("/chat", { replace: true });
    }
    prevStatusRef.current = status;
  }, [status, navigate]);

  return null;
}