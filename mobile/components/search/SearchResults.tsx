// components/search/SearchResults.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSearchStore } from '@/stores/useSearchStore';
import { TopResultCard } from './TopResultCard';
import { SongResultRow } from './SongResultRow';
import { ArtistResultRow } from './ArtistResultRow';
import { AlbumResultRow } from './AlbumResultRow';
import { PlaylistResultRow } from './PlaylistResultRow';

interface SearchResultsProps {
  visible: boolean;
  activeFilter: 'all' | 'songs' | 'artists' | 'albums' | 'playlists';
}

export const SearchResults = React.memo(({ visible, activeFilter }: SearchResultsProps) => {
  const suggestions = useSearchStore((s) => s.suggestions);
  const results = useSearchStore((s) => s.results);
  const isSuggesting = useSearchStore((s) => s.isSuggesting);
  const isSearching = useSearchStore((s) => s.isSearching);
  const query = useSearchStore((s) => s.query);

  const displayData = results || suggestions;
  const isLoading = isSearching || (isSuggesting && !displayData);

  const topResult = useMemo(() => {
    if (!displayData) return null;
    
    // Prioritize: exact artist match > exact song match > exact playlist match > startsWith song > fuzzy artist
    const artists = displayData.artists || [];
    const songs = displayData.songs || [];
    const albums = displayData.albums || [];
    const playlists = displayData.playlists || [];

    const lowerQuery = query.toLowerCase().trim();

    // 1. Check for exact artist match
    const artistMatch = artists.find((a: any) => 
      (a.title || a.name)?.toLowerCase() === lowerQuery
    );
    if (artistMatch) return { data: artistMatch, type: 'artist' as const };

    // 2. Check for exact song title match
    const exactSongMatch = songs.find((s: any) => 
      (s.title)?.toLowerCase() === lowerQuery
    );
    if (exactSongMatch) return { data: exactSongMatch, type: 'song' as const };

    // 3. Check for exact playlist match
    const playlistMatch = playlists.find((p: any) => 
        (p.title || p.name)?.toLowerCase() === lowerQuery
    );
    if (playlistMatch) return { data: playlistMatch, type: 'playlist' as const };

    // 4. Check for song starting with query
    const startsWithSong = songs.find((s: any) => 
        (s.title)?.toLowerCase().startsWith(lowerQuery)
    );
    if (startsWithSong) return { data: startsWithSong, type: 'song' as const };

    // 5. Fallback to fuzzy artist match
    const fuzzyArtistMatch = artists.find((a: any) => 
        (a.title || a.name)?.toLowerCase().includes(lowerQuery)
    );
    if (fuzzyArtistMatch) return { data: fuzzyArtistMatch, type: 'artist' as const };

    // Default to first song
    if (songs.length > 0) return { data: songs[0], type: 'song' as const };
    if (playlists.length > 0) return { data: playlists[0], type: 'playlist' as const };
    if (albums.length > 0) return { data: albums[0], type: 'album' as const };
    if (artists.length > 0) return { data: artists[0], type: 'artist' as const };

    return null;
  }, [displayData, query]);

  const sortByStartsWith = (items: any[], q: string) => {
    const lq = q.toLowerCase().trim();
    return [...items].sort((a, b) => {
      const aStarts = (a.title || a.name || '').toLowerCase().startsWith(lq) ? 0 : 1;
      const bStarts = (b.title || b.name || '').toLowerCase().startsWith(lq) ? 0 : 1;
      return aStarts - bStarts;
    });
  };

  const songs = useMemo(() => {
    if (!displayData?.songs) return [];
    let filtered = displayData.songs;
    if (topResult?.type === 'song') {
      filtered = displayData.songs.filter((s: any) => 
        s._id !== topResult.data._id && 
        s.videoId !== topResult.data.videoId
      );
    }
    return sortByStartsWith(filtered, query).slice(0, 4);
  }, [displayData, topResult, query]);

  const artists = useMemo(() => {
    if (!displayData?.artists) return [];
    let filtered = displayData.artists;
    if (topResult?.type === 'artist') {
      filtered = displayData.artists.filter((a: any) => 
        a._id !== topResult.data._id
      );
    }
    return sortByStartsWith(filtered, query).slice(0, 3);
  }, [displayData, topResult, query]);

  const albums = useMemo(() => {
    if (!displayData?.albums) return [];
    let filtered = displayData.albums;
    if (topResult?.type === 'album') {
      filtered = displayData.albums.filter((a: any) => 
        a._id !== topResult.data._id && a.id !== topResult.data.id
      );
    }
    return sortByStartsWith(filtered, query).slice(0, 3);
  }, [displayData, topResult, query]);

  const playlists = useMemo(() => {
    if (!displayData?.playlists) return [];
    let filtered = displayData.playlists;
    if (topResult?.type === 'playlist') {
      filtered = displayData.playlists.filter((p: any) => 
        p._id !== topResult.data._id && p.id !== topResult.data.id
      );
    }
    return sortByStartsWith(filtered, query).slice(0, 3);
  }, [displayData, topResult, query]);

  const hasResults = useMemo(() => {
    if (isLoading) return true; // Show loading instead
    if (activeFilter === 'all') return !!topResult || songs.length > 0 || artists.length > 0 || albums.length > 0 || playlists.length > 0;
    if (activeFilter === 'songs') return songs.length > 0;
    if (activeFilter === 'artists') return artists.length > 0;
    if (activeFilter === 'albums') return albums.length > 0;
    if (activeFilter === 'playlists') return playlists.length > 0;
    return false;
  }, [activeFilter, topResult, songs, artists, albums, playlists, isLoading]);

  if (!visible) return null;

  if (isLoading && !displayData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Searching...</Text>
      </View>
    );
  }

  if (!hasResults && query.length > 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No results found for "{query}"{activeFilter !== 'all' ? ` in ${activeFilter}` : ''}</Text>
        <Text style={styles.emptyHint}>
          Check your spelling, or try different keywords.
        </Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Result */}
        {topResult && activeFilter === 'all' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top result</Text>
            <TopResultCard result={topResult.data} type={topResult.type} searchQuery={query} />
          </View>
        )}

        {/* Songs */}
        {(activeFilter === 'all' || activeFilter === 'songs') && songs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Songs</Text>
            {songs.map((song: any) => (
              <SongResultRow
                key={song.externalId || song._id || song.videoId || song.id || `${song.title}-${song.artist}`}
                song={song}
                searchQuery={query}
              />
            ))}
          </View>
        )}

        {/* Artists */}
        {(activeFilter === 'all' || activeFilter === 'artists') && artists.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Artists</Text>
            {artists.map((artist: any) => (
              <ArtistResultRow
                key={artist._id || artist.id}
                artist={artist}
              />
            ))}
          </View>
        )}

        {/* Albums */}
        {(activeFilter === 'all' || activeFilter === 'albums') && albums.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Albums</Text>
            {albums.map((album: any) => (
              <AlbumResultRow
                key={album._id || album.id}
                album={album}
              />
            ))}
          </View>
        )}

        {/* Playlists */}
        {(activeFilter === 'all' || activeFilter === 'playlists') && playlists.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Playlists</Text>
            {playlists.map((playlist: any) => (
              <PlaylistResultRow
                key={playlist._id || playlist.id}
                playlist={playlist}
              />
            ))}
          </View>
        )}

        <View style={styles.footer} />
      </ScrollView>
    </Animated.View>
  );
});

SearchResults.displayName = 'SearchResults';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
    backgroundColor: '#09090b',
  },
  loadingText: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40, 
    paddingBottom: 50, 
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHint: {
    color: '#a1a1aa',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    height: 140,
  },
});