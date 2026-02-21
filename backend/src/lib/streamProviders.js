// lib/streamProviders.js
import fetch from "node-fetch";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

// function proxyUrl(originalUrl) {
//   if (!originalUrl) return null;

//   if (
//     originalUrl.includes("saavncdn.com") ||
//     originalUrl.includes("jiosaavn.com") ||
//     originalUrl.includes("saavn.com")
//   ) {
//     return `/api/stream/proxy/audio?url=${encodeURIComponent(originalUrl)}`;
//   }

//   return originalUrl;
// }

function proxyUrl(originalUrl) {
    return originalUrl || null;
  }

// ============================================================================
// JIOSAAVN
// ============================================================================

async function jiosaavnFetch(url) {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.jiosaavn.com/",
        Origin: "https://www.jiosaavn.com",
      },
      timeout: 10000,
    });

    if (!res.ok) {
      // console.log(`[JioSaavn] API returned ${res.status}`);
      return null;
    }

    const text = await res.text();
    let cleanText = text.trim();
    if (cleanText.startsWith("(") || cleanText.startsWith(")")) {
      cleanText = cleanText.replace(/^\(/, "").replace(/\);?$/, "");
    }

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("[JioSaavn] Fetch error:", error.message);
    return null;
  }
}

async function getStreamUrl(encryptedMediaUrl) {
  if (!encryptedMediaUrl) {
    // console.log("[JioSaavn] No encrypted URL provided");
    return null;
  }

  try {
    const tokenUrl = `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&url=${encodeURIComponent(
      encryptedMediaUrl
    )}&bitrate=320&api_version=4&_format=json&ctx=web6dot0&_marker=0`;

    const data = await jiosaavnFetch(tokenUrl);
    let rawUrl = data?.auth_url || data?.url || null;

    if (rawUrl) {
      return proxyUrl(rawUrl);
    }

    for (const bitrate of ["160", "96", "48"]) {
      const fallbackUrl = `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&url=${encodeURIComponent(
        encryptedMediaUrl
      )}&bitrate=${bitrate}&api_version=4&_format=json&ctx=web6dot0&_marker=0`;

      const fallbackData = await jiosaavnFetch(fallbackUrl);
      rawUrl = fallbackData?.auth_url || fallbackData?.url || null;

      if (rawUrl) {
        // console.log(`[JioSaavn] ✅ Got stream URL at ${bitrate}kbps`);
        return proxyUrl(rawUrl);
      }
    }

    return null;
  } catch (error) {
    console.error("[JioSaavn] Stream URL error:", error.message);
    return null;
  }
}

function buildDirectUrl(encryptedUrl, songId) {
  if (!songId) return null;
  try {
    const cdnUrl = `https://aac.saavncdn.com/320/${songId}_320.mp4`;
    return proxyUrl(cdnUrl);
  } catch {
    return null;
  }
}

// ─── Helper to map a raw JioSaavn song object into our format ───
function mapJioSaavnSong(song) {
  try {
    const encryptedUrl =
      song.more_info?.encrypted_media_url || song.encrypted_media_url || "";

    return {
      externalId: `jiosaavn_${song.id}`,
      source: "jiosaavn",
      title: cleanHtml(song.title || song.song || ""),
      artist: cleanHtml(
        song.primary_artists ||
          song.more_info?.artistMap?.primary_artists
            ?.map((a) => a.name)
            .join(", ") ||
          song.artist ||
          ""
      ),
      album: cleanHtml(song.album || song.more_info?.album || ""),
      duration:
        parseInt(song.more_info?.duration || song.duration) || 0,
      imageUrl: fixImageQuality(song.image || ""),
      streamUrl: null,
      language: capitalizeFirst(
        song.language || song.more_info?.language || ""
      ),
      year: song.year || song.more_info?.year || "",
      hasLyrics: song.more_info?.has_lyrics === "true" || false,
      playCount: parseInt(song.play_count) || 0,
      _encUrl: encryptedUrl,
      _songId: song.id,
    };
  } catch (err) {
    console.error("[JioSaavn] Mapping error:", err.message);
    return null;
  }
}

// ─── Resolve stream URLs for an array of mapped songs ───
async function resolveStreamUrls(songs, maxResolve = 10) {
  const resolveCount = Math.min(songs.length, maxResolve);

  const resolved = await Promise.all(
    songs.slice(0, resolveCount).map(async (song) => {
      if (song._encUrl) {
        const streamUrl = await getStreamUrl(song._encUrl);
        if (streamUrl) {
          return { ...song, streamUrl, _encUrl: undefined };
        }
        const directUrl = buildDirectUrl(song._encUrl, song._songId);
        if (directUrl) {
          return { ...song, streamUrl: directUrl, _encUrl: undefined };
        }
      }
      return { ...song, _encUrl: undefined };
    })
  );

  const remaining = songs.slice(resolveCount).map((s) => ({
    ...s,
    _encUrl: undefined,
  }));

  return [...resolved, ...remaining];
}

export const jiosaavn = {
  // ──────────────────────────────────────────────
  // EXISTING: Search songs
  // ──────────────────────────────────────────────
  search: async (query, limit = 20) => {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${limit}&q=${encodeURIComponent(
        query
      )}`;

      // console.log("[JioSaavn] Searching songs...");
      const data = await jiosaavnFetch(url);
      if (!data) return [];

      const results = data.results || [];
      if (!Array.isArray(results) || results.length === 0) return [];

      const mapped = results.map(mapJioSaavnSong).filter(Boolean);
      const allResults = await resolveStreamUrls(mapped, 10);

      const withUrls = allResults.filter((s) => s.streamUrl).length;
      // console.log(
      //   `[JioSaavn] ${withUrls}/${allResults.length} songs have stream URLs`
      // );

      return allResults;
    } catch (error) {
      console.error("[JioSaavn] Search error:", error);
      return [];
    }
  },

  // ──────────────────────────────────────────────
  // EXISTING: Get song by ID
  // ──────────────────────────────────────────────
  getSong: async (id) => {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${id}`;
      const data = await jiosaavnFetch(url);
      if (!data) return null;

      const song = data.songs?.[0] || data[id] || null;
      if (!song) return null;

      const encryptedUrl =
        song.more_info?.encrypted_media_url ||
        song.encrypted_media_url ||
        "";
      let streamUrl = null;
      if (encryptedUrl) {
        streamUrl = await getStreamUrl(encryptedUrl);
      }

      return {
        externalId: `jiosaavn_${song.id}`,
        source: "jiosaavn",
        title: cleanHtml(song.title || song.song || ""),
        artist: cleanHtml(song.primary_artists || song.artist || ""),
        album: cleanHtml(song.album || ""),
        duration:
          parseInt(song.duration || song.more_info?.duration) || 0,
        imageUrl: fixImageQuality(song.image || ""),
        streamUrl,
        language: capitalizeFirst(song.language || ""),
        year: song.year || "",
      };
    } catch (error) {
      console.error("[JioSaavn] getSong error:", error);
      return null;
    }
  },

  // ──────────────────────────────────────────────
  // EXISTING: Search albums
  // ──────────────────────────────────────────────
  searchAlbums: async (query, limit = 10) => {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=search.getAlbumResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${limit}&q=${encodeURIComponent(
        query
      )}`;

      const data = await jiosaavnFetch(url);
      if (!data) return [];

      const results = data.results || [];
      return results.map((album) => ({
        externalId: `jiosaavn_album_${album.id}`,
        source: "jiosaavn",
        type: "album",
        title: cleanHtml(album.title || ""),
        artist: cleanHtml(album.artist || album.music || album.primary_artists || ""),
        imageUrl: fixImageQuality(album.image || ""),
        year: album.year || "",
        songCount: parseInt(album.song_count) || 0,
        language: capitalizeFirst(album.language || ""),
        _id: album.id, // raw JioSaavn ID for fetching details
      }));
    } catch (error) {
      console.error("[JioSaavn] Album search error:", error);
      return [];
    }
  },

  // ──────────────────────────────────────────────
  // EXISTING: Get album details
  // ──────────────────────────────────────────────
  getAlbum: async (id) => {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=content.getAlbumDetails&_format=json&cc=in&_marker=0%3F_marker%3D0&albumid=${id}`;

      const data = await jiosaavnFetch(url);
      if (!data) return null;

      const rawSongs = data.songs || data.list || [];
      const mapped = rawSongs.map(mapJioSaavnSong).filter(Boolean);
      const songs = await resolveStreamUrls(mapped, mapped.length); // resolve all for album

      return {
        externalId: `jiosaavn_album_${data.id || id}`,
        source: "jiosaavn",
        type: "album",
        title: cleanHtml(data.title || data.name || ""),
        artist: cleanHtml(data.primary_artists || data.artist || ""),
        imageUrl: fixImageQuality(data.image || ""),
        year: data.year || "",
        songCount: data.song_count || songs.length,
        language: capitalizeFirst(data.language || ""),
        songs,
      };
    } catch (error) {
      console.error("[JioSaavn] getAlbum error:", error);
      return null;
    }
  },

  // ──────────────────────────────────────────────
  // NEW: Search playlists
  // ──────────────────────────────────────────────
  searchPlaylists: async (query, limit = 10) => {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=search.getPlaylistResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${limit}&q=${encodeURIComponent(
        query
      )}`;

      // console.log("[JioSaavn] Searching playlists...");
      const data = await jiosaavnFetch(url);
      if (!data) return [];

      const results = data.results || [];
      return results.map((pl) => ({
        externalId: `jiosaavn_playlist_${pl.id}`,
        source: "jiosaavn",
        type: "playlist",
        title: cleanHtml(pl.title || pl.listname || ""),
        description: cleanHtml(pl.description || pl.subtitle || ""),
        imageUrl: fixImageQuality(pl.image || ""),
        songCount: parseInt(pl.song_count || pl.count) || 0,
        followerCount: parseInt(pl.follower_count) || 0,
        language: capitalizeFirst(pl.language || ""),
        _id: pl.id,
      }));
    } catch (error) {
      console.error("[JioSaavn] Playlist search error:", error);
      return [];
    }
  },

  // ──────────────────────────────────────────────
  // NEW: Get playlist details with songs
  // ──────────────────────────────────────────────
  getPlaylist: async (id) => {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=playlist.getDetails&_format=json&cc=in&_marker=0%3F_marker%3D0&listid=${id}`;

      // console.log("[JioSaavn] Getting playlist:", id);
      const data = await jiosaavnFetch(url);
      if (!data) return null;

      const rawSongs = data.songs || data.list || [];
      const mapped = rawSongs.map(mapJioSaavnSong).filter(Boolean);
      const songs = await resolveStreamUrls(mapped, mapped.length);

      return {
        externalId: `jiosaavn_playlist_${data.id || data.listid || id}`,
        source: "jiosaavn",
        type: "playlist",
        title: cleanHtml(data.title || data.listname || ""),
        description: cleanHtml(
          data.description || data.subtitle || data.header_desc || ""
        ),
        imageUrl: fixImageQuality(data.image || data.perma_url || ""),
        songCount: parseInt(data.song_count || data.count) || songs.length,
        followerCount: parseInt(data.follower_count || data.fan_count) || 0,
        language: capitalizeFirst(data.language || ""),
        songs,
      };
    } catch (error) {
      console.error("[JioSaavn] getPlaylist error:", error);
      return null;
    }
  },

  // ──────────────────────────────────────────────
  // NEW: Search artists
  // ──────────────────────────────────────────────
  searchArtists: async (query, limit = 10) => {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=search.getArtistResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${limit}&q=${encodeURIComponent(
        query
      )}`;

      // console.log("[JioSaavn] Searching artists...");
      const data = await jiosaavnFetch(url);
      if (!data) return [];

      const results = data.results || [];
      return results.map((artist) => ({
        externalId: `jiosaavn_artist_${artist.id}`,
        source: "jiosaavn",
        type: "artist",
        name: cleanHtml(artist.name || artist.title || ""),
        imageUrl: fixImageQuality(artist.image || ""),
        followerCount: parseInt(artist.follower_count) || 0,
        isVerified: artist.isVerified === "true" || artist.is_verified === "true",
        description: cleanHtml(artist.description || artist.subtitle || ""),
        _id: artist.id,
      }));
    } catch (error) {
      console.error("[JioSaavn] Artist search error:", error);
      return [];
    }
  },

  // ──────────────────────────────────────────────
  // NEW: Get artist details + top songs
  // ──────────────────────────────────────────────
  getArtist: async (id) => {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=artist.getArtistPageDetails&artistId=${id}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n_song=50&n_album=20`;

      // console.log("[JioSaavn] Getting artist:", id);
      const data = await jiosaavnFetch(url);
      if (!data) return null;

      // Top songs
      const rawSongs = data.topSongs || [];
      const mappedSongs = rawSongs.map(mapJioSaavnSong).filter(Boolean);
      const topSongs = await resolveStreamUrls(mappedSongs, 15);

      // Top albums
      const rawAlbums = data.topAlbums || [];
      const topAlbums = rawAlbums.map((album) => ({
        externalId: `jiosaavn_album_${album.id}`,
        source: "jiosaavn",
        type: "album",
        title: cleanHtml(album.title || album.name || ""),
        artist: cleanHtml(album.artist || album.music || ""),
        imageUrl: fixImageQuality(album.image || ""),
        year: album.year || "",
        songCount: parseInt(album.song_count) || 0,
        _id: album.id,
      }));

      return {
        externalId: `jiosaavn_artist_${data.artistId || id}`,
        source: "jiosaavn",
        type: "artist",
        name: cleanHtml(data.name || ""),
        imageUrl: fixImageQuality(data.image || ""),
        followerCount: parseInt(data.follower_count || data.fan_count) || 0,
        isVerified: data.isVerified === "true",
        bio: cleanHtml(data.bio?.[0]?.text || data.subtitle || ""),
        topSongs,
        topAlbums,
      };
    } catch (error) {
      console.error("[JioSaavn] getArtist error:", error);
      return null;
    }
  },

  // ──────────────────────────────────────────────
  // NEW: Get song recommendations (FIXED)
  // ──────────────────────────────────────────────
  getRecommendations: async (songId, limit = 20, languages = "hindi,english") => {
    try {
      // console.log("[JioSaavn] Getting recommendations for song:", songId);

      let songs = [];

      // ─── Method 1: reco.getreco ───
      try {
        // Get language preferences from a parameter or default
        const langPref = (() => {
          try {
            // Try to read from environment or use sensible default
            return "hindi,english";
          } catch { return "hindi,english"; }
        })();

        const recoUrl = `https://www.jiosaavn.com/api.php?__call=reco.getreco&api_version=4&_format=json&_marker=0&ctx=web6dot0&pid=${songId}&language=${langPref}`;
        const recoData = await jiosaavnFetch(recoUrl);

        if (recoData) {
          if (Array.isArray(recoData)) {
            songs = recoData.filter((item) => item && item.id);
          } else if (typeof recoData === "object") {
            // Could be keyed by song ID
            songs = Object.values(recoData).filter(
              (item) => item && typeof item === "object" && item.id && item.title
            );
          }
        }

        if (songs.length > 0) {
          // console.log(`[JioSaavn] ✅ reco.getreco returned ${songs.length} songs`);
        }
      } catch (err) {
        // console.log("[JioSaavn] reco.getreco failed:", err.message);
      }

      // ─── Method 2: Station/Radio (if method 1 failed) ───
      if (songs.length === 0) {
        try {
          // console.log("[JioSaavn] Trying station method...");

          // Create station from song
          const createUrl = `https://www.jiosaavn.com/api.php?__call=webradio.createEntityStation&api_version=4&_format=json&_marker=0&ctx=web6dot0&entity_id=[%22${songId}%22]&entity_type=queue`;
          const stationData = await jiosaavnFetch(createUrl);

          const stationId = stationData?.stationid || stationData?.station_id;

          if (stationId) {
            // console.log("[JioSaavn] Got station ID:", stationId);

            // Get songs from station
            const songsUrl = `https://www.jiosaavn.com/api.php?__call=webradio.getSong&api_version=4&_format=json&_marker=0&ctx=web6dot0&stationid=${encodeURIComponent(stationId)}&k=${limit}`;
            const songsData = await jiosaavnFetch(songsUrl);

            if (songsData) {
              if (Array.isArray(songsData)) {
                songs = songsData.filter((item) => item && item.id);
              } else if (typeof songsData === "object") {
                songs = Object.values(songsData).filter(
                  (item) =>
                    item && typeof item === "object" && item.id && (item.title || item.song)
                );
              }
            }

            if (songs.length > 0) {
              // console.log(`[JioSaavn] ✅ Station returned ${songs.length} songs`);
            }
          }
        } catch (err) {
          // console.log("[JioSaavn] Station method failed:", err.message);
        }
      }

      // ─── Method 3: Search by same artist (last resort) ───
      if (songs.length === 0) {
        try {
          // console.log("[JioSaavn] Falling back to artist-based search...");

          // First get the song details to know the artist
          const songDetails = await jiosaavn.getSong(songId);
          if (songDetails?.artist) {
            const artistQuery = songDetails.artist.split(",")[0].trim();
            // console.log(`[JioSaavn] Searching songs by artist: "${artistQuery}"`);

            const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${limit}&q=${encodeURIComponent(artistQuery)}`;
            const searchData = await jiosaavnFetch(searchUrl);

            if (searchData?.results && Array.isArray(searchData.results)) {
              // Filter out the current song
              songs = searchData.results.filter(
                (item) => item && item.id && item.id !== songId
              );
              if (songs.length > 0) {
                // console.log(`[JioSaavn] ✅ Artist search returned ${songs.length} songs`);
              }
            }
          }
        } catch (err) {
          // console.log("[JioSaavn] Artist search fallback failed:", err.message);
        }
      }

      if (songs.length === 0) {
        // console.log("[JioSaavn] ❌ All recommendation methods failed");
        return [];
      }

      // Map and resolve
      const mapped = songs.slice(0, limit).map(mapJioSaavnSong).filter(Boolean);
      const resolved = await resolveStreamUrls(mapped, Math.min(mapped.length, 15));

      const withUrls = resolved.filter((s) => s.streamUrl).length;
      // console.log(`[JioSaavn] Recommendations: ${resolved.length} total, ${withUrls} with URLs`);

      return resolved;
    } catch (error) {
      // console.error("[JioSaavn] Recommendations error:", error);
      return [];
    }
  },

  // ──────────────────────────────────────────────
  // NEW: Get homepage/launch data
  // ──────────────────────────────────────────────
  getHomepage: async (languages = "hindi,english") => {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=web6dot0&__languages=${encodeURIComponent(languages)}`;

      // console.log("[JioSaavn] Getting homepage data for languages:", languages);
      const data = await jiosaavnFetch(url);
      if (!data) return null;

      // New albums
      const newAlbums = (data.new_albums || []).map((album) => ({
        externalId: `jiosaavn_album_${album.id}`,
        source: "jiosaavn",
        type: "album",
        title: cleanHtml(album.title || album.name || ""),
        artist: cleanHtml(
          album.artist || album.music || album.subtitle || ""
        ),
        imageUrl: fixImageQuality(album.image || ""),
        year: album.year || "",
        songCount: parseInt(album.song_count) || 0,
        language: capitalizeFirst(album.language || ""),
        _id: album.id,
      }));

      // Top playlists / featured
      const topPlaylists = (
        data.top_playlists ||
        data.featured_playlists ||
        []
      ).map((pl) => ({
        externalId: `jiosaavn_playlist_${pl.id || pl.listid}`,
        source: "jiosaavn",
        type: "playlist",
        title: cleanHtml(pl.title || pl.listname || ""),
        description: cleanHtml(pl.subtitle || pl.description || ""),
        imageUrl: fixImageQuality(pl.image || ""),
        songCount: parseInt(pl.song_count || pl.count) || 0,
        followerCount: parseInt(pl.follower_count) || 0,
        _id: pl.id || pl.listid,
      }));

      // Charts
      const charts = (data.charts || []).map((chart) => ({
        externalId: `jiosaavn_playlist_${chart.id || chart.listid}`,
        source: "jiosaavn",
        type: "chart",
        title: cleanHtml(chart.title || chart.listname || ""),
        description: cleanHtml(chart.subtitle || ""),
        imageUrl: fixImageQuality(chart.image || ""),
        songCount: parseInt(chart.count) || 0,
        _id: chart.id || chart.listid,
      }));

      // Trending (can be songs or albums)
      const trending = (data.new_trending || data.trending || []).map(
        (item) => {
          if (item.type === "song") {
            return {
              ...mapJioSaavnSong(item),
              _encUrl: undefined,
            };
          }
          return {
            externalId: `jiosaavn_${item.type || "item"}_${item.id}`,
            source: "jiosaavn",
            type: item.type || "unknown",
            title: cleanHtml(item.title || item.name || ""),
            artist: cleanHtml(
              item.artist || item.subtitle || item.primary_artists || ""
            ),
            imageUrl: fixImageQuality(item.image || ""),
            _id: item.id,
          };
        }
      );

      // console.log(
      //   `[JioSaavn] Homepage: ${newAlbums.length} albums, ${topPlaylists.length} playlists, ${charts.length} charts`
      // );

      return {
        newAlbums,
        topPlaylists,
        charts,
        trending,
      };
    } catch (error) {
      console.error("[JioSaavn] Homepage error:", error);
      return null;
    }
  },

  // ──────────────────────────────────────────────
// NEW: Search-based homepage for accurate language results
// ──────────────────────────────────────────────
getHomepageBySearch: async (languages = "hindi,english") => {
  try {
    const langList = languages.split(",").map(l => l.trim()).filter(Boolean);
    // console.log("[JioSaavn] Building homepage via search for:", langList.join(", "));

    // Build search queries per language
    const albumQueries = langList.map(lang => `${lang} new songs 2025`);
    const playlistQueries = langList.map(lang => `${lang} top playlist`);
    const trendingQueries = langList.map(lang => `${lang} trending`);

    // Run all searches in parallel (batch per category)
    const [albumResults, playlistResults, trendingResults, chartsData] = await Promise.allSettled([
      // Albums: search for each language
      Promise.allSettled(
        albumQueries.map(q => jiosaavn.searchAlbums(q, 8))
      ).then(results =>
        results
          .filter(r => r.status === "fulfilled")
          .flatMap(r => r.value)
      ),

      // Playlists: search for each language
      Promise.allSettled(
        playlistQueries.map(q => jiosaavn.searchPlaylists(q, 8))
      ).then(results =>
        results
          .filter(r => r.status === "fulfilled")
          .flatMap(r => r.value)
      ),

      // Trending songs: search for each language
      Promise.allSettled(
        trendingQueries.map(q => jiosaavn.search(q, 6))
      ).then(results =>
        results
          .filter(r => r.status === "fulfilled")
          .flatMap(r => r.value)
      ),

      // Charts: still use getLaunchData since charts are language-agnostic
      (async () => {
        try {
          const url = `https://www.jiosaavn.com/api.php?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=web6dot0&__languages=${encodeURIComponent(languages)}`;
          const data = await jiosaavnFetch(url);
          if (!data?.charts) return [];
          return data.charts.map(chart => ({
            externalId: `jiosaavn_playlist_${chart.id || chart.listid}`,
            source: "jiosaavn",
            type: "chart",
            title: cleanHtml(chart.title || chart.listname || ""),
            description: cleanHtml(chart.subtitle || ""),
            imageUrl: fixImageQuality(chart.image || ""),
            songCount: parseInt(chart.count) || 0,
            _id: chart.id || chart.listid,
          }));
        } catch {
          return [];
        }
      })(),
    ]);

    const rawAlbums = albumResults.status === "fulfilled" ? albumResults.value : [];
    const rawPlaylists = playlistResults.status === "fulfilled" ? playlistResults.value : [];
    const rawTrending = trendingResults.status === "fulfilled" ? trendingResults.value : [];
    const charts = chartsData.status === "fulfilled" ? chartsData.value : [];

    // Deduplicate albums by title+artist
    const seenAlbums = new Set();
    const newAlbums = rawAlbums.filter(album => {
      const key = `${(album.title || "").toLowerCase()}_${(album.artist || "").toLowerCase()}`;
      if (seenAlbums.has(key)) return false;
      seenAlbums.add(key);
      return true;
    });

    // Deduplicate playlists by title
    const seenPlaylists = new Set();
    const topPlaylists = rawPlaylists.filter(pl => {
      const key = (pl.title || "").toLowerCase();
      if (seenPlaylists.has(key)) return false;
      seenPlaylists.add(key);
      return true;
    });

    // Deduplicate trending songs
    const seenTrending = new Set();
    const trending = rawTrending.filter(item => {
      const key = `${(item.title || "").toLowerCase()}_${(item.artist || "").toLowerCase()}`;
      if (seenTrending.has(key)) return false;
      seenTrending.add(key);
      return true;
    }).map(item => ({ ...item, _encUrl: undefined }));

    // console.log(
    //   `[JioSaavn] Search-based homepage: ${newAlbums.length} albums, ${topPlaylists.length} playlists, ${charts.length} charts, ${trending.length} trending`
    // );

    return {
      newAlbums: newAlbums.slice(0, 20),
      topPlaylists: topPlaylists.slice(0, 15),
      charts: charts.slice(0, 10),
      trending: trending.slice(0, 15),
    };
  } catch (error) {
    console.error("[JioSaavn] Search-based homepage error:", error);
    return null;
  }
},

  // ──────────────────────────────────────────────
  // NEW: Autocomplete suggestions
  // ──────────────────────────────────────────────
  autocomplete: async (query) => {
    try {
      const url = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&ctx=web6dot0&query=${encodeURIComponent(
        query
      )}`;

      const data = await jiosaavnFetch(url);
      if (!data) return [];

      // Returns categorized suggestions
      const suggestions = [];

      if (data.songs?.data) {
        data.songs.data.forEach((s) => {
          suggestions.push({
            type: "song",
            title: cleanHtml(s.title || ""),
            artist: cleanHtml(s.description || s.more_info?.primary_artists || ""),
            imageUrl: fixImageQuality(s.image || ""),
            id: s.id,
          });
        });
      }

      if (data.albums?.data) {
        data.albums.data.forEach((a) => {
          suggestions.push({
            type: "album",
            title: cleanHtml(a.title || ""),
            artist: cleanHtml(a.description || a.artist || ""),
            imageUrl: fixImageQuality(a.image || ""),
            id: a.id,
          });
        });
      }

      if (data.artists?.data) {
        data.artists.data.forEach((ar) => {
          suggestions.push({
            type: "artist",
            title: cleanHtml(ar.title || ar.name || ""),
            artist: cleanHtml(ar.description || ""),
            imageUrl: fixImageQuality(ar.image || ""),
            id: ar.id,
          });
        });
      }

      if (data.playlists?.data) {
        data.playlists.data.forEach((pl) => {
          suggestions.push({
            type: "playlist",
            title: cleanHtml(pl.title || ""),
            artist: cleanHtml(pl.description || ""),
            imageUrl: fixImageQuality(pl.image || ""),
            id: pl.id,
          });
        });
      }

      return suggestions;
    } catch (error) {
      console.error("[JioSaavn] Autocomplete error:", error);
      return [];
    }
  },
};

// ============================================================================
// YOUTUBE - Using Invidious API (UNCHANGED)
// ============================================================================

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://vid.puffyan.us",
  "https://invidious.io.lol",
  "https://yt.cdaut.de",
  "https://invidious.protokolla.fi",
];

let currentInvidiousIdx = 0;

const invidiousFetch = async (path) => {
  for (let i = 0; i < INVIDIOUS_INSTANCES.length; i++) {
    const base =
      INVIDIOUS_INSTANCES[
        (currentInvidiousIdx + i) % INVIDIOUS_INSTANCES.length
      ];
    const url = `${base}${path}`;

    try {
      // console.log(`[YouTube] Trying: ${base}`);

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 12000,
      });

      if (!res.ok) {
        // console.log(`[YouTube] ${base} returned ${res.status}`);
        continue;
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("html")) {
        continue;
      }

      const text = await res.text();
      if (
        text.startsWith("<!") ||
        text.startsWith("<html") ||
        text.startsWith("<HTML")
      ) {
        continue;
      }

      const data = JSON.parse(text);
      currentInvidiousIdx =
        (currentInvidiousIdx + i) % INVIDIOUS_INSTANCES.length;
      return data;
    } catch (err) {
      console.error(`[YouTube] ❌ ${base} failed:`, err.message);
    }
  }

  console.error("[YouTube] All instances failed");
  return null;
};

export const youtube = {
  search: async (query, limit = 20) => {
    try {
      const data = await invidiousFetch(
        `/api/v1/search?q=${encodeURIComponent(
          query
        )}&type=video&sort_by=relevance&page=1`
      );

      if (!data || !Array.isArray(data)) return [];

      const results = data
        .filter((item) => item.type === "video")
        .slice(0, limit)
        .map((item) => {
          let artist = item.author || "";
          artist = artist.replace(/ - Topic$/, "").trim();

          let title = item.title || "";
          if (title.includes(" - ")) {
            const parts = title.split(" - ");
            if (parts.length === 2) {
              if (
                parts[0].trim().toLowerCase() === artist.toLowerCase() ||
                !artist
              ) {
                artist = parts[0].trim();
                title = parts[1].trim();
              }
            }
          }

          title = title
            .replace(/\s*\(Official\s*(Music\s*)?Video\)\s*/gi, "")
            .replace(/\s*\[Official\s*(Music\s*)?Video\]\s*/gi, "")
            .replace(/\s*\(Official\s*Audio\)\s*/gi, "")
            .replace(/\s*\[Official\s*Audio\]\s*/gi, "")
            .replace(/\s*\(Lyrics?\s*(Video)?\)\s*/gi, "")
            .replace(/\s*\[Lyrics?\s*(Video)?\]\s*/gi, "")
            .replace(/\s*\(Audio\)\s*/gi, "")
            .replace(/\s*\|.*$/g, "")
            .replace(/\s*\/\/.*$/g, "")
            .trim();

          const thumbnail =
            item.videoThumbnails?.find((t) => t.quality === "medium")?.url ||
            item.videoThumbnails?.[0]?.url ||
            "";

          return {
            externalId: `yt_${item.videoId}`,
            source: "youtube",
            title,
            artist,
            album: "",
            duration: item.lengthSeconds || 0,
            imageUrl: thumbnail,
            streamUrl: null,
            videoId: item.videoId,
          };
        });

      return results;
    } catch (error) {
      console.error("[YouTube] Search error:", error);
      return [];
    }
  },

  getStreamUrl: async (videoId) => {
    try {
      const data = await invidiousFetch(`/api/v1/videos/${videoId}`);
      if (!data) return null;

      const audioFormats = (data.adaptiveFormats || [])
        .filter((f) => f.type?.startsWith("audio/"))
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (audioFormats.length === 0) return null;

      const m4a = audioFormats.find((f) => f.type?.includes("mp4"));
      const webm = audioFormats.find((f) => f.type?.includes("webm"));
      const best = m4a || webm || audioFormats[0];

      return {
        url: best.url,
        mimeType: best.type,
        bitrate: best.bitrate,
        duration: data.lengthSeconds || 0,
        title: data.title,
        artist: data.author?.replace(/ - Topic$/, "") || "",
        thumbnail:
          data.videoThumbnails?.find((t) => t.quality === "medium")?.url || "",
        expiresIn: 21600,
      };
    } catch (error) {
      console.error("[YouTube] getStreamUrl error:", error);
      return null;
    }
  },
};

export const piped = youtube;

// ============================================================================
// HELPERS
// ============================================================================

function cleanHtml(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function fixImageQuality(url) {
  if (!url) return "";
  return url
    .replace(/50x50/g, "500x500")
    .replace(/150x150/g, "500x500")
    .replace(/http:\/\//g, "https://");
}

function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default { jiosaavn, youtube, piped: youtube };