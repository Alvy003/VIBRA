// controller/playlist.controller.js
import { Playlist } from "../models/playlist.model.js";
import { Song } from "../models/song.model.js";

// Create playlist
export const createPlaylist = async (req, res, next) => {
  try {
    const { name, description, imageUrl, isFeatured, songIds } = req.body;
    const userId = req.auth.userId;
    
    if (!name?.trim()) {
      return res.status(400).json({ message: "Playlist name is required" });
    }

    // Check for duplicate name for this user
    const existing = await Playlist.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
      userId 
    });
    
    if (existing) {
      return res.status(400).json({ message: "You already have a playlist with this name" });
    }

    const playlist = await Playlist.create({
      name: name.trim(),
      description: description || "",
      imageUrl: imageUrl || null,
      songs: songIds || [],
      userId,
      isFeatured: req.isAdmin ? (isFeatured || false) : false,
      isPublic: true,
    });

    await playlist.populate("songs");
    res.status(201).json(playlist);
  } catch (err) {
    next(err);
  }
};

// Get user's playlists
export const getUserPlaylists = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const playlists = await Playlist.find({ userId })
      .populate("songs")
      .sort({ createdAt: -1 });
    res.json(playlists);
  } catch (err) {
    next(err);
  }
};

// Get featured playlists (admin created)
export const getFeaturedPlaylists = async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ isFeatured: true })
      .populate("songs")
      .sort({ createdAt: -1 });
    res.json(playlists);
  } catch (err) {
    next(err);
  }
};

// Get playlist by ID
export const getPlaylistById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.userId;

    const playlist = await Playlist.findById(id).populate("songs");
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Check access
    const isOwner = playlist.userId === userId;
    const isAdminPlaylist = !playlist.userId;
    
    if (!playlist.isPublic && !isOwner && !req.isAdmin && !isAdminPlaylist) {
      return res.status(403).json({ message: "This playlist is private" });
    }

    res.json(playlist);
  } catch (err) {
    next(err);
  }
};

// Update playlist
export const updatePlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, isPublic } = req.body;
    const userId = req.auth.userId;

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.userId !== userId && !req.isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (name) playlist.name = name.trim();
    if (description !== undefined) playlist.description = description;
    if (imageUrl !== undefined) playlist.imageUrl = imageUrl;
    if (isPublic !== undefined) playlist.isPublic = isPublic;

    await playlist.save();
    await playlist.populate("songs");
    res.json(playlist);
  } catch (err) {
    next(err);
  }
};

// Add/Remove songs from playlist
export const patchPlaylistSongs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { op, songId, songs } = req.body;
    const userId = req.auth.userId;

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.userId !== userId && !req.isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (op === "add" && songId) {
      // Verify song exists
      const song = await Song.findById(songId);
      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }
      
      if (!playlist.songs.includes(songId)) {
        playlist.songs.push(songId);
      }
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

// Delete playlist
export const deletePlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.userId !== userId && !req.isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Playlist.findByIdAndDelete(id);
    res.json({ message: "Playlist deleted successfully" });
  } catch (err) {
    next(err);
  }
};