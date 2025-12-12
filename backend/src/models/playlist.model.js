// models/playlist.model.js
import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    imageUrl: { type: String },
    
    // Support both admin and user playlists
    userId: { type: String, default: null, index: true }, // null = admin playlist
    isFeatured: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
playlistSchema.index({ userId: 1, createdAt: -1 });
playlistSchema.index({ isFeatured: 1, createdAt: -1 });

export const Playlist = mongoose.model("Playlist", playlistSchema);