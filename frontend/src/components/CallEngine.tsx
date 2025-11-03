import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/useChatStore";
import { useCallStore, CallStatus } from "@/stores/useCallStore";
import { useCallSounds } from "@/hooks/useCallSounds";

const FALLBACK_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export default function CallEngine({ myId }: { myId?: string | null }) {
  const socket = useChatStore((s) => s.socket);
  const { playRingtone, playRingback, stopAll } = useCallSounds();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]); // ✅ Queue for early candidates
  const connectedAtRef = useRef<number | null>(null);
  const tickerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const iceRef = useRef<RTCIceServer[] | null>(null);
  const [iceReady, setIceReady] = useState(false);

  const getCall = () => useCallStore.getState();
  const setCall = (p: Partial<ReturnType<typeof useCallStore.getState>>) => useCallStore.getState().set(p);
  const resetCall = () => useCallStore.getState().reset();

  // Fetch ICE servers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // console.log("🔄 Fetching ICE servers...");
        const r = await fetch("/api/misc/ice", { credentials: "include" });
        const j = await r.json().catch(() => ({}));
        
        // console.log("📡 ICE response:", j);
        
        const servers: RTCIceServer[] =
          Array.isArray(j?.iceServers) && j.iceServers.length > 0
            ? j.iceServers
            : FALLBACK_ICE;
        
        // console.log("✅ Using ICE servers:", servers);
        iceRef.current = servers;
      } catch (err) {
        console.error("❌ ICE fetch failed:", err);
        iceRef.current = FALLBACK_ICE;
      } finally {
        if (!cancelled) setIceReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startTicker = () => {
    if (tickerRef.current) return;
    tickerRef.current = window.setInterval(() => {
      if (connectedAtRef.current) {
        const s = Math.floor((Date.now() - connectedAtRef.current) / 1000);
        setCall({ elapsed: s });
      }
    }, 1000) as unknown as number;
  };

  const stopTicker = () => {
    if (tickerRef.current) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    setCall({ elapsed: 0 });
  };

  const startTimeout = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      const st = getCall().status as CallStatus;
      if (st === "calling" || st === "connecting") cleanup(true);
    }, 30000) as unknown as number;
  };

  const clearTimeoutRef = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // ✅ Process candidates that arrived before remote description was set
  const processPendingCandidates = async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;

    if (pendingCandidatesRef.current.length > 0) {
      //console.log(`🔄 Processing ${pendingCandidatesRef.current.length} pending candidates`);
      
      for (const candidate of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          // console.log("✅ Added queued candidate");
        } catch (err) {
          console.error("❌ Failed to add queued candidate:", err);
        }
      }
      
      pendingCandidatesRef.current = [];
    }
  };

  const ensurePC = () => {
    if (pcRef.current) return pcRef.current;
    
    const servers = iceRef.current || FALLBACK_ICE;
    // console.log("🔧 Creating PeerConnection with servers:", JSON.stringify(servers, null, 2));
    
    const pc = new RTCPeerConnection({ 
      iceServers: servers,
      iceTransportPolicy: "all", // ✅ Use "all" for best compatibility
    });

    pc.onicecandidate = (e) => {
      const { peerId, callId } = getCall();
      if (e.candidate) {
        // const candidateStr = e.candidate.candidate;
        // let type = "unknown";
        // if (candidateStr.includes("typ host")) type = "host (local)";
        // else if (candidateStr.includes("typ srflx")) type = "srflx (STUN)";
        // else if (candidateStr.includes("typ relay")) type = "relay (TURN)"; // ✅ This means TURN is working!
        
        //  console.log(`🧊 ICE Candidate [${type}]:`, candidateStr);
        
        if (peerId && socket) {
          socket.emit("webrtc_ice_candidate", { toId: peerId, candidate: e.candidate, callId });
        }
      } else {
        // console.log("✅ ICE gathering complete");
      }
    };

    pc.oniceconnectionstatechange = () => {
      // console.log("🧊 ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        console.error("❌ ICE connection failed");
      }
    };

    pc.onicegatheringstatechange = () => {
      // console.log("📡 ICE gathering state:", pc.iceGatheringState);
    };

    pc.ontrack = (e) => {
      // console.log("🎵 Remote track received");
      if (!remoteAudioRef.current) {
        const el = document.createElement("audio");
        el.autoplay = true;
        el.setAttribute("playsinline", "true");
        el.muted = false;
        remoteAudioRef.current = el;
        document.body.appendChild(el);
      }
      remoteAudioRef.current.srcObject = e.streams[0];
      remoteAudioRef.current.play().catch((err) => console.error("Audio play error:", err));
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      // console.log("🔌 Connection state:", s);
      if (s === "connected") {
        setCall({ status: "connected" });
        stopAll();
        clearTimeoutRef();
        if (!connectedAtRef.current) {
          connectedAtRef.current = Date.now();
          startTicker();
        }
      } else if (s === "failed" || s === "disconnected" || s === "closed") {
        cleanup(false);
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const getMic = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const s = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    localStreamRef.current = s;
    return s;
  };

  const attachOrReplaceTrack = async () => {
    const pc = ensurePC();
    const stream = await getMic();
    const track = stream.getAudioTracks()[0];
    const sender = pc.getSenders().find((s) => s.track && s.track.kind === "audio");
    if (sender) {
      await sender.replaceTrack(track);
    } else {
      pc.addTrack(track, stream);
    }
    return stream;
  };

  const cleanup = (signalOther = true) => {
    const { peerId, callId } = getCall();
    if (signalOther && socket && peerId && callId) {
      socket.emit("end_call", { toId: peerId, callId });
    }

    stopAll();
    clearTimeoutRef();
    stopTicker();
    connectedAtRef.current = null;

    try {
      pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      pcRef.current?.close();
    } catch {}
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current.remove();
      } catch {}
      remoteAudioRef.current = null;
    }
    
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = []; // ✅ Clear queued candidates
    resetCall();
  };

  // Actions
  useEffect(() => {
    useCallStore.setState({
      actions: {
        startCall: async (toId: string) => {
          const sk = useChatStore.getState().socket;
          const uid = myId;
          if (!sk || !uid) return;

          // ✅ Wait for ICE servers
          if (!iceReady) {
            // console.log("⏳ Waiting for ICE servers...");
            await new Promise((resolve) => {
              const check = setInterval(() => {
                if (iceRef.current) {
                  clearInterval(check);
                  resolve(true);
                }
              }, 100);
              setTimeout(() => {
                clearInterval(check);
                resolve(true);
              }, 3000);
            });
          }

          // console.log("📞 Starting call to:", toId);
          setCall({ status: "calling", peerId: toId, incomingFrom: null });
          sk.emit("call_user", { fromId: uid, toId });
          playRingback();
          startTimeout();

          ensurePC();
          await attachOrReplaceTrack();
          
          const offer = await pcRef.current!.createOffer({ offerToReceiveAudio: true });
          await pcRef.current!.setLocalDescription(offer);

          const callId = getCall().callId || undefined;
          // console.log("📤 Sending offer");
          sk.emit("webrtc_offer", { toId, offer, callId });
        },

        acceptCall: async () => {
          const st = getCall();
          const sk = useChatStore.getState().socket;
          const uid = myId;
          if (!sk || !uid || !st.callId || !st.incomingFrom) return;

          if (!iceReady) {
            // console.log("⏳ Waiting for ICE servers...");
            await new Promise((resolve) => {
              const check = setInterval(() => {
                if (iceRef.current) {
                  clearInterval(check);
                  resolve(true);
                }
              }, 100);
              setTimeout(() => {
                clearInterval(check);
                resolve(true);
              }, 3000);
            });
          }

          // console.log("✅ Accepting call from:", st.incomingFrom);
          setCall({ status: "connecting" });
          sk.emit("accept_call", { callId: st.callId, toId: uid, fromId: st.incomingFrom });
          stopAll();
          startTimeout();

          ensurePC();
          await attachOrReplaceTrack();

          if (pendingOfferRef.current) {
            const pc = ensurePC();

            if (pc.signalingState === "have-local-offer") {
              await pc.setLocalDescription({ type: "rollback" } as any);
            }

            await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
            
            // ✅ Process candidates that arrived early
            await processPendingCandidates();
            
            const ans = await pc.createAnswer({ offerToReceiveAudio: true });
            await pc.setLocalDescription(ans);
            
            // console.log("📤 Sending answer");
            sk.emit("webrtc_answer", { toId: st.incomingFrom, answer: ans, callId: st.callId });
            pendingOfferRef.current = null;
          }
        },

        declineCall: () => {
          const st = getCall();
          const sk = useChatStore.getState().socket;
          const uid = myId;
          if (!sk || !uid || !st.callId || !st.incomingFrom) return;
          sk.emit("decline_call", { callId: st.callId, toId: uid, fromId: st.incomingFrom });
          cleanup(false);
        },

        endCall: () => cleanup(true),

        toggleMute: async () => {
          if (!localStreamRef.current) await attachOrReplaceTrack();
          const next = !getCall().isMuted;
          setCall({ isMuted: next });
          localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
        },

        setMinimized: (v: boolean) => setCall({ minimized: v }),
      },
    });
  }, [myId, playRingback, stopAll, iceReady]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const onOutgoing = (p: { callId: string; toId: string }) => setCall({ callId: p.callId });

    const onIncoming = (p: { callId: string; fromId: string; fromName?: string; fromImage?: string }) => {
      // console.log("📲 Incoming call from:", p.fromId);
      setCall({
        status: "incoming",
        callId: p.callId,
        incomingFrom: p.fromId,
        peerId: p.fromId,
        peerName: p.fromName || null,
        peerAvatar: p.fromImage || null,
      });
      playRingtone();
      startTimeout();
    };

    const onAccepted = () => {
      if (getCall().status === "calling") {
        setCall({ status: "connecting" });
        stopAll();
      }
    };

    const onDeclined = () => {
      cleanup(false);
    };

    const onMissed = () => {
      cleanup(false);
    };

    const onCancelled = () => {
      cleanup(false);
    };

    const onOffer = async (p: { offer: RTCSessionDescriptionInit; callId?: string }) => {
      // console.log("📥 Received offer");
      pendingOfferRef.current = p.offer;
      const st = getCall().status as CallStatus;
      if (st !== "connecting") return;

      const pc = ensurePC();

      if (pc.signalingState === "have-local-offer") {
        await pc.setLocalDescription({ type: "rollback" } as any);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(p.offer));
      
      // ✅ Process candidates that arrived before the offer
      await processPendingCandidates();
      
      await attachOrReplaceTrack();
      const ans = await pc.createAnswer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(ans);

      const { peerId, callId } = getCall();
      socket.emit("webrtc_answer", { toId: peerId!, answer: ans, callId: p.callId });
      pendingOfferRef.current = null;
      console.log("📤 Sent answer",callId);
    };

    const onAnswer = async (p: { answer: RTCSessionDescriptionInit }) => {
      // console.log("📥 Received answer");
      const pc = ensurePC();
      if (pc.signalingState !== "have-local-offer") {
        console.warn("⚠️ Ignoring unexpected answer in state:", pc.signalingState);
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(p.answer));
      
      // ✅ Process candidates that arrived before the answer
      await processPendingCandidates();
    };

    // ✅ Fixed: Queue candidates if remote description isn't set yet
    const onCandidate = async (p: { candidate: RTCIceCandidateInit }) => {
      // console.log("📥 Received ICE candidate");
      try {
        const pc = pcRef.current;
        if (!pc) {
          console.warn("⚠️ No peer connection, queueing candidate");
          pendingCandidatesRef.current.push(p.candidate);
          return;
        }

        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(p.candidate));
          // console.log("✅ Added ICE candidate");
        } else {
          console.warn("⚠️ Remote description not set, queueing candidate");
          pendingCandidatesRef.current.push(p.candidate);
        }
      } catch (err) {
        // console.error("❌ Error adding ICE candidate:", err);
      }
    };

    const onEnded = () => {
      cleanup(false);
    };

    socket.on("outgoing_call", onOutgoing);
    socket.on("incoming_call", onIncoming);
    socket.on("call_accepted", onAccepted);
    socket.on("call_declined", onDeclined);
    socket.on("call_missed", onMissed);
    socket.on("call_cancelled", onCancelled);
    socket.on("webrtc_offer", onOffer);
    socket.on("webrtc_answer", onAnswer);
    socket.on("webrtc_ice_candidate", onCandidate);
    socket.on("call_ended", onEnded);

    return () => {
      socket.off("outgoing_call", onOutgoing);
      socket.off("incoming_call", onIncoming);
      socket.off("call_accepted", onAccepted);
      socket.off("call_declined", onDeclined);
      socket.off("call_missed", onMissed);
      socket.off("call_cancelled", onCancelled);
      socket.off("webrtc_offer", onOffer);
      socket.off("webrtc_answer", onAnswer);
      socket.off("webrtc_ice_candidate", onCandidate);
      socket.off("call_ended", onEnded);
    };
  }, [socket, playRingtone, stopAll]);

  return null;
}