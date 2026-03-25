import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Keyboard, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSearchStore, RecentSearchItem } from '@/stores/useSearchStore';
import { SearchHeader } from '@/components/search/SearchHeader';
import { BrowseCategories } from '@/components/search/BrowseCategories';
import { RecentSearches } from '@/components/search/RecentSearches';
import { SearchResults } from '@/components/search/SearchResults';
import { AudioSearchModal } from '@/components/search/AudioSearchModal';

export default function SearchScreen() {
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const fetchSuggestions = useSearchStore((s) => s.fetchSuggestions);

  const [filter, setFilter] = useState<'all' | 'songs' | 'artists' | 'albums' | 'playlists'>('all');
  const [isFocused, setIsFocused] = useState(false);
  const [micModalVisible, setMicModalVisible] = useState(false);

  const handleCategoryPress = useCallback((category: string) => {
    setQuery(category);
    fetchSuggestions(category);
    Keyboard.dismiss();
  }, [setQuery, fetchSuggestions]);

  const handleRecentSelect = useCallback((item: RecentSearchItem) => {
    // Song is already played in RecentSearches component
    // Just dismiss keyboard
    Keyboard.dismiss();
  }, []);

  const handleAudioResult = useCallback((q: string) => {
    setMicModalVisible(false);
    setQuery(q);
    fetchSuggestions(q);
    Keyboard.dismiss();
  }, [setQuery, fetchSuggestions]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'songs', label: 'Songs' },
    { id: 'artists', label: 'Artists' },
    { id: 'albums', label: 'Albums' },
    { id: 'playlists', label: 'Playlists' },
  ];

  const showResults = query.trim().length > 0;
  const showRecents = isFocused && query.trim().length === 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SearchHeader
        onMicPress={() => setMicModalVisible(true)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        isFocused={isFocused}
      />

      {showResults && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
                onPress={() => setFilter(f.id as any)}
              >
                <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.content}>
        {!showResults && !showRecents && (
          <BrowseCategories onCategoryPress={handleCategoryPress} />
        )}

        <SearchResults visible={showResults} activeFilter={filter} />

        <RecentSearches
          onSelect={handleRecentSelect}
          visible={showRecents}
        />
      </View>

      <AudioSearchModal
        visible={micModalVisible}
        onClose={() => setMicModalVisible(false)}
        onResult={handleAudioResult}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 10,
    paddingTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#282828',
  },
  filterChipActive: {
    backgroundColor: '#8B5CF6',
  },
  filterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#000',
  },
});