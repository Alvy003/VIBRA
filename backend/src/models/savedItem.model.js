// models/savedItem.model.js
import mongoose from "mongoose";

const savedItemSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ["album", "playlist"], required: true },
    source: { type: String, enum: ["jiosaavn", "youtube"], required: true },
    externalId: { type: String, required: true },
    title: { type: String, required: true },
    artist: { type: String, default: "" },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    year: { type: Number, default: null },
    language: { type: String, default: null },
    songCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Prevent duplicate saves
savedItemSchema.index({ userId: 1, externalId: 1 }, { unique: true });
savedItemSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const SavedItem = mongoose.model("SavedItem", savedItemSchema);