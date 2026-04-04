/**
 * Cleans music metadata (titles/artists) by removing common "noise"
 * typically found in YouTube and social platform video titles.
 */
export function cleanMusicTitle(title, source = 'youtube') {
  if (!title) return '';

  let cleaned = title;

  // 1. Basic Cleaning (Applies to all)
  cleaned = cleaned.trim().replace(/\s+/g, ' ');

  // 2. Aggressive Cleaning for Noisy Sources (YouTube)
  if (source === 'youtube') {
    // Remove everything in parentheses that isn't essential
    cleaned = cleaned.replace(/\((?!feat|ft|with|prod\.)[^\)]+\)/gi, '');

    // Remove everything in brackets that isn't essential
    cleaned = cleaned.replace(/\[(?!feat|ft|with|prod\.)[^\]]+\]/gi, '');

    // Remove common noisy suffixes/keywords
    const noise = [
      ' - Topic',
      ' - Official Video',
      ' - Official Music Video',
      ' | Official Lyric Video',
      ' (Official Audio)',
      ' [Official Audio]',
      ' 4K',
      ' 8K',
      ' HD',
      ' UHD',
      ' High Quality',
      ' HQ',
      ' Visualizer',
      ' Visualiser',
      ' Full Song',
      ' Lyrical Video',
      ' Studio Version',
      ' Video Version',
      ' Explicit',
      ' Clean',
      ' Lofi',
      ' Lo-fi',
      ' Mashup',
      ' Remix',
      ' 8D',
      ' Bass Boosted',
      ' Slowed',
      ' Reverb',
      ' eternaL'
    ];

    noise.forEach(n => {
      const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use word boundaries for better accuracy
      cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '');
    });
    
    // Fallback for non-word boundary cases (like "8D")
    cleaned = cleaned.replace(/8D Audio/gi, '');
    cleaned = cleaned.replace(/Slowed Reverb/gi, '');
  } else {
    // Spotify/Clean source: Just remove basic technical noise if any
    cleaned = cleaned.replace(/\s*-\s*Remastered.*$/i, '');
    cleaned = cleaned.replace(/\s*-\s*Radio Edit.*$/i, '');
  }

  // 3. Special characters (All sources)
  cleaned = cleaned.replace(/\s*\|\s*/g, ' '); // Pipe characters
  cleaned = cleaned.replace(/\s*-\s*/g, ' - '); // Normalize hyphens

  // 4. Handle "Artist - Title" format (Only for non-Spotify sources like YouTube/Unknown)
  if (source !== 'spotify' && cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    if (parts.length === 2) {
       cleaned = parts[1];
    }
  }

  return cleaned.trim();
}

export function cleanArtistName(artist) {
  if (!artist) return 'Unknown Artist';
  
  let cleaned = artist;
  
  // Remove " - Topic" for automated YouTube Topic channels
  cleaned = cleaned.replace(/ - Topic$/i, '');
  
  // Remove common channel junk
  cleaned = cleaned.replace(/Official$/i, '');
  cleaned = cleaned.replace(/VEVO$/gi, '');
  
  return cleaned.trim();
}
