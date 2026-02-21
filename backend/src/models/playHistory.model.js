// models/playHistory.model.js
import mongoose from "mongoose";

const playHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  
  // For local songs: MongoDB ObjectId. For external: string like "jiosaavn_xxx"
  songId: { type: String, required: true },
  
  // Whether this is a local DB song or external
  isExternal: { type: Boolean, default: false },
  
  // Store external song data so we can display without re-fetching
  externalData: {
    title: String,
    artist: String,
    imageUrl: String,
    duration: Number,
    source: { type: String, enum: ["jiosaavn", "youtube"] },
    externalId: String,
    album: String,
    streamUrl: String,
  },

  playedAt: { type: Date, default: Date.now, index: true },
  completionPercentage: { type: Number, default: 100 },
  playDuration: { type: Number, default: 0 },
}, { timestamps: false });

playHistorySchema.index({ userId: 1, playedAt: -1 });
playHistorySchema.index({ userId: 1, songId: 1, playedAt: -1 });

export const PlayHistory = mongoose.model("PlayHistory", playHistorySchema);