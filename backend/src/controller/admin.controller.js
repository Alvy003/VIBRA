import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../lib/cloudinary.js";
import { clerkClient } from "@clerk/express";
import { buildAlbumPreviewImages } from "../utils/albumPreview.js";

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
		const album = await Album.findById(albumId).populate("songs", "imageUrl");
		if (album) {
			album.songs.push(song._id);
			album.previewImages = buildAlbumPreviewImages(album.songs);
			await album.save();
		}
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
		const album = await Album.findById(song.albumId).populate("songs", "imageUrl");
		if (album) {
			album.songs = album.songs.filter(
			(s) => s._id.toString() !== song._id.toString()
			);
			album.previewImages = buildAlbumPreviewImages(album.songs);
			await album.save();
		}
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
  
	  let imageUrl = null;
  
	  // Only upload if image exists
	  if (req.files && req.files.imageFile) {
		imageUrl = await uploadToCloudinary(req.files.imageFile);
	  }
  
	  const album = new Album({
		title,
		artist,
		releaseYear,
		imageUrl,
	  });
  
	  album.previewImages = buildAlbumPreviewImages(album.songs);
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
	  const { op, songId, targetAlbumId, songs } = req.body;
  
	  const album = await Album.findById(id);
	  if (!album) return res.status(404).json({ message: "Album not found" });
  
	  switch (op) {
		case "add":
		  // Add song to album
		  await Album.findByIdAndUpdate(id, { $addToSet: { songs: songId } });
		  await Song.findByIdAndUpdate(songId, { albumId: id });
		  break;
  
		case "remove":
		  // Remove song from album
		  await Album.findByIdAndUpdate(id, { $pull: { songs: songId } });
		  // Only clear albumId if this was the song's primary album
		  const song = await Song.findById(songId);
		  if (song && song.albumId?.toString() === id) {
			await Song.findByIdAndUpdate(songId, { albumId: null });
		  }
		  break;
  
		case "replace":
		  // Replace all songs in album
		  if (songs) {
			album.songs = songs;
			await album.save();
		  }
		  break;
  
		case "reorder":
		  // Reorder songs in album
		  if (songs) {
			album.songs = songs;
			await album.save();
		  }
		  break;
  
		case "move":
		  // Move song to another album
		  if (!targetAlbumId) {
			return res.status(400).json({ message: "targetAlbumId required for move" });
		  }
		  await Album.findByIdAndUpdate(id, { $pull: { songs: songId } });
		  await Album.findByIdAndUpdate(targetAlbumId, { $addToSet: { songs: songId } });
		  await Song.findByIdAndUpdate(songId, { albumId: targetAlbumId });
		  break;
  
		default:
		  return res.status(400).json({ message: "Invalid operation" });
	  }
  
	  const updatedAlbum = await Album.findById(id).populate("songs", "imageUrl");

	  updatedAlbum.previewImages = buildAlbumPreviewImages(updatedAlbum.songs);
	  await updatedAlbum.save();

	  if (op === "move" && targetAlbumId) {
		const targetAlbum = await Album.findById(targetAlbumId).populate("songs", "imageUrl");
		if (targetAlbum) {
		  targetAlbum.previewImages = buildAlbumPreviewImages(targetAlbum.songs);
		  await targetAlbum.save();
		}
	  }	  
	  
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

  export const updateSong = async (req, res, next) => {
	try {
	  const { id } = req.params;
	  const { title, artist, duration } = req.body;
  
	  const song = await Song.findById(id);
	  if (!song) {
		return res.status(404).json({ message: "Song not found" });
	  }
  
	  // Update fields if provided
	  if (title !== undefined) song.title = title;
	  if (artist !== undefined) song.artist = artist;
	  if (duration !== undefined) song.duration = duration;
  
	  await song.save();
  
	  res.status(200).json(song);
	} catch (error) {
	  console.error("Error in updateSong:", error);
	  next(error);
	}
  };
  
  // Change song's album (move/remove from album)
  export const changeSongAlbum = async (req, res, next) => {
	try {
	  const { id } = req.params;
	  const { albumId } = req.body;
  
	  const song = await Song.findById(id);
	  if (!song) {
		return res.status(404).json({ message: "Song not found" });
	  }
  
	  const oldAlbumId = song.albumId;
  
	  // Remove from old album
	  if (oldAlbumId) {
		const oldAlbum = await Album.findById(oldAlbumId).populate("songs", "imageUrl");
		if (oldAlbum) {
		  oldAlbum.songs = oldAlbum.songs.filter(
			(s) => s._id.toString() !== song._id.toString()
		  );
		  oldAlbum.previewImages = buildAlbumPreviewImages(oldAlbum.songs);
		  await oldAlbum.save();
		}
	  }
  
	  // Add to new album
	  if (albumId) {
		const newAlbum = await Album.findById(albumId).populate("songs", "imageUrl");
		if (!newAlbum) {
		  return res.status(404).json({ message: "Target album not found" });
		}
  
		newAlbum.songs.push(song._id);
		newAlbum.previewImages = buildAlbumPreviewImages(newAlbum.songs);
		await newAlbum.save();
	  }
  
	  song.albumId = albumId || null;
	  await song.save();
  
	  res.status(200).json({
		message: albumId ? "Song moved to album" : "Song removed from album",
		song,
	  });
	} catch (error) {
	  console.error("Error in changeSongAlbum:", error);
	  next(error);
	}
  };
  

  // Update album details
	export const updateAlbum = async (req, res, next) => {
		try {
		const { id } = req.params;
		const { title, artist, releaseYear, imageUrl, useMosaicCover } = req.body;
	
		const album = await Album.findById(id);
		if (!album) {
			return res.status(404).json({ message: "Album not found" });
		}
	
		if (title !== undefined) album.title = title;
		if (artist !== undefined) album.artist = artist;
		if (releaseYear !== undefined) album.releaseYear = releaseYear;
		if (imageUrl === null) {
			album.imageUrl = null;
			album.useMosaicCover = true; // auto fallback to mosaic
		}		  
		if (useMosaicCover !== undefined) {
			album.useMosaicCover = useMosaicCover;
		}
		await album.save();
	
		res.status(200).json(album);
		} catch (error) {
		console.error("Error in updateAlbum:", error);
		next(error);
		}
	};

		export const updateAlbumImage = async (req, res, next) => {
			try {
			const { id } = req.params;
		
			if (!req.files || !req.files.imageFile) {
				return res.status(400).json({ message: "Please upload an image file" });
			}
		
			const album = await Album.findById(id);
			if (!album) {
				return res.status(404).json({ message: "Album not found" });
			}
		
			const imageUrl = await uploadToCloudinary(req.files.imageFile);
			album.imageUrl = imageUrl;
			album.useMosaicCover = false; // 🔑 important UX rule
			await album.save();
		
			res.status(200).json(album);
			} catch (error) {
			next(error);
			}
		};


// Update song image
export const updateSongImage = async (req, res, next) => {
	try {
	  const { id } = req.params;
  
	  if (!req.files || !req.files.imageFile) {
		return res.status(400).json({ message: "Please upload an image file" });
	  }
  
	  const song = await Song.findById(id);
	  if (!song) {
		return res.status(404).json({ message: "Song not found" });
	  }
  
	  const imageFile = req.files.imageFile;
	  const imageUrl = await uploadToCloudinary(imageFile);
  
	  song.imageUrl = imageUrl;
	  await song.save();

	  if (song.albumId) {
		const album = await Album.findById(song.albumId).populate("songs", "imageUrl");
		if (album) {
		  album.previewImages = buildAlbumPreviewImages(album.songs);
		  await album.save();
		}
	  }
	  
  
	  res.status(200).json(song);
	} catch (error) {
	  console.error("Error in updateSongImage:", error);
	  next(error);
	}
  };
  
  // Update song audio
  export const updateSongAudio = async (req, res, next) => {
	try {
	  const { id } = req.params;
  
	  if (!req.files || !req.files.audioFile) {
		return res.status(400).json({ message: "Please upload an audio file" });
	  }
  
	  const song = await Song.findById(id);
	  if (!song) {
		return res.status(404).json({ message: "Song not found" });
	  }
  
	  const audioFile = req.files.audioFile;
	  const audioUrl = await uploadToCloudinary(audioFile);
  
	  song.audioUrl = audioUrl;
  
	  // Update duration if provided
	  const { duration } = req.body;
	  if (duration) {
		song.duration = parseInt(duration);
	  }
  
	  await song.save();
  
	  res.status(200).json(song);
	} catch (error) {
	  console.error("Error in updateSongAudio:", error);
	  next(error);
	}
  };