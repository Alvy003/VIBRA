import { Playlist } from "../models/playlist.model.js";
import { Song } from "../models/song.model.js";

export const createPlaylist = async (req, res, next) => {
  try {
    const { name, description, imageUrl, isFeatured } = req.body;
    const playlist = await Playlist.create({ name, description, imageUrl, isFeatured });
    res.status(201).json(playlist);
  } catch (err) {
    next(err);
  }
};

export const getAllPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.find().sort({ createdAt: -1 });
    res.json(playlists);
  } catch (err) {
    next(err);
  }
};

export const getPlaylistById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const playlist = await Playlist.findById(id).populate("songs");
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });
    res.json(playlist);
  } catch (err) {
    next(err);
  }
};

export const updatePlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, isFeatured } = req.body;
    const playlist = await Playlist.findByIdAndUpdate(
      id,
      { name, description, imageUrl, isFeatured },
      { new: true }
    );
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });
    res.json(playlist);
  } catch (err) {
    next(err);
  }
};

export const patchPlaylistSongs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { op, songId, songs } = req.body;

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    if (op === "add" && songId) {
      playlist.songs.push(songId);
    } else if (op === "remove" && songId) {
      playlist.songs = playlist.songs.filter((s) => s.toString() !== songId);
    } else if ((op === "replace" || op === "reorder") && Array.isArray(songs)) {
      const validCount = await Song.countDocuments({ _id: { $in: songs } });
      if (validCount !== songs.length) {
        return res.status(400).json({ message: "Invalid song IDs" });
      }
      playlist.songs = songs;
    } else {
      return res.status(400).json({ message: "Invalid operation" });
    }

    await playlist.save();
    await playlist.populate("songs");
    res.json(playlist);
  } catch (err) {
    next(err);
  }
};

export const deletePlaylist = async (req, res, next) => {
  try {
    await Playlist.findByIdAndDelete(req.params.id);
    res.json({ message: "Playlist deleted successfully" });
  } catch (err) {
    next(err);
  }
};
