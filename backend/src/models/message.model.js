// models/message.model.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },

    content: { type: String, default: "" },

    // Updated type enum to include 'file'
    type: { 
      type: String, 
      enum: ["text", "audio", "file", "call_started", "call_missed", "call_declined"], 
      default: "text" 
    },

    // Audio fields
    audioUrl: { type: String, default: null },
    audioDuration: { type: Number, default: 0 },

    // File fields (NEW)
    files: [{
      url: { type: String, required: true },
      filename: { type: String, required: true },
      mimetype: { type: String, required: true },
      size: { type: Number, required: true },
    }],

    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },

    // Reply feature (NEW)
    replyTo: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Message',
      default: null 
    },

    // Reactions (NEW)
    reactions: [{
      emoji: { type: String, required: true },
      userId: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }],
  },
  { timestamps: true }
);

messageSchema.index({ receiverId: 1, senderId: 1, read: 1, createdAt: 1 });

export const Message = mongoose.model("Message", messageSchema);