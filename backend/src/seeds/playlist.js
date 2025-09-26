// seeds/playlist.js
import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Song } from "../models/song.model.js";
import { config } from "dotenv";

config();

const seedPlaylists = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Clear existing playlists
    await Playlist.deleteMany({});

    // Fetch some songs to attach to playlists
    const songs = await Song.find().limit(10); // get first 10 songs

    if (songs.length === 0) {
      console.log("⚠️ No songs found. Run song/album seed first.");
      return;
    }

    const playlists = [
      {
        name: "Chill Vibes",
        description: "Relax and unwind with these tracks",
        isFeatured: true,
        songs: songs.slice(0, 3).map((s) => s._id),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Party Mix",
        description: "Get the party started!",
        isFeatured: false,
        songs: songs.slice(3, 7).map((s) => s._id),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Late Night Drive",
        description: "Perfect tracks for a midnight cruise",
        isFeatured: false,
        songs: songs.slice(7, 10).map((s) => s._id),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await Playlist.insertMany(playlists);

    console.log("✅ Playlists seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding playlists:", error);
  } finally {
    mongoose.connection.close();
  }
};

seedPlaylists();
