import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../lib/cloudinary.js";
import { clerkClient } from "@clerk/express";
import { buildAlbumPreviewImages } from "../utils/albumPreview.js";
import {
  uploadAudio,
  uploadImage,
  deleteFile,
  isValidProvider,
  getDefaultProvider,
  CLOUD_PROVIDERS,
} from "../lib/cloudUploader.js";
import { resolveExternalSong } from "../utils/resolveExternalSong.js";

// ============================================================================
// LEGACY: Keep for album uploads (still using Cloudinary)
// ============================================================================
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

// ============================================================================
// SONGS
// ============================================================================

export const createSong = async (req, res, next) => {
	try {
	  if (!req.files || !req.files.audioFile || !req.files.imageFile) {
		return res.status(400).json({ message: "Please upload all files" });
	  }
  
	  // ADD genre, mood, language to destructuring
	  const { title, artist, albumId, duration, cloud, genre, mood, language } = req.body;
	  const audioFile = req.files.audioFile;
	  const imageFile = req.files.imageFile;
  
	  let provider = CLOUD_PROVIDERS.CLOUDINARY;
	  if (cloud && isValidProvider(cloud)) {
		provider = cloud;
	  } else {
		provider = getDefaultProvider();
	  }
  
	  const audioResult = await uploadAudio(audioFile, provider);
	  const imageResult = await uploadImage(imageFile, provider);
  
	  const song = new Song({
		title,
		artist,
		audioUrl: audioResult.url,
		imageUrl: imageResult.url,
		duration,
		albumId: albumId || null,
		cloudProvider: provider,
		// ADD these three
		genre: genre || null,
		mood: mood || null,
		language: language || null,
	  });
  
	  await song.save();
  
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
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    // If song belongs to an album, update the album's songs array
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

    // Delete files from the appropriate cloud provider
    // Auto-detects which cloud based on the URL
    await Promise.all([
      deleteFile(song.audioUrl),
      deleteFile(song.imageUrl),
    ]);

    await Song.findByIdAndDelete(id);

    res.status(200).json({ message: "Song deleted successfully" });
  } catch (error) {
    console.log("Error in deleteSong", error);
    next(error);
  }
};

// ============================================================================
// ALBUMS (Still using Cloudinary)
// ============================================================================

export const createAlbum = async (req, res, next) => {
  try {
    const { title, artist, releaseYear } = req.body;

    let imageUrl = null;

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
	  const { op, songId, songData, targetAlbumId, songs } = req.body;
  
	  const album = await Album.findById(id);
	  if (!album) return res.status(404).json({ message: "Album not found" });
  
	  switch (op) {
		case "add": {
		  const resolvedId = await resolveExternalSong(songId, songData || {});
		  await Album.findByIdAndUpdate(id, { $addToSet: { songs: resolvedId } });
		  await Song.findByIdAndUpdate(resolvedId, { albumId: id });
		  break;
		}
  
		case "remove": {
		  let removeId = songId;
		  if (!/^[0-9a-fA-F]{24}$/.test(songId)) {
			const externalSong = await Song.findOne({ externalId: songId });
			if (externalSong) removeId = externalSong._id.toString();
		  }
		  await Album.findByIdAndUpdate(id, { $pull: { songs: removeId } });
		  const song = await Song.findById(removeId);
		  if (song && song.albumId?.toString() === id) {
			await Song.findByIdAndUpdate(removeId, { albumId: null });
		  }
		  break;
		}
  
		case "replace":
		case "reorder": {
		  if (songs) {
			const resolvedIds = [];
			for (const sid of songs) {
			  resolvedIds.push(await resolveExternalSong(sid));
			}
			album.songs = resolvedIds;
			await album.save();
		  }
		  break;
		}
  
		case "move": {
		  if (!targetAlbumId) {
			return res.status(400).json({ message: "targetAlbumId required for move" });
		  }
		  let moveId = songId;
		  if (!/^[0-9a-fA-F]{24}$/.test(songId)) {
			const externalSong = await Song.findOne({ externalId: songId });
			if (externalSong) moveId = externalSong._id.toString();
		  }
		  await Album.findByIdAndUpdate(id, { $pull: { songs: moveId } });
		  await Album.findByIdAndUpdate(targetAlbumId, { $addToSet: { songs: moveId } });
		  await Song.findByIdAndUpdate(moveId, { albumId: targetAlbumId });
		  break;
		}
  
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

    // Delete all songs in the album and their cloud files
    const songsInAlbum = await Song.find({ albumId: id });

    for (const song of songsInAlbum) {
      await Promise.all([
        deleteFile(song.audioUrl),
        deleteFile(song.imageUrl),
      ]);
    }

    await Song.deleteMany({ albumId: id });
    await Album.findByIdAndDelete(id);

    res.status(200).json({ message: "Album deleted successfully" });
  } catch (error) {
    console.log("Error in deleteAlbum", error);
    next(error);
  }
};

// ============================================================================
// TRACK TAGS (Last.fm proxy)
// ============================================================================

export const getTrackTags = async (req, res) => {
	try {
	  const { title, artist } = req.query;
  
	  if (!title || !artist) {
		return res.json({ tags: [] });
	  }
  
	  const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
  
	  if (!LASTFM_API_KEY) {
		return res.json({ tags: [] });
	  }
  
	  let tags = [];
  
	  // Try track tags first
	  try {
		const trackRes = await fetch(
		  `https://ws.audioscrobbler.com/2.0/?method=track.getTopTags&artist=${encodeURIComponent(
			artist
		  )}&track=${encodeURIComponent(
			title
		  )}&api_key=${LASTFM_API_KEY}&format=json`
		);
  
		if (trackRes.ok) {
		  const data = await trackRes.json();
		  if (data.toptags?.tag?.length > 0) {
			tags = data.toptags.tag;
		  }
		}
	  } catch (e) {
		console.error("Track tags fetch failed:", e);
	  }
  
	  // Fallback: artist tags
	  if (tags.length === 0) {
		try {
		  const artistRes = await fetch(
			`https://ws.audioscrobbler.com/2.0/?method=artist.getTopTags&artist=${encodeURIComponent(
			  artist
			)}&api_key=${LASTFM_API_KEY}&format=json`
		  );
  
		  if (artistRes.ok) {
			const data = await artistRes.json();
			if (data.toptags?.tag?.length > 0) {
			  tags = data.toptags.tag;
			}
		  }
		} catch (e) {
		  console.error("Artist tags fetch failed:", e);
		}
	  }
  
	  res.json({
		tags: tags.slice(0, 20).map((t) => ({
		  name: t.name?.toLowerCase().trim() || "",
		  count: t.count || 0,
		})),
	  });
	} catch (error) {
	  console.error("Track tags error:", error);
	  res.json({ tags: [] });
	}
  };

// ============================================================================
// AUTH
// ============================================================================

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

// ============================================================================
// SONG UPDATES
// ============================================================================

export const updateSong = async (req, res, next) => {
	try {
	  const { id } = req.params;
	  const { title, artist, duration, genre, mood, language } = req.body;
  
	  const song = await Song.findById(id);
	  if (!song) {
		return res.status(404).json({ message: "Song not found" });
	  }
  
	  if (title !== undefined) song.title = title;
	  if (artist !== undefined) song.artist = artist;
	  if (duration !== undefined) song.duration = duration;
	  // Normalize empty string to null for cleaner data
	  if (genre !== undefined) song.genre = genre || null;
	  if (mood !== undefined) song.mood = mood || null;
	  if (language !== undefined) song.language = language || null;
  
	  await song.save();
	  res.status(200).json(song);
	} catch (error) {
	  console.error("Error in updateSong:", error);
	  next(error);
	}
  };

export const changeSongAlbum = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { albumId } = req.body;

    const song = await Song.findById(id);
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    const oldAlbumId = song.albumId;

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

// ============================================================================
// ALBUM UPDATES (Still Cloudinary)
// ============================================================================

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
      album.useMosaicCover = true;
    }
    if (useMosaicCover !== undefined) {
      album.useMosaicCover = useMosaicCover;
    }
	if (req.body.isActive !== undefined) album.isActive = req.body.isActive;
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
    album.useMosaicCover = false;
    await album.save();

    res.status(200).json(album);
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// SONG IMAGE/AUDIO UPDATES (Respects cloud provider)
// ============================================================================

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

    // Determine provider: use request override, song's existing provider, or default
    const cloud = req.body.cloud;
    let provider = song.cloudProvider || CLOUD_PROVIDERS.CLOUDINARY;
    if (cloud && isValidProvider(cloud)) {
      provider = cloud;
    }

    // Delete old image from its cloud
    await deleteFile(song.imageUrl);

    // Upload new image to the determined provider
    const imageResult = await uploadImage(req.files.imageFile, provider);

    song.imageUrl = imageResult.url;
    if (provider !== song.cloudProvider) {
      song.cloudProvider = provider;
    }
    await song.save();

    // Update album preview if needed
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

    const cloud = req.body.cloud;
    let provider = song.cloudProvider || CLOUD_PROVIDERS.CLOUDINARY;
    if (cloud && isValidProvider(cloud)) {
      provider = cloud;
    }

    // Delete old audio from its cloud
    await deleteFile(song.audioUrl);

    // Upload new audio
    const audioResult = await uploadAudio(req.files.audioFile, provider);

    song.audioUrl = audioResult.url;
    if (provider !== song.cloudProvider) {
      song.cloudProvider = provider;
    }

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

export const toggleAlbumActive = async (req, res, next) => {
	try {
	  const { id } = req.params;
	  const album = await Album.findById(id);
	  if (!album) return res.status(404).json({ message: "Not found" });
	  
	  album.isActive = !album.isActive;
	  await album.save();
	  
	  res.status(200).json(album);
	} catch (error) {
	  next(error);
	}
  };