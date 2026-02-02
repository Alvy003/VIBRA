// controller/chat.controller.js
import { Message } from "../models/message.model.js";
import PushSubscription from "../models/PushSubscription.js";
import webpush from "../config/webpush.js";
import { User } from "../models/user.model.js";
import { getIO, getUserSockets } from "../lib/socket.js"; 

export const sendMessage = async (req, res) => {
  const { senderId, recipientId, message, replyToId } = req.body;

  try {
    const messageData = {
      senderId,
      receiverId: recipientId,
      content: message,
    };

    // Add reply reference if provided
    if (replyToId) {
      messageData.replyTo = replyToId;
    }

    const newMessage = await Message.create(messageData);
    
    // Populate reply if exists
    let populatedMessage = newMessage;
    if (replyToId) {
      populatedMessage = await Message.findById(newMessage._id).populate('replyTo');
    }

    // Fetch all subs for this user
    const subs = await PushSubscription.find({ userId: recipientId }).lean();

    if (subs?.length) {
      const payload = JSON.stringify({
        title: "New Message",
        body: message,
        icon: "/vibra.png",
        badge: "/vibra.png",
        data: {
          url: `/chat`,
          senderId,
        },
      });

      for (const row of subs) {
        try {
          await webpush.sendNotification(row.subscription, payload);
        } catch (err) {
          const status = err?.statusCode || err?.code;
          if (status === 410 || status === 404) {
            await PushSubscription.deleteOne({ _id: row._id });
          }
        }
      }
    }

    res.status(200).json({ message: "Message sent successfully", data: populatedMessage });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: err.message });
  }
};

export const updateMessageDuration = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { duration } = req.body;
    
    if (!messageId || duration === undefined) {
      return res.status(400).json({ error: "Missing message ID or duration" });
    }
    
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId, 
      { audioDuration: Math.max(0, Math.round(Number(duration || 0))) },
      { new: true }
    );
    
    if (!updatedMessage) {
      return res.status(404).json({ error: "Message not found" });
    }
    
    res.json({ ok: true, duration: updatedMessage.audioDuration });
  } catch (e) {
    console.error("Failed to update message duration:", e);
    res.status(500).json({ error: "Failed to update duration" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.auth.userId;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ error: "Can only delete your own messages" });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({ ok: true });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// NEW: Add reaction to message
export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.auth.userId;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Remove existing reaction from this user if any
    message.reactions = message.reactions.filter(r => r.userId !== userId);
    
    // Add new reaction
    message.reactions.push({ emoji, userId });
    
    await message.save();

    // ✅ ADD THIS: Send push notification for reaction (only if reacting to someone else's message)
    if (message.senderId !== userId) {
      try {
        const subs = await PushSubscription.find({ userId: message.senderId }).lean();
        const sender = await User.findOne({ clerkId: userId }).lean();
        const senderName = sender?.fullName || "Someone";
        
        if (subs?.length) {
          const payload = JSON.stringify({
            title: senderName,
            body: `Reacted ${emoji} to your message`,
            icon: sender?.imageUrl || "/vibra.png",
            badge: "/vibra.png",
            tag: "reaction",
            data: { 
              url: `/chat`, 
              senderId: userId, 
              type: "reaction" 
            },
          });
          
          for (const row of subs) {
            try {
              await webpush.sendNotification(row.subscription, payload);
            } catch (e) {
              const code = e?.statusCode;
              if (code === 410 || code === 404) {
                await PushSubscription.deleteOne({ _id: row._id });
              }
            }
          }
        }
      } catch (pushErr) {
        console.error("Reaction push notification failed:", pushErr);
      }
    }

    // Emit socket event for real-time update
    const io = getIO();
    const userSockets = getUserSockets();
    
    if (io && userSockets) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      const otherSocketId = userSockets.get(otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit("message_reaction", { 
          messageId, 
          reactions: message.reactions 
        });
      }
    }

    res.json({ ok: true, reactions: message.reactions });
  } catch (error) {
    console.error("Add reaction error:", error);
    res.status(500).json({ error: "Failed to add reaction" });
  }
};

// NEW: Remove reaction from message
export const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.auth.userId;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    message.reactions = message.reactions.filter(r => r.userId !== userId);
    await message.save();

    // Emit socket event
    const io = getIO();
    const userSockets = getUserSockets();
    
    if (io && userSockets) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      const otherSocketId = userSockets.get(otherUserId);
      if (otherSocketId) {
        io.to(otherSocketId).emit("message_reaction", { 
          messageId, 
          reactions: message.reactions 
        });
      }
    }

    res.json({ ok: true, reactions: message.reactions });
  } catch (error) {
    console.error("Remove reaction error:", error);
    res.status(500).json({ error: "Failed to remove reaction" });
  }
};

export const quickReply = async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;

    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content,
      read: false,
    });

    const io = getIO();
    const userSockets = getUserSockets();
    
    if (io && userSockets) {
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", message);
      }
      
      const senderSocketId = userSockets.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("message_sent", message);
      }
    }

    const subs = await PushSubscription.find({ userId: receiverId }).lean();
    
    if (subs?.length) {
      const sender = await User.findOne({ clerkId: senderId }).lean();
      const senderName = sender?.fullName || "Someone";

      const payload = JSON.stringify({
        title: senderName,
        body: content,
        icon: sender?.imageUrl || "/vibra.png",
        badge: "/vibra.png",
        tag: `message-${senderId}`,
        renotify: true,
        data: {
          url: `/chat`,
          senderId,
          receiverId,
          senderName,
          type: "message",
        },
        actions: [
          { action: "reply_thumbsup", title: "👍" },
          { action: "reply_heart", title: "❤️" },
          { action: "reply_ok", title: "OK" },
        ],
      });

      for (const row of subs) {
        try {
          await webpush.sendNotification(row.subscription, payload);
        } catch (err) {
          const status = err?.statusCode || err?.code;
          if (status === 410 || status === 404) {
            await PushSubscription.deleteOne({ _id: row._id });
          }
        }
      }
    }

    res.json({ success: true, messageId: message._id });
  } catch (error) {
    console.error("Quick reply error:", error);
    res.status(500).json({ error: "Failed to send reply" });
  }
};