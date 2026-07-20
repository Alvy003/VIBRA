import { Song } from "../models/song.model.js";
import { Playlist } from "../models/playlist.model.js";
import { getCache, setCache } from "../lib/cacheService.js";

export const getAllSongs = async (req, res, next) => {
	try {
		const songs = await Song.find().sort({ createdAt: -1 });
		res.json(songs);
	} catch (error) {
		next(error);
	}
};

export const getFeaturedSongs = async (req, res, next) => {
	try {
		const cacheKey = "vibra:songs:featured";
		let cached = null;
		try {
			cached = await getCache(cacheKey);
		} catch (err) {
			console.warn("[Cache Fallback] featured songs (Redis read error):", err.message);
		}
		if (cached) {
			return res.json(cached);
		}

		const songs = await Song.aggregate([
			{ $sample: { size: 8 } },
			{
				$project: {
					_id: 1,
					title: 1,
					artist: 1,
					imageUrl: 1,
					audioUrl: 1,
				},
			},
		]);

		try {
			await setCache(cacheKey, songs, 108000); // 30 hours Redis cache (30 * 3600 = 108,000s)
		} catch (err) {
			console.warn("[Cache Fallback] featured songs (Redis write error):", err.message);
		}
		res.json(songs);
	} catch (error) {
		next(error);
	}
};

export const getMadeForYouSongs = async (req, res, next) => {
	try {
		const songs = await Song.aggregate([
			{ $sample: { size: 8 } },
			{
				$project: {
					_id: 1,
					title: 1,
					artist: 1,
					imageUrl: 1,
					audioUrl: 1,
				},
			},
		]);
		res.json(songs);
	} catch (error) {
		next(error);
	}
};

export const getTrendingSongs = async (req, res, next) => {
	try {
		// Look for a playlist named "Trending"
		const trending = await Playlist.findOne({ name: "Trending" }).populate("songs");

		if (trending && trending.songs.length > 0) {
			// Return the curated playlist (limit to 10 songs for frontend)
			return res.json(trending.songs.slice(0, 8));
		}

		// Fallback: pick 4 random songs if no playlist exists
		const songs = await Song.aggregate([
			{ $sample: { size: 8 } },
			{
				$project: {
					_id: 1,
					title: 1,
					artist: 1,
					imageUrl: 1,
					audioUrl: 1,
				},
			},
		]);

		res.json(songs);
	} catch (error) {
		next(error);
	}
};

export const searchSongs = async (req, res, next) => {
	try {
	  const query = req.query.q;
	  if (!query) return res.json([]);
  
	  const songs = await Song.find({
		$or: [
		  { title: { $regex: query, $options: "i" } },
		  { artist: { $regex: query, $options: "i" } },
		],
	  }).select("_id title artist imageUrl audioUrl createdAt");
  
	  res.json(songs);
	} catch (error) {
	  next(error);
	}
};

export const getRandomSongs = async (req, res, next) => {
	try {
	  const limit = parseInt(req.query.limit) || 10;
	  const songs = await Song.aggregate([
		{ $sample: { size: limit } },
		{
		  $project: {
			_id: 1,
			title: 1,
			artist: 1,
			imageUrl: 1,
			audioUrl: 1,
		  },
		},
	  ]);
	  res.json(songs);
	} catch (error) {
	  next(error);
	}
  };
  