// utils/resolveExternalSong.js
import { Song } from "../models/song.model.js";

export const resolveExternalSong = async (songId, songData = {}) => {
  // Already a valid MongoDB ObjectId — return as-is
  if (/^[0-9a-fA-F]{24}$/.test(songId)) {
    return songId;
  }

  // Check if we already saved this external song
  const existing = await Song.findOne({ externalId: songId });
  if (existing) {
    return existing._id.toString();
  }

  // Determine source
  let source = "jiosaavn";
  if (songId.startsWith("youtube_")) source = "youtube";

  // Create a Song document for this external song
  const newSong = new Song({
    title: songData.title || "Unknown",
    artist: songData.artist || "Unknown",
    imageUrl: songData.imageUrl || "",
    audioUrl: songData.streamUrl || songData.audioUrl || "",
    duration: songData.duration || 0,
    source,
    externalId: songId,
    streamUrl: songData.streamUrl || null,
    videoId: songData.videoId || null,
    language: songData.language || null,
    albumId: null,
  });

  await newSong.save();
  return newSong._id.toString();
};