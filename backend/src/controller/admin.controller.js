import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../lib/cloudinary.js";
import { clerkClient } from "@clerk/express";

// helper function for cloudinary uploads
const uploadToCloudinary = async (file) => {
	try {
		const result = await cloudinary.uploader.upload(file.tempFilePath, {
			resource_type: "auto",
		});
		return result.secure_url;
	} catch (error) {
		console.log("Error in uploadToCloudinary", error);
		throw new Error("Error uploading to cloudinary");
	}
};

export const createSong = async (req, res, next) => {
	try {
		if (!req.files || !req.files.audioFile || !req.files.imageFile) {
			return res.status(400).json({ message: "Please upload all files" });
		}

		const { title, artist, albumId, duration } = req.body;
		const audioFile = req.files.audioFile;
		const imageFile = req.files.imageFile;

		const audioUrl = await uploadToCloudinary(audioFile);
		const imageUrl = await uploadToCloudinary(imageFile);

		const song = new Song({
			title,
			artist,
			audioUrl,
			imageUrl,
			duration,
			albumId: albumId || null,
		});

		await song.save();

		// if song belongs to an album, update the album's songs array
		if (albumId) {
			await Album.findByIdAndUpdate(albumId, {
				$push: { songs: song._id },
			});
		}
		res.status(201).json(song);
	} catch (error) {
		console.log("Error in createSong", error);
		next(error);
	}
};

export const deleteSong = async (req, res, next) => {
	try {
		const { id } = req.params;

		const song = await Song.findById(id);

		// if song belongs to an album, update the album's songs array
		if (song.albumId) {
			await Album.findByIdAndUpdate(song.albumId, {
				$pull: { songs: song._id },
			});
		}

		await Song.findByIdAndDelete(id);

		res.status(200).json({ message: "Song deleted successfully" });
	} catch (error) {
		console.log("Error in deleteSong", error);
		next(error);
	}
};

export const createAlbum = async (req, res, next) => {
	try {
		const { title, artist, releaseYear } = req.body;
		const { imageFile } = req.files;

		const imageUrl = await uploadToCloudinary(imageFile);

		const album = new Album({
			title,
			artist,
			imageUrl,
			releaseYear,
		});

		await album.save();

		res.status(201).json(album);
	} catch (error) {
		console.log("Error in createAlbum", error);
		next(error);
	}
};
export const patchAlbumSongs = async (req, res) => {
	try {
	  const { id } = req.params;
	  const { op, songId, targetAlbumId } = req.body;
  
	  const album = await Album.findById(id);
	  if (!album) return res.status(404).json({ message: "Album not found" });
  
	  switch (op) {
		case "add":
		  await Album.findByIdAndUpdate(id, { $addToSet: { songs: songId } });
		  await Song.findByIdAndUpdate(songId, { albumId: id });
		  break;
  
		case "remove":
		  await Album.findByIdAndUpdate(id, { $pull: { songs: songId } });
		  await Song.findByIdAndUpdate(songId, { albumId: null });
		  break;
  
		case "move":
		  if (!targetAlbumId) {
			return res.status(400).json({ message: "targetAlbumId required for move" });
		  }
		  await Album.findByIdAndUpdate(id, { $pull: { songs: songId } });
		  await Album.findByIdAndUpdate(targetAlbumId, { $addToSet: { songs: songId } });
		  await Song.findByIdAndUpdate(songId, { albumId: targetAlbumId });
		  break;
	  }
  
	  const updatedAlbum = await Album.findById(id).populate("songs");
	  res.json(updatedAlbum);
	} catch (err) {
	  console.error("Error patching album songs:", err);
	  res.status(500).json({ message: "Error updating album songs" });
	}
  };

export const deleteAlbum = async (req, res, next) => {
	try {
		const { id } = req.params;
		await Song.deleteMany({ albumId: id });
		await Album.findByIdAndDelete(id);
		res.status(200).json({ message: "Album deleted successfully" });
	} catch (error) {
		console.log("Error in deleteAlbum", error);
		next(error);
	}
};

export const checkAdmin = async (req, res, next) => {
	try {
	  const userId = req.auth()?.userId;
	  if (!userId) {
		return res.status(401).json({ isAdmin: false, message: "Unauthorized" });
	  }
  
	  const currentUser = await clerkClient.users.getUser(userId);
  
	  const isAdmin =
		process.env.ADMIN_EMAIL === currentUser.primaryEmailAddress?.emailAddress;
  
	  return res.status(200).json({ isAdmin });
	} catch (error) {
	  console.error("Error in checkAdmin:", error);
	  next(error);
	}
  };