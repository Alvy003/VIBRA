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
    }).sort({ createdAt: 1 });

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

// Like a song
export const likeSong = async (req, res, next) => {
  try {
    const userId = req.auth.userId; // Clerk adds this
    const { songId } = req.params;

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { $addToSet: { likedSongs: songId } }, // no duplicates
      { new: true }
    ).populate("likedSongs");

    res.json(user.likedSongs);
  } catch (err) {
    next(err);
  }
};

// Unlike a song
export const unlikeSong = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { songId } = req.params;

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { $pull: { likedSongs: songId } },
      { new: true }
    ).populate("likedSongs");

    res.json(user.likedSongs);
  } catch (err) {
    next(err);
  }
};

// Get liked songs
export const getLikedSongs = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkId: userId }).populate("likedSongs");
    res.json(user.likedSongs);
  } catch (err) {
    next(err);
  }
};