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
  const isSuggesting = useSearchStore((s) => s.isSuggesting);
  const query = useSearchStore((s) => s.query);

  const topResult = useMemo(() => {
    if (!suggestions) return null;
    
    // Prioritize: exact artist match > exact playlist match > song > album
    const artists = suggestions.artists || [];
    const songs = suggestions.songs || [];
    const albums = suggestions.albums || [];
    const playlists = suggestions.playlists || [];

    const lowerQuery = query.toLowerCase().trim();

    // 1. Check for exact artist match
    const artistMatch = artists.find((a: any) => 
      (a.title || a.name)?.toLowerCase() === lowerQuery
    );
    if (artistMatch) return { data: artistMatch, type: 'artist' as const };

    // 2. Check for exact playlist match
    const playlistMatch = playlists.find((p: any) => 
        (p.title || p.name)?.toLowerCase() === lowerQuery
    );
    if (playlistMatch) return { data: playlistMatch, type: 'playlist' as const };

    // 3. Fallback to fuzzy artist match
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
  }, [suggestions, query]);

  const songs = useMemo(() => {
    if (!suggestions?.songs) return [];
    // Filter out top result if it's a song
    if (topResult?.type === 'song') {
      return suggestions.songs.filter((s: any) => 
        s._id !== topResult.data._id && 
        s.videoId !== topResult.data.videoId
      ).slice(0, 4);
    }
    return suggestions.songs.slice(0, 4);
  }, [suggestions, topResult]);

  const artists = useMemo(() => {
    if (!suggestions?.artists) return [];
    if (topResult?.type === 'artist') {
      return suggestions.artists.filter((a: any) => 
        a._id !== topResult.data._id
      ).slice(0, 3);
    }
    return suggestions.artists.slice(0, 3);
  }, [suggestions, topResult]);

  const albums = useMemo(() => {
    if (!suggestions?.albums) return [];
    if (topResult?.type === 'album') {
      return suggestions.albums.filter((a: any) => 
        a._id !== topResult.data._id && a.id !== topResult.data.id
      ).slice(0, 3);
    }
    return suggestions.albums.slice(0, 3);
  }, [suggestions, topResult]);

  const playlists = useMemo(() => {
    if (!suggestions?.playlists) return [];
    if (topResult?.type === 'playlist') {
      return suggestions.playlists.filter((p: any) => 
        p._id !== topResult.data._id && p.id !== topResult.data.id
      ).slice(0, 3);
    }
    return suggestions.playlists.slice(0, 3);
  }, [suggestions, topResult]);

  if (!visible) return null;

  if (isSuggesting && !suggestions) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Searching...</Text>
      </View>
    );
  }

  if (!suggestions || (!topResult && songs.length === 0)) {
    return query.length > 0 ? (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No results found for</Text>
        <Text style={styles.emptyQuery}>"{query}"</Text>
        <Text style={styles.emptyHint}>
          Check your spelling, or try different keywords.
        </Text>
      </View>
    ) : null;
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
                key={song._id || song.videoId || song.externalId}
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
    backgroundColor: '#121212',
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
    fontWeight: '700',
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyQuery: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyHint: {
    color: '#b3b3b3',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    height: 140,
  },
});