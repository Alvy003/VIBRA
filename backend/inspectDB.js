import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/dev/personal/Vibra/backend/.env' });

async function inspect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const latest = await mongoose.connection.collection('aiplaylists')
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (latest.length > 0) {
      const playlist = latest[0];
      console.log('Playlist Name:', playlist.name);
      console.log('User ID:', playlist.userId);
      console.log('Track Count:', playlist.tracks?.length);
      
      if (playlist.tracks && playlist.tracks.length > 0) {
        const first = playlist.tracks[0];
        console.log('FIRST TRACK DETAILS:');
        console.log('Title:', first.title);
        console.log('Duration:', first.duration);
        console.log('External ID:', first.externalId);
        console.log('Stream URL:', first.streamUrl ? 'PRESENT' : 'MISSING');
        if (first.streamUrl) {
           console.log('Stream URL snippet:', first.streamUrl.substring(0, 50));
        }
      }
    } else {
      console.log('No playlists found');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

inspect();
