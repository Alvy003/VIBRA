/**
 * buildPlayableTrack.ts
 *
 * Phase 2 — Canonical Track Builder
 *
 * This is the SINGLE authoritative function for constructing TrackPlayer-compatible
 * track objects in the Vibra mobile playback pipeline.
 *
 * Rules:
 *   - Every function that calls TrackPlayer.add() MUST use this builder.
 *   - No raw CDN URLs ever reach TrackPlayer. Only redirectors or local file:// paths.
 *   - Tracks that cannot produce a valid URL are rejected with a structured log.
 *   - DUMMY_URL is never a valid output from this builder.
 *
 * DUMMY_URL is intentionally retained ONLY in:
 *   - sanitizeTrackForPersistence() — for MMKV / Zustand serialization
 *   - initPlayer() queue restoration — as a transient placeholder before re-resolution
 *
 * It must NEVER reach TrackPlayer.add() or TrackPlayer.setQueue().
 */

import type { Track } from 'react-native-track-player';

export const DUMMY_URL = 'https://raw.githubusercontent.com/anars/blank-audio/master/1-second-of-silence.mp3';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';
const JIOSAAVN_REFERER = 'https://www.jiosaavn.com/';

// Prefix patterns to strip from all IDs before constructing redirector URLs
const ID_PREFIX_REGEX = /^(jiosaavn_track_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_|yt_|youtube_)/;

/**
 * Normalize a track ID to a clean string, stripping all known source prefixes.
 * Safe against numeric, null, and undefined inputs.
 */
export function normalizeTrackId(raw: any): string | null {
    if (raw === null || raw === undefined) return null;
    const str = String(raw).trim();
    if (!str || str === 'undefined' || str === 'null') return null;
    return str.replace(ID_PREFIX_REGEX, '');
}

/**
 * Normalize a source string to a canonical value the backend redirector accepts.
 */
export function normalizeSource(raw: any): string | null {
    if (!raw) return null;
    const s = String(raw).toLowerCase().trim();
    if (s === 'yt') return 'youtube';
    if (s === 'saavn') return 'jiosaavn';
    if (s === 'jiosaavn' || s === 'youtube' || s === 'local') return s;
    return null;
}

/**
 * Determine whether a URL string is "valid" — non-null, non-empty, not DUMMY_URL.
 * Does NOT verify the URL is reachable.
 */
export function isValidPlaybackUrl(url: any): url is string {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (trimmed === DUMMY_URL) return false;
    return true;
}

/**
 * Build the canonical redirector URL for a remote track.
 * Returns null if baseURL or id are unavailable.
 */
export function buildRedirectorUrl(
    baseURL: string | null | undefined,
    source: string,
    cleanId: string,
    bitrate?: string,
): string | null {
    if (!baseURL || baseURL.startsWith('undefined') || baseURL.startsWith('null')) return null;
    if (!source || !cleanId) return null;
    const base = `${baseURL}/stream/play/${source}/${cleanId}`;
    return bitrate ? `${base}?bitrate=${bitrate}` : base;
}

// ─────────────────────────────────────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────────────────────────────────────

export type BuildResult =
    | { ok: true; track: Track }
    | { ok: false; reason: string };

export interface BuildOptions {
    /** Pre-resolved base URL (axiosInstance.defaults.baseURL). Required for remote tracks. */
    baseURL: string | null | undefined;
    /** Bitrate to append to JioSaavn/YouTube redirector. Defaults to '320'. */
    bitrate?: string;
    /** Already-resolved download local URI (file://...) to prefer over everything else. */
    localUri?: string | null;
    /** Fallback index (for logging context only). */
    index?: number;
}

/**
 * buildPlayableTrack
 *
 * Takes a raw song object (from any source: backend response, persisted queue,
 * search results, autoplay recommendations, etc.) and returns either a fully
 * validated TrackPlayer-compatible track or a rejection descriptor.
 *
 * Priority for URL selection:
 *   1. Local downloaded file (file://)
 *   2. Stable redirector URL constructed from source + id
 *   3. Existing valid URL on the track object (if it is already a redirector)
 *
 * This function NEVER returns DUMMY_URL as a url value.
 */
export async function buildPlayableTrack(
    raw: any,
    opts: BuildOptions,
): Promise<BuildResult> {
    const { baseURL, bitrate = '320', localUri, index } = opts;

    // ─── 1. Extract and normalize identity fields ───────────────────────────
    const rawId = raw.externalId || raw.id || raw._id;
    const source = normalizeSource(raw.source);
    const cleanId = normalizeTrackId(rawId);
    const title = raw.title || 'Unknown Title';
    const artist = raw.artist || 'Unknown Artist';
    const artwork = raw.artwork || raw.imageUrl || undefined;
    const duration = raw.duration || undefined;
    const album = raw.album || raw.albumName || undefined;

    // Stable string ID for TrackPlayer (must never be numeric)
    const stableId = cleanId
        ? (source && source !== 'local' ? `${source}_${cleanId}` : cleanId)
        : (rawId ? String(rawId) : `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

    const logContext = `[Track] id=${stableId} title="${title}" source=${source ?? 'unknown'} index=${index ?? '?'}`;

    // ─── 2. Local file takes highest priority ───────────────────────────────
    if (localUri && localUri.startsWith('file://')) {
        return {
            ok: true,
            track: {
                id: stableId,
                url: localUri,
                title,
                artist,
                artwork,
                duration,
                album,
                source: 'local',
                headers: { 'User-Agent': MOBILE_UA },
            } as Track,
        };
    }

    // ─── 3. Local source — use existing url field ───────────────────────────
    if (source === 'local' || raw.url?.startsWith('file://')) {
        const localUrl = raw.url || raw.audioUrl || raw.streamUrl;
        if (isValidPlaybackUrl(localUrl)) {
            return {
                ok: true,
                track: {
                    id: stableId,
                    url: localUrl,
                    title,
                    artist,
                    artwork,
                    duration,
                    album,
                    source: 'local',
                    headers: { 'User-Agent': MOBILE_UA },
                } as Track,
            };
        }
        console.warn(`[buildPlayableTrack] Rejected — local track has no valid url. ${logContext}`);
        return { ok: false, reason: 'local-track-no-url' };
    }

    // ─── 4. Remote track — build stable redirector URL ──────────────────────
    if (source && cleanId) {
        const redirector = buildRedirectorUrl(baseURL, source, cleanId, source === 'jiosaavn' ? bitrate : undefined);
        if (redirector) {
            return {
                ok: true,
                track: {
                    id: stableId,
                    url: redirector,
                    title,
                    artist,
                    artwork,
                    duration,
                    album,
                    source,
                    headers: {
                        'User-Agent': MOBILE_UA,
                        'Referer': JIOSAAVN_REFERER,
                    },
                } as Track,
            };
        }
    }

    // ─── 5. Fallback — accept an existing valid non-CDN URL on the object ───
    // We permit /api/stream/play/ paths that arrived from the backend (Phase 1 guarantees these).
    // We reject raw CDN URLs (saavncdn.com) as they expire.
    const candidateUrl: string | undefined =
        raw.streamUrl || raw.audioUrl || raw.url;

    if (isValidPlaybackUrl(candidateUrl)) {
        const isCdn = typeof candidateUrl === 'string' && (
            candidateUrl.includes('saavncdn.com') ||
            candidateUrl.includes('aac.saavncdn.com')
        );
        if (isCdn) {
            console.warn(
                `[buildPlayableTrack] Rejected — expiring CDN URL not allowed in queue. ${logContext}`,
                { url: candidateUrl },
            );
            return { ok: false, reason: 'cdn-url-rejected' };
        }

        const resolvedSource = source || 'jiosaavn';
        return {
            ok: true,
            track: {
                id: stableId,
                url: candidateUrl,
                title,
                artist,
                artwork,
                duration,
                album,
                source: resolvedSource,
                headers: {
                    'User-Agent': MOBILE_UA,
                    'Referer': JIOSAAVN_REFERER,
                },
            } as Track,
        };
    }

    // ─── 6. No valid URL could be produced — reject ──────────────────────────
    console.warn(
        `[buildPlayableTrack] Rejected — no valid playback URL. ${logContext}`,
        JSON.stringify({
            id: rawId,
            source: raw.source,
            cleanId,
            streamUrl: raw.streamUrl,
            audioUrl: raw.audioUrl,
            url: raw.url,
            baseURLAvailable: !!(baseURL && !baseURL.startsWith('undefined')),
        }),
    );
    return { ok: false, reason: 'no-valid-url' };
}

/**
 * buildPlayableQueue
 *
 * Convenience wrapper that processes an array of raw song objects and returns
 * only the successfully built tracks plus a summary log.
 */
export async function buildPlayableQueue(
    raws: any[],
    opts: BuildOptions,
): Promise<Track[]> {
    const results = await Promise.all(
        raws.map((raw, i) => buildPlayableTrack(raw, { ...opts, index: i })),
    );

    const valid = results.filter((r): r is { ok: true; track: Track } => r.ok);
    const rejected = results.filter((r) => !r.ok);

    if (rejected.length > 0) {
        console.warn(`[buildPlayableQueue] ${valid.length}/${raws.length} tracks passed validation. ${rejected.length} rejected.`);
    }

    return valid.map((r) => r.track);
}
