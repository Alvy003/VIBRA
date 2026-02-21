// models/user.model.js
import mongoose from "mongoose";

const externalSongSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true },
    source: { type: String, required: true }, // "jiosaavn", "youtube"
    title: { type: String, required: true },
    artist: { type: String, default: "" },
    album: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    language: { type: String, default: "" },
    year: { type: String, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    imageUrl: { type: String, required: true },
    clerkId: { type: String, required: true, unique: true },
    likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    likedExternalSongs: [externalSongSchema],
  },
  { timestamps: true }
);

// Index for fast external song lookups
userSchema.index({ clerkId: 1, "likedExternalSongs.externalId": 1 });

export const User = mongoose.model("User", userSchema);