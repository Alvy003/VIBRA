import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: "playlists" }).toArray();
    if (collections.length > 0) {
      const indexes = await db.collection("playlists").indexes();
      console.log("Current indexes:", JSON.stringify(indexes, null, 2));
      if (indexes.some(idx => idx.name === "name_1")) {
        await db.collection("playlists").dropIndex("name_1");
        console.log("Dropped name_1 index");
      } else {
        console.log("No name_1 index found");
      }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
