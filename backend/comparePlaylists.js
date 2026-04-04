import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/dev/personal/Vibra/backend/.env' });

async function compare() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const playlists = await mongoose.connection.collection('aiplaylists')
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    console.log(`Found ${playlists.length} total playlists.`);

    for (const p of playlists) {
        const firstTwo = p.tracks?.slice(0, 2) || [];
        const sources = firstTwo.map(t => t.source).join(', ');
        const hasUrl = firstTwo.map(t => !!t.streamUrl).join(', ');
        console.log(`- [${p.createdAt.toISOString().split('T')[0]}] Name: ${p.name.padEnd(25)} | Sources: ${sources.padEnd(20)} | URLs: ${hasUrl}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

compare();
