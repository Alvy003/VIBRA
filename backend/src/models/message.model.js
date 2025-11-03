import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true }, // Clerk user ID
    receiverId: { type: String, required: true }, // Clerk user ID

    // Text content is optional (audio messages don’t have it)
    content: { type: String, default: "" },

    // Support audio messages
    type: { type: String, enum: ["text", "audio", "call_started", "call_missed", "call_declined"], default: "text" },
    audioUrl: { type: String, default: null },
    audioDuration: { type: Number, default: 0 },

    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Helpful index for unread queries
messageSchema.index({ receiverId: 1, senderId: 1, read: 1, createdAt: 1 });

export const Message = mongoose.model("Message", messageSchema);