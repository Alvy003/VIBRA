import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { State } from 'react-native-track-player';
import * as Sentry from '@sentry/react-native';

const FS = FileSystem as any;

const { VibraWidget } = NativeModules;

// ─── Serialization ───────────────────────────────────────────────────────────
// All widget updates are chained onto this promise so no two native bridge
// calls run concurrently. This eliminates SharedPreferences interleave and
// the duplicate updateAll() coroutine race on the Kotlin side.
let pendingUpdate: Promise<void> = Promise.resolve();

// ─── Download deduplication ───────────────────────────────────────────────────
// Tracks in-flight artwork downloads keyed by remote URL. If a download for
// the same URL is already running, we reuse the existing promise instead of
// starting a second concurrent one.
const inFlightDownloads = new Map<string, Promise<string | null>>();

/**
 * Syncs the current playback state and metadata to the native Android Glance widget.
 * All calls are serialized — no two native updateWidget calls run concurrently.
 *
 * @param title Track title
 * @param artist Artist name
 * @param artworkUrl Network or local URL to artwork
 * @param isPlaying Playback state (true if active)
 */
export function syncWidget(
  title: string,
  artist: string,
  artworkUrl: string,
  isPlaying: boolean
): void {
  if (Platform.OS !== 'android') return;
  if (!VibraWidget) {
    console.warn('[widgetSync] VibraWidget native module not available.');
    return;
  }

  // Chain onto the previous update — never run two at once.
  pendingUpdate = pendingUpdate
    .then(() => _doSyncWidget(title, artist, artworkUrl, isPlaying))
    .catch(() => { /* swallow so the chain never breaks */ });
}

async function _doSyncWidget(
  title: string,
  artist: string,
  artworkUrl: string,
  isPlaying: boolean
): Promise<void> {
  try {
    let localPath = '';

    if (artworkUrl) {
      if (artworkUrl.startsWith('file://') || artworkUrl.startsWith('/')) {
        localPath = artworkUrl.replace('file://', '');
      } else {
        // Strip query params and build a stable cache filename.
        const cleanUrl = artworkUrl.split('?')[0];
        const ext = cleanUrl.endsWith('.png') ? 'png' : 'jpg';
        const safeUrlName = cleanUrl.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `widget_art_${safeUrlName.slice(-80)}.${ext}`;
        const localUri = `${FS.cacheDirectory}${filename}`;

        const fileInfo = await FileSystem.getInfoAsync(localUri);
        if (fileInfo.exists) {
          localPath = localUri.replace('file://', '');
        } else {
          // Phase 1 — send metadata immediately, keep previous artwork.
          VibraWidget.updateWidget(title, artist, 'KEEP', isPlaying);

          // Phase 2 — download artwork (deduplicated), then enqueue a
          // follow-up serialized update with the fresh values.
          let downloadPromise = inFlightDownloads.get(artworkUrl);
          if (!downloadPromise) {
            downloadPromise = FileSystem.downloadAsync(artworkUrl, localUri)
              .then((result) => result.uri.replace('file://', ''))
              .catch((err) => {
                Sentry.captureException(err);
                return null;
              })
              .finally(() => {
                inFlightDownloads.delete(artworkUrl);
              });
            inFlightDownloads.set(artworkUrl, downloadPromise);
          }

          downloadPromise.then((downloadedPath) => {
            if (!downloadedPath) return;
            try {
              // Read current track metadata fresh from the store — the download
              // may have taken 1-3 seconds and the active track or play state could have changed.
              const { usePlayerStore } = require('../stores/usePlayerStore');
              const latestState = usePlayerStore.getState();
              
              if (latestState.currentTrack?.artwork !== artworkUrl) {
                if (__DEV__) {
                  console.log('[widgetSync] Discarded stale artwork for:', title);
                }
                return;
              }
              
              const currentTitle = latestState.currentTrack?.title || 'Unknown Title';
              const currentArtist = latestState.currentTrack?.artist || 'Unknown Artist';
              const currentIsPlaying =
                latestState.isPlaying ||
                latestState.playbackState === State.Buffering ||
                latestState.playbackState === State.Loading;

              // Enqueue Phase 2 as another serialized update.
              pendingUpdate = pendingUpdate
                .then(() => VibraWidget.updateWidget(currentTitle, currentArtist, downloadedPath, currentIsPlaying))
                .catch(() => {});
            } catch (err) {
              Sentry.captureException(err);
            }
          });

          return; // Phase 1 already sent; Phase 2 enqueued above.
        }
      }
    }

    VibraWidget.updateWidget(title, artist, localPath, isPlaying);
  } catch (error) {
    Sentry.captureException(error);
  }
}
