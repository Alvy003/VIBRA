import { cleanTitle } from './src/utils/cleanTitle.js';

const testCases = [
  "Pavizha Mazha (Official Video Song) | Athiran | Fahadh Faasil",
  "Aaradhike (From Ambili) [Lyrics]",
  "Song Name (Official Video) HD 4K",
  "Aaradhike - Sushin Shyam",
  "Brazilian Phonk (Bass Boosted) 8D Remix",
  "Uyiril Thodum (Official Music Video)",
  "Malayalam Chill Hits 2024 (HD)"
];

console.log("--- Testing CleanTitle Utility ---");
testCases.forEach(t => {
  console.log(`Original: ${t}`);
  console.log(`Cleaned : ${cleanTitle(t)}`);
  console.log("-" .repeat(20));
});
