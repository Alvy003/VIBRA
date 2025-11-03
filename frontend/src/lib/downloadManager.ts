// src/lib/downloadManager.ts
import { saveSongMeta, deleteSongMeta, getSongMeta } from "./downloads";

const AUDIO_CACHE = "vibra-audio-cache-v1";

// downloadSong(song) -> downloads audio and stores to Cache + metadata
export async function downloadSong(song: {
  _id: string;
  title: string;
  artist?: string;
  imageUrl?: string;
  audioUrl: string;
}) {
  const cache = await caches.open(AUDIO_CACHE);

  // First try to fetch audio
  const resp = await fetch(song.audioUrl, { credentials: "omit" });
  if (!resp.ok) throw new Error("Failed to fetch audio");

  // clone for caching
  const respClone = resp.clone();
  await cache.put(song.audioUrl, respClone);

  // attempt to estimate size
  const size = resp.headers.has("content-length")
    ? Number(resp.headers.get("content-length"))
    : undefined;

  const meta = {
    _id: song._id,
    title: song.title,
    artist: song.artist,
    imageUrl: song.imageUrl,
    audioUrl: song.audioUrl,
    cachedAt: Date.now(),
    sizeBytes: size,
  };

  await saveSongMeta(meta);
  return meta;
}

// remove downloaded song: delete from cache + idb
export async function removeDownloadedSong(songId: string) {
  const meta = await getSongMeta(songId);
  if (!meta) return;
  const cache = await caches.open(AUDIO_CACHE);
  await cache.delete(meta.audioUrl);
  await deleteSongMeta(songId);
}

// get blob URL for playback (returns null if not downloaded)
// Note: returns an object URL; caller should revoke when no longer needed.
export async function getOfflineAudioUrl(songId: string): Promise<string | null> {
  const meta = await getSongMeta(songId);
  if (!meta) return null;
  const cache = await caches.open(AUDIO_CACHE);
  const cachedResp = await cache.match(meta.audioUrl);
  if (!cachedResp) return null;
  const blob = await cachedResp.blob();
  const url = URL.createObjectURL(blob);
  return url;
}

// check whether a song is downloaded
export async function isSongDownloaded(songId: string): Promise<boolean> {
  const meta = await getSongMeta(songId);
  if (!meta) return false;
  const cache = await caches.open(AUDIO_CACHE);
  const match = await cache.match(meta.audioUrl);
  return !!match;
}
