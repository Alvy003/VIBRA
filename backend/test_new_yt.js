import { searchYouTubeMusic, getYouTubeMusicRelated } from './src/services/youtube.service.js';

async function testNewService() {
    console.log('--- Testing New YouTube Music Service ---');
    try {
        const results = await searchYouTubeMusic('Brazilian Phonk', 3);
        console.log(`✅ Search successful. Found ${results.length} tracks.`);
        if (results.length > 0) {
            console.log('Sample Result:', JSON.stringify(results[0], null, 2));
            const related = await getYouTubeMusicRelated(results[0].videoId, 3);
            console.log(`✅ Related tracks successful. Found ${related.length} tracks.`);
            if (related.length > 0) {
                console.log('Sample Related:', JSON.stringify(related[0], null, 2));
            }
        }
    } catch (e) {
        console.log('❌ New Service Failed:', e.message);
    }
}

testNewService();
