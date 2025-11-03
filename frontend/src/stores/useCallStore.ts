import { create } from "zustand";

export type CallStatus = "idle" | "calling" | "incoming" | "connecting" | "connected";

type Actions = {
  startCall: (toId: string) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  setMinimized: (v: boolean) => void;
};

type CallState = {
  status: CallStatus;
  callId: string | null;
  peerId: string | null;          // other user id
  incomingFrom: string | null;    // set on incoming
  isMuted: boolean;
  elapsed: number;
  minimized: boolean;
  // Optional immediate UI data (from server event)
  peerName?: string | null;
  peerAvatar?: string | null;

  set: (p: Partial<CallState>) => void;
  reset: () => void;
  actions: Actions;
};

export const useCallStore = create<CallState>((set) => ({
  status: "idle",
  callId: null,
  peerId: null,
  incomingFrom: null,
  isMuted: false,
  elapsed: 0,
  minimized: false,
  peerName: null,
  peerAvatar: null,
  set: (p) => set(p),
  reset: () =>
    set({
      status: "idle",
      callId: null,
      peerId: null,
      incomingFrom: null,
      isMuted: false,
      elapsed: 0,
      minimized: false,
      peerName: null,
      peerAvatar: null,
    }),
  actions: {
    startCall: () => {},
    acceptCall: () => {},
    declineCall: () => {},
    endCall: () => {},
    toggleMute: () => {},
    setMinimized: () => {},
  },
}));