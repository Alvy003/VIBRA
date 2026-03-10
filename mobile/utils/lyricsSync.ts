// utils/lyricsSync.ts
import { LyricLine } from '@/lib/lyrics';

/**
 * Binary search to find active lyric index
 * Returns the index of the lyric that should be active at given time
 * Must be worklet-compatible
 */
export function findActiveLyricIndex(
  lines: LyricLine[],
  currentTime: number
): number {
  'worklet';
  
  if (!lines || lines.length === 0) return -1;
  if (currentTime < lines[0].time) return -1;
  if (currentTime >= lines[lines.length - 1].time) return lines.length - 1;

  let left = 0;
  let right = lines.length - 1;
  let result = 0;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (lines[mid].time <= currentTime) {
      result = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}