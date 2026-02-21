import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    artist: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    audioUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    albumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Album",
      required: false,
    },
    genre: {
        type: String,
        required: false,
        default: null,
    },
    mood: {
        type: String,
        required: false,
        default: null,
    },
    language: {
        type: String,
        required: false,
        default: null,
    },
    cloudProvider: {
      type: String,
      enum: ["cloudinary", "imagekit"],
      default: "cloudinary",
    },
    source: {
      type: String,
      enum: ["local", "jiosaavn", "youtube"],
      default: "local",
    },
    externalId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    streamUrl: {
      type: String,
      default: null,
    },
    videoId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const Song = mongoose.model("Song", songSchema);