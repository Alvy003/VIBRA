import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";

export const getAllUsers = async (req, res, next) => {
	try {
		const currentUserId = req.auth().userId;
		const users = await User.find({ clerkId: { $ne: currentUserId } });
		res.status(200).json(users);
	} catch (error) {
		next(error);
	}
};

export const getMessages = async (req, res, next) => {
	try {
		const myId = req.auth().userId;
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

// Like a song
export const likeSong = async (req, res, next) => {
	try {
		const userId = req.auth().userId; // Clerk adds this
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
		const userId = req.auth().userId;
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
		const userId = req.auth().userId;
		const user = await User.findOne({ clerkId: userId }).populate("likedSongs");
		res.json(user.likedSongs);
	} catch (err) {
		next(err);
	}
};