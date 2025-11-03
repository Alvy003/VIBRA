import { Server } from "socket.io";
import { Message } from "../models/message.model.js";
import PushSubscription from "../models/PushSubscription.js";
import webpush from "../config/webpush.js";
import { User } from "../models/user.model.js";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: (origin, cb) => cb(null, true),
      credentials: true,
    },
  });

  const userSockets = new Map(); // userId -> socketId
  const userActivities = new Map();
  const callRings = new Map(); // callId -> { fromId, toId, timer }

  const genCallId = () => `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  io.on("connection", (socket) => {
    socket.on("user_connected", (userId) => {
      userSockets.set(userId, socket.id);
      userActivities.set(userId, "Idle");
      io.emit("user_connected", userId);
      socket.emit("users_online", Array.from(userSockets.keys()));
      io.emit("activities", Array.from(userActivities.entries()));
    });

    socket.on("update_activity", ({ userId, activity }) => {
      userActivities.set(userId, activity);
      io.emit("activity_updated", { userId, activity });
    });

    // TEXT
    socket.on("send_message", async (data) => {
      try {
        const { senderId, receiverId, content } = data;

        const message = await Message.create({
          senderId,
          receiverId,
          content,
          read: false,
        });

        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", message);
        socket.emit("message_sent", message);

        try {
          const subs = await PushSubscription.find({ userId: receiverId }).lean();
          const sender = await User.findOne({ clerkId: senderId }).lean();
          const senderName = sender?.fullName || "New message";
          if (subs?.length) {
            const payload = {
              title: senderName,
              body: content || "New message",
              icon: sender?.imageUrl || "/vibra.png",
              badge: "/vibra.png",
              tag: "message",
              data: { url: `/chat`, senderId, senderName, type: "message" },
            };
            for (const row of subs) {
              try {
                await webpush.sendNotification(row.subscription, JSON.stringify(payload));
              } catch (e) {
                const code = e?.statusCode;
                if (code === 410 || code === 404) await PushSubscription.deleteOne({ _id: row._id });
              }
            }
          }
        } catch {}
      } catch (error) {
        console.error("Message error:", error);
        socket.emit("message_error", error.message);
      }
    });

    // VOICE
    socket.on("send_voice", async (data) => {
      try {
        const { senderId, receiverId, audioUrl, duration } = data;
        if (!audioUrl) return;

        const message = await Message.create({
          senderId,
          receiverId,
          type: "audio",
          audioUrl,
          audioDuration: Math.max(0, Number(duration || 0)),
          content: "",
          read: false,
        });

        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", message);
        socket.emit("message_sent", message);

        try {
          const subs = await PushSubscription.find({ userId: receiverId }).lean();
          const sender = await User.findOne({ clerkId: senderId }).lean();
          const senderName = sender?.fullName || "Voice message";
          if (subs?.length) {
            const payload = {
              title: senderName,
              body: "Voice message",
              icon: sender?.imageUrl || "/vibra.png",
              badge: "/vibra.png",
              tag: "message",
              data: { url: `/chat`, senderId, senderName, type: "voice_message" },
            };
            for (const row of subs) {
              try {
                await webpush.sendNotification(row.subscription, JSON.stringify(payload));
              } catch (e) {
                const code = e?.statusCode;
                if (code === 410 || code === 404) await PushSubscription.deleteOne({ _id: row._id });
              }
            }
          }
        } catch {}
      } catch (e) {
        console.error("send_voice error:", e);
      }
    });

    // 1:1 CALL SIGNALING
    socket.on("call_user", async ({ fromId, toId }) => {
      const toSocket = userSockets.get(toId);
      const fromSocket = userSockets.get(fromId);
      const callId = genCallId();
    
      const timer = setTimeout(async () => {
        const callerSock = userSockets.get(fromId);
        const calleeSock = userSockets.get(toId);
        
        // ✅ Store missed call message
        try {
          const message = await Message.create({
            senderId: fromId,
            receiverId: toId,
            type: "call_missed",
            content: "",
            read: false,
          });
          
          // ✅ Emit to both users in real-time
          if (callerSock) io.to(callerSock).emit("receive_message", message);
          if (calleeSock) io.to(calleeSock).emit("receive_message", message);
        } catch (err) {
          console.error("Failed to store missed call:", err);
        }
        
        if (callerSock) io.to(callerSock).emit("call_missed", { callId, toId });
        if (calleeSock) io.to(calleeSock).emit("call_missed", { callId, fromId });
        callRings.delete(callId);
      }, 30_000);
    
      callRings.set(callId, { fromId, toId, timer });
    
      if (fromSocket) io.to(fromSocket).emit("outgoing_call", { callId, toId });
    
      if (toSocket) {
        const caller = await User.findOne({ clerkId: fromId }).lean();
        io.to(toSocket).emit("incoming_call", {
          callId,
          fromId,
          fromName: caller?.fullName || "Vibra User",
          fromImage: caller?.imageUrl || "vibra.png",
        });
      } else {
        try {
          const subs = await PushSubscription.find({ userId: toId }).lean();
          const caller = await User.findOne({ clerkId: fromId }).lean();
          const senderName = caller?.fullName || "Incoming call";
          if (subs?.length) {
            const payload = {
              title: senderName,
              body: "Incoming call",
              icon: caller?.imageUrl || "/vibra.png",
              badge: "/vibra.png",
              tag: "call",
              data: { url: `/chat`, type: "incoming_call", callId, fromId, senderName },
              requireInteraction: true,
              actions: [
                { action: "accept", title: "Accept" },
                { action: "decline", title: "Decline" },
              ],
            };
            for (const row of subs) {
              try {
                await webpush.sendNotification(row.subscription, JSON.stringify(payload));
              } catch (e) {
                const code = e?.statusCode;
                if (code === 410 || code === 404) await PushSubscription.deleteOne({ _id: row._id });
              }
            }
          }
        } catch {}
      }
    });

    socket.on("accept_call", async ({ callId, toId, fromId }) => {
      const ring = callRings.get(callId);
      if (!ring) return;
      clearTimeout(ring.timer);
      callRings.delete(callId);
    
      // ✅ Store successful call message
      try {
        const message = await Message.create({
          senderId: fromId,
          receiverId: toId,
          type: "call_started",
          content: "",
          read: false,
        });
        
        // ✅ Emit to both users in real-time
        const callerSock = userSockets.get(fromId);
        const calleeSock = userSockets.get(toId);
        if (callerSock) io.to(callerSock).emit("receive_message", message);
        if (calleeSock) io.to(calleeSock).emit("receive_message", message);
      } catch (err) {
        console.error("Failed to store call message:", err);
      }
    
      const callerSock = userSockets.get(fromId);
      const calleeSock = userSockets.get(toId);
    
      if (callerSock) io.to(callerSock).emit("call_accepted", { callId, toId });
      if (calleeSock) io.to(calleeSock).emit("call_accepted", { callId, fromId });
    });
    
    // ✅ When call is declined
    socket.on("decline_call", async ({ callId, toId, fromId }) => {
      const ring = callRings.get(callId);
      if (ring) {
        clearTimeout(ring.timer);
        callRings.delete(callId);
      }
      
      // ✅ Store declined call message
      try {
        const message = await Message.create({
          senderId: fromId,
          receiverId: toId,
          type: "call_declined",
          content: "",
          read: false,
        });
        
        // ✅ Emit to both users in real-time
        const callerSock = userSockets.get(fromId);
        const calleeSock = userSockets.get(toId);
        if (callerSock) io.to(callerSock).emit("receive_message", message);
        if (calleeSock) io.to(calleeSock).emit("receive_message", message);
      } catch (err) {
        console.error("Failed to store declined call:", err);
      }
      
      const callerSock = userSockets.get(fromId);
      if (callerSock) io.to(callerSock).emit("call_declined", { callId, toId });
    });

    socket.on("cancel_call", ({ callId, toId, fromId }) => {
      const ring = callRings.get(callId);
      if (ring) {
        clearTimeout(ring.timer);
        callRings.delete(callId);
      }
      const calleeSock = userSockets.get(toId);
      if (calleeSock) io.to(calleeSock).emit("call_cancelled", { callId, fromId });
    });

    // SDP/ICE relay
    socket.on("webrtc_offer", ({ toId, offer, callId }) => {
      const toSocket = userSockets.get(toId);
      if (toSocket) io.to(toSocket).emit("webrtc_offer", { offer, callId });
    });

    socket.on("webrtc_answer", ({ toId, answer, callId }) => {
      const toSocket = userSockets.get(toId);
      if (toSocket) io.to(toSocket).emit("webrtc_answer", { answer, callId });
    });

    socket.on("webrtc_ice_candidate", ({ toId, candidate, callId }) => {
      const toSocket = userSockets.get(toId);
      if (toSocket) io.to(toSocket).emit("webrtc_ice_candidate", { candidate, callId });
    });

    // End call
    socket.on("end_call", ({ toId, callId }) => {
      const ring = callRings.get(callId);
      if (ring) {
        clearTimeout(ring.timer);
        callRings.delete(callId);
      }
      const toSocket = userSockets.get(toId);
      if (toSocket) io.to(toSocket).emit("call_ended", { callId });
      io.to(socket.id).emit("call_ended", { callId });
    });

    socket.on("disconnect", () => {
      let userId;
      for (const [uid, sid] of userSockets.entries()) {
        if (sid === socket.id) {
          userId = uid;
          userSockets.delete(uid);
          userActivities.delete(uid);
          break;
        }
      }
      if (userId) io.emit("user_disconnected", userId);

      for (const [callId, info] of callRings.entries()) {
        if (info.fromId === userId || info.toId === userId) {
          clearTimeout(info.timer);
          callRings.delete(callId);
          const otherId = info.fromId === userId ? info.toId : info.fromId;
          const otherSock = userSockets.get(otherId);
          if (otherSock) io.to(otherSock).emit("call_missed", { callId });
        }
      }
    });
  });
};