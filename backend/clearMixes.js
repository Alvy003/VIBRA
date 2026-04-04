import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/dev/personal/Vibra/backend/.env' });

const MONGO_URI = process.env.MONGODB_URI;

async function clear() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const userId = 'user_32ouilfqWpVQsMmCb53jJjLvV3g';
    const result = await mongoose.connection.collection('aiplaylists').deleteMany({ userId });
    console.log(`Deleted ${result.deletedCount} playlists for user ${userId}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

clear();
