import dotenv from 'dotenv';
dotenv.config();
import { extractMusicIntent } from './src/services/groq.service.js';

async function testIntent() {
    console.log('--- Testing Improved Intent Extraction (with ENV) ---');
    const queries = [
        "brazilian phonk",
        "malayalam chill hits",
        "japanese lo-fi",
        "spanish reggaeton party",
        "trending phonk for gym"
    ];

    for (const q of queries) {
        try {
            const intent = await extractMusicIntent(q);
            console.log(`Query: "${q}"`);
            console.log(`  Language: ${intent.language}`);
            console.log(`  Sub-genre: ${intent.sub_genre}`);
            console.log(`  Mood: ${intent.mood}`);
            console.log('---');
        } catch (e) {
            console.log(`❌ Failed for "${q}":`, e.message);
        }
    }
}

testIntent();
