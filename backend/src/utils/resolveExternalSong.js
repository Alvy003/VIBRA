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

  const cleanId = String(songId).replace(/^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/, "");
  const defaultAudioUrl = source === "jiosaavn" 
    ? `/api/stream/play/jiosaavn/${cleanId}`
    : `/api/stream/play/youtube/${cleanId}`;

  // Create a Song document for this external song
  const newSong = new Song({
    title: songData.title || "Unknown",
    artist: songData.artist || "Unknown",
    imageUrl: songData.imageUrl || songData.artwork || "",
    audioUrl: songData.streamUrl || songData.audioUrl || songData.url || defaultAudioUrl,
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