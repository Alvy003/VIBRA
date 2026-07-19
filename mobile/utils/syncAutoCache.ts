import { storage } from '@/lib/mmkvStorage';
import type { Track } from 'react-native-track-player';
import { Platform } from 'react-native';

// MMKV keys — must match VibraAutoService.kt companion object
const MMKV_KEY_QUEUE = 'auto_catalog_queue';

/**
 * Writes the current RNTP queue to MMKV so VibraAutoService can serve
 * it to Android Auto without crossing the JS bridge.
 *
 * Called from usePlayerStore whenever the queue or currentIndex changes.
 *
 * @param queue   The full queue from usePlayerStore
 */
export function syncAutoCache(queue: Track[]): void {
  if (Platform.OS !== 'android') return;
  if (!queue.length) {
    storage.delete(MMKV_KEY_QUEUE);
    return;
  }

  // mediaId = track unique ID.
  // VibraAutoService resolves this to queue index by matching ID.
  // console.log('[VibraAuto] JS Queue size:', queue.length);
  const items = queue.map((track) => ({
    mediaId: track.id,
    title:   track.title   || 'Unknown Title',
    artist:  track.artist  || 'Unknown Artist',
    artwork: track.artwork || '',
  }));

  const json = JSON.stringify(items);
  // console.log('[VibraAuto] MMKV JSON written:', json);
  storage.set(MMKV_KEY_QUEUE, json);
}
