// models/playHistory.model.js
import mongoose from "mongoose";

const playHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  songId: { type: mongoose.Schema.Types.ObjectId, ref: "Song", required: true },
  playedAt: { type: Date, default: Date.now, index: true },
  completionPercentage: { type: Number, default: 100 },
  playDuration: { type: Number, default: 0 },
}, { timestamps: false });

playHistorySchema.index({ userId: 1, playedAt: -1 });
playHistorySchema.index({ userId: 1, songId: 1, playedAt: -1 });

export const PlayHistory = mongoose.model("PlayHistory", playHistorySchema);