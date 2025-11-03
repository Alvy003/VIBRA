// controller/chat.controller.js
import { Message } from "../models/message.model.js";
import PushSubscription from "../models/PushSubscription.js";
import webpush from "../config/webpush.js";

export const sendMessage = async (req, res) => {
  const { senderId, recipientId, message } = req.body;

  try {
    // Save message
    await Message.create({
      senderId,
      receiverId: recipientId,
      content: message,
    });

    // Fetch all subs for this user (localhost + ngrok etc.)
    const subs = await PushSubscription.find({ userId: recipientId }).lean();

    if (!subs || subs.length === 0) {
      console.log("No push subscriptions for user:", recipientId);
    } else {
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
          console.log("Push sent to:", recipientId, "origin:", row.origin);
        } catch (err) {
          // Clean up expired/invalid subs
          const status = err?.statusCode || err?.code;
          if (status === 410 || status === 404) {
            await PushSubscription.deleteOne({ _id: row._id });
            console.warn("Removed expired subscription for", recipientId, "origin:", row.origin);
          } else {
            console.error("Push error:", status, err?.message);
          }
        }
      }
    }

    res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: err.message });
  }
};

// Add this to your existing chat.controller.js
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

    // Only allow sender to delete messages
    if (message.senderId !== userId) {
      return res.status(403).json({ error: "Can only delete your own messages" });
    }

    await Message.findByIdAndDelete(messageId);
    
    // Notify other user via socket if needed
    // You can emit a socket event here

    res.json({ ok: true });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};