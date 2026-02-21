import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const currentUserId = req.auth.userId;
    const users = await User.find({ clerkId: { $ne: currentUserId } });
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const myId = req.auth.userId;
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: myId },
        { senderId: myId, receiverId: userId },
      ],
    })
    .populate('replyTo')
    .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

// New: Get unread counts grouped by sender for the current user
export const getUnreadCounts = async (req, res, next) => {
  try {
    const myId = req.auth.userId;

    const unread = await Message.aggregate([
      {
        $match: {
          receiverId: myId,
          read: false, // ONLY unread, don’t include {$exists:false}
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {};
    unread.forEach((item) => {
      result[item._id] = item.count;
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// New: Mark messages from otherUserId to me as read
export const markMessagesRead = async (req, res, next) => {
  try {
    const myId = req.auth.userId;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ message: "otherUserId is required" });
    }

    const result = await Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: myId,
        // Mark only unread (including docs where read field is missing)
        $or: [{ read: false }, { read: { $exists: false } }],
      },
      { $set: { read: true } }
    );

    res.status(200).json({ updated: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// LIKED SONGS — Local (MongoDB ObjectId) songs
// ============================================================================

// Like a local song
export const likeSong = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { songId } = req.params;

    // Validate that it's a valid ObjectId
    const mongoose = await import("mongoose");
    if (!mongoose.default.Types.ObjectId.isValid(songId)) {
      return res.status(400).json({ message: "Invalid song ID. Use /like-external for external songs." });
    }

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { $addToSet: { likedSongs: songId } },
      { new: true }
    ).populate("likedSongs");

    // Merge and return
    const merged = mergeLocalAndExternalLikedSongs(user);
    res.json(merged);
  } catch (err) {
    next(err);
  }
};

// Unlike a local song
export const unlikeSong = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { songId } = req.params;

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { $pull: { likedSongs: songId } },
      { new: true }
    ).populate("likedSongs");

    const merged = mergeLocalAndExternalLikedSongs(user);
    res.json(merged);
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// LIKED SONGS — External (JioSaavn, YouTube, etc.)
// ============================================================================

// Like an external song
export const likeExternalSong = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { externalId, source, title, artist, album, imageUrl, duration, language, year } = req.body;

    if (!externalId || !source || !title) {
      return res.status(400).json({ message: "externalId, source, and title are required" });
    }

    // Check if already liked
    const existingUser = await User.findOne({
      clerkId: userId,
      "likedExternalSongs.externalId": externalId,
    });

    if (existingUser) {
      // Already liked, return current state
      const populated = await User.findOne({ clerkId: userId }).populate("likedSongs");
      const merged = mergeLocalAndExternalLikedSongs(populated);
      return res.json(merged);
    }

    // Add to liked external songs
    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $push: {
          likedExternalSongs: {
            externalId,
            source,
            title,
            artist: artist || "",
            album: album || "",
            imageUrl: imageUrl || "",
            duration: duration || 0,
            language: language || "",
            year: year || "",
          },
        },
      },
      { new: true }
    ).populate("likedSongs");

    const merged = mergeLocalAndExternalLikedSongs(user);
    res.json(merged);
  } catch (err) {
    next(err);
  }
};

// Unlike an external song
export const unlikeExternalSong = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { externalId } = req.params;

    if (!externalId) {
      return res.status(400).json({ message: "externalId is required" });
    }

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { $pull: { likedExternalSongs: { externalId } } },
      { new: true }
    ).populate("likedSongs");

    const merged = mergeLocalAndExternalLikedSongs(user);
    res.json(merged);
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// GET ALL LIKED SONGS — Merged local + external
// ============================================================================

export const getLikedSongs = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId }).populate("likedSongs");

    if (!user) {
      return res.json([]);
    }

    const merged = mergeLocalAndExternalLikedSongs(user);
    res.json(merged);
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// HELPER — Merge local populated songs + external songs into one array
// ============================================================================

function mergeLocalAndExternalLikedSongs(user) {
  if (!user) return [];

  // Local songs (populated from Song collection)
  const localSongs = (user.likedSongs || [])
    .filter((s) => s && s._id) // filter out any null populated refs
    .map((s) => {
      const obj = s.toObject ? s.toObject() : s;
      return {
        ...obj,
        _id: obj._id.toString(),
        source: obj.source || "local",
        _likedType: "local",
      };
    });

  // External songs (embedded documents)
  const externalSongs = (user.likedExternalSongs || []).map((s) => {
    const obj = s.toObject ? s.toObject() : s;
    return {
      _id: obj.externalId, // Use externalId as _id for frontend compatibility
      externalId: obj.externalId,
      source: obj.source,
      title: obj.title,
      artist: obj.artist || "",
      album: obj.album || "",
      imageUrl: obj.imageUrl || "",
      duration: obj.duration || 0,
      language: obj.language || "",
      year: obj.year || "",
      audioUrl: null, // Will be resolved on frontend when playing
      streamUrl: null,
      _likedType: "external",
    };
  });

  // Merge: local first, then external
  return [...localSongs, ...externalSongs];
}