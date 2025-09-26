import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    imageUrl: { type: String },
    isFeatured: { type: Boolean, default: false }, // useful for "Trending"
  },
  { timestamps: true }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
