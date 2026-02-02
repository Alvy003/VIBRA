// lib/socket.js
import { Server } from "socket.io";
import { Message } from "../models/message.model.js";
import PushSubscription from "../models/PushSubscription.js";
import webpush from "../config/webpush.js";
import { User } from "../models/user.model.js";

let io;
let userSockets = new Map();

export const getIO = () => io;
export const getUserSockets = () => userSockets;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, cb) => cb(null, true),
      credentials: true,
    },
  });

  const userActivities = new Map();
  const callRings = new Map();

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

    // ✅ TYPING INDICATOR
    socket.on("typing", ({ senderId, receiverId, isTyping }) => {
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("user_typing", { senderId, isTyping });
      }
    });

    // ✅ MARK MESSAGES AS READ
    socket.on("mark_messages_read", async ({ userId, otherUserId }) => {
      try {
        const result = await Message.updateMany(
          { senderId: otherUserId, receiverId: userId, read: false },
          { $set: { read: true, readAt: new Date() } }
        );
        
        // Notify the sender that their messages were read
        const senderSocketId = userSockets.get(otherUserId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messages_read", { by: userId });
        }
        
        // console.log(`Marked ${result.modifiedCount} messages as read from ${otherUserId} to ${userId}`);
      } catch (err) {
        console.error("Failed to mark messages as read:", err);
      }
    });

    // ✅ GET ONLINE USERS (for PWA reconnection)
      socket.on("get_online_users", () => {
        socket.emit("users_online", Array.from(userSockets.keys()));
        socket.emit("activities", Array.from(userActivities.entries()));
      });

    // ✅ TEXT MESSAGE WITH REPLY SUPPORT
    socket.on("send_message", async (data) => {
      try {
        const { senderId, receiverId, content, replyToId } = data;

        const messageData = {
          senderId,
          receiverId,
          content,
          read: false,
        };

        // Add reply reference if provided
        if (replyToId) {
          messageData.replyTo = replyToId;
        }

        const message = await Message.create(messageData);
        
        // Populate reply if exists
        let populatedMessage = message.toObject();
        if (replyToId) {
          const replyMessage = await Message.findById(replyToId).lean();
          if (replyMessage) {
            populatedMessage.replyTo = replyMessage;
          }
        }

        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", populatedMessage);
        socket.emit("message_sent", populatedMessage);

        // Push notification
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
              data: { url: `/chat`, senderId, receiverId, senderName, type: "message" },
              actions: [
                { action: "reply_thumbsup", title: "👍" },
                { action: "reply_heart", title: "❤️" },
                { action: "reply_ok", title: "OK" },
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
      } catch (error) {
        console.error("Message error:", error);
        socket.emit("message_error", error.message);
      }
    });

    // ✅ FILE MESSAGE WITH REPLY SUPPORT
    socket.on("send_file", async (data) => {
      try {
        const { senderId, receiverId, files, content, replyToId } = data;
        
        if (!files || files.length === 0) {
          return socket.emit("message_error", "No files provided");
        }

        const messageData = {
          senderId,
          receiverId,
          type: "file",
          files: files.map(f => ({
            url: f.url,
            filename: f.filename,
            mimetype: f.mimetype,
            size: f.size,
          })),
          content: content || "",
          read: false,
        };

        if (replyToId) {
          messageData.replyTo = replyToId;
        }

        const message = await Message.create(messageData);

        // Populate reply if exists
        let populatedMessage = message.toObject();
        if (replyToId) {
          const replyMessage = await Message.findById(replyToId).lean();
          if (replyMessage) {
            populatedMessage.replyTo = replyMessage;
          }
        }

        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", populatedMessage);
        socket.emit("message_sent", populatedMessage);

        // Push notification
        try {
          const subs = await PushSubscription.find({ userId: receiverId }).lean();
          const sender = await User.findOne({ clerkId: senderId }).lean();
          const senderName = sender?.fullName || "New message";
          
          if (subs?.length) {
            const fileCount = files.length;
            const hasImages = files.some(f => f.mimetype?.startsWith('image/'));
            const hasVideos = files.some(f => f.mimetype?.startsWith('video/'));
            
            let body = "";
            if (content) {
              body = content;
            } else if (hasImages && fileCount === 1) {
              body = "📷 Sent a photo";
            } else if (hasImages) {
              body = `📷 Sent ${fileCount} photos`;
            } else if (hasVideos) {
              body = "🎥 Sent a video";
            } else {
              body = `📎 Sent ${fileCount} file${fileCount > 1 ? 's' : ''}`;
            }

            const payload = {
              title: senderName,
              body,
              icon: sender?.imageUrl || "/vibra.png",
              badge: "/vibra.png",
              tag: "message",
              data: { url: `/chat`, senderId, senderName, type: "file_message" },
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
        } catch (pushError) {
          console.error("Push notification failed:", pushError);
        }
      } catch (e) {
        console.error("send_file error:", e);
        socket.emit("message_error", e.message);
      }
    });

    // ✅ VOICE MESSAGE WITH REPLY SUPPORT
    socket.on("send_voice", async (data) => {
      try {
        const { senderId, receiverId, audioUrl, duration, replyToId } = data;
        if (!audioUrl) return;

        const messageData = {
          senderId,
          receiverId,
          type: "audio",
          audioUrl,
          audioDuration: Math.max(0, Number(duration || 0)),
          content: "",
          read: false,
        };

        if (replyToId) {
          messageData.replyTo = replyToId;
        }

        const message = await Message.create(messageData);

        // Populate reply if exists
        let populatedMessage = message.toObject();
        if (replyToId) {
          const replyMessage = await Message.findById(replyToId).lean();
          if (replyMessage) {
            populatedMessage.replyTo = replyMessage;
          }
        }

        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", populatedMessage);
        socket.emit("message_sent", populatedMessage);

        // Push notification
        try {
          const subs = await PushSubscription.find({ userId: receiverId }).lean();
          const sender = await User.findOne({ clerkId: senderId }).lean();
          const senderName = sender?.fullName || "Voice message";
          if (subs?.length) {
            const payload = {
              title: senderName,
              body: "🎤 Voice message",
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

    // ✅ REACTION NOTIFICATION
    socket.on("add_reaction", async ({ messageId, emoji, senderId, receiverId }) => {
      try {
        // Notify the message owner about the reaction
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("message_reaction", { messageId, emoji, senderId });
        }

        // Send push notification for reaction
        try {
          const subs = await PushSubscription.find({ userId: receiverId }).lean();
          const sender = await User.findOne({ clerkId: senderId }).lean();
          const senderName = sender?.fullName || "Someone";
          
          if (subs?.length) {
            const payload = {
              title: senderName,
              body: `Reacted ${emoji} to your message`,
              icon: sender?.imageUrl || "/vibra.png",
              badge: "/vibra.png",
              tag: "reaction",
              data: { url: `/chat`, senderId, type: "reaction" },
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
        console.error("add_reaction error:", e);
      }
    });

    // CALL SIGNALING (unchanged)
    socket.on("call_user", async ({ fromId, toId }) => {
      const toSocket = userSockets.get(toId);
      const fromSocket = userSockets.get(fromId);
      const callId = genCallId();
    
      const timer = setTimeout(async () => {
        const callerSock = userSockets.get(fromId);
        const calleeSock = userSockets.get(toId);
        
        try {
          const message = await Message.create({
            senderId: fromId,
            receiverId: toId,
            type: "call_missed",
            content: "",
            read: false,
          });
          
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
    
      try {
        const message = await Message.create({
          senderId: fromId,
          receiverId: toId,
          type: "call_started",
          content: "",
          read: false,
        });
        
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
    
    socket.on("decline_call", async ({ callId, toId, fromId }) => {
      const ring = callRings.get(callId);
      if (ring) {
        clearTimeout(ring.timer);
        callRings.delete(callId);
      }
      
      try {
        const message = await Message.create({
          senderId: fromId,
          receiverId: toId,
          type: "call_declined",
          content: "",
          read: false,
        });
        
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