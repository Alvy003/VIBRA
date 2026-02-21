import { Album } from "../models/album.model.js";
import { clerkClient } from "@clerk/express";

export const getAllAlbums = async (req, res, next) => {
  try {
    let showAll = false;

    if (req.query.includeInactive === "true") {
      // Verify the requester is actually admin before honoring this
      try {
        const userId = req.auth?.()?.userId;
        if (userId) {
          const user = await clerkClient.users.getUser(userId);
          if (process.env.ADMIN_EMAIL === user.primaryEmailAddress?.emailAddress) {
            showAll = true;
          }
        }
      } catch (e) {
        // ignore — not admin
      }
    }

    const filter = showAll ? {} : { isActive: { $ne: false } };
    const albums = await Album.find(filter);
    res.status(200).json(albums);
  } catch (error) {
    next(error);
  }
};

export const getAlbumById = async (req, res, next) => {
	try {
		const { albumId } = req.params;

		const album = await Album.findById(albumId).populate("songs");

		if (!album) {
			return res.status(404).json({ message: "Album not found" });
		}

		res.status(200).json(album);
	} catch (error) {
		next(error);
	}
};