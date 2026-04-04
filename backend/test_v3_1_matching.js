import { matchTrackOnJioSaavn } from './src/services/spotifyImport.service.js';
import { cleanMusicTitle } from './src/utils/cleaners.js';

async function testMatching() {
    const testCases = [
        {
            title: "Hridayathin Niramayi Lofi Malayalam Lofi Vijay Yesudas eternaL",
            artist: "eternaL",
            source: "youtube"
        },
        {
            title: "Thaniye Mizhikal Lofi Malayalam Lofi Guppy eternaL",
            artist: "eternaL",
            source: "youtube"
        },
        {
            title: "KadumKaapi Lofi Malayalam Lofi Parayathe Parayunna Nikhil Chandaran eternaL",
            artist: "eternaL",
            source: "youtube"
        }
    ];

    console.log("--- V3.1 Matching Verification ---");

    for (const test of testCases) {
        console.log(`\nTEST: "${test.title}" by "${test.artist}"`);
        const cleaned = cleanMusicTitle(test.title, test.source);
        console.log(`CLEANED: "${cleaned}"`);
        
        try {
            const result = await matchTrackOnJioSaavn(test.title, test.artist, test.source);
            if (result) {
                console.log(`✅ MATCHED: "${result.title}" by "${result.artist}" (Source: ${result.source})`);
            } else {
                console.log(`❌ FAILED: No match found`);
            }
        } catch (err) {
            console.error(`ERROR: ${err.message}`);
        }
    }
}

testMatching();
