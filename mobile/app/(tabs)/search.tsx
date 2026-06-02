import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Keyboard, ScrollView, TouchableOpacity, Text, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Plus, List as ListIcon, Search, Download, Music, Heart, LayoutGrid, ArrowUpDown, User as UserIcon, X } from 'lucide-react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSearchStore, RecentSearchItem } from '@/stores/useSearchStore';
import { SearchHeader } from '@/components/search/SearchHeader';
import { BrowseCategories } from '@/components/search/BrowseCategories';
import { RecentSearches } from '@/components/search/RecentSearches';
import { SearchResults } from '@/components/search/SearchResults';
import { AudioSearchModal } from '@/components/search/AudioSearchModal';
import Colors from '@/constants/Colors';

export default function SearchScreen() {
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const fetchSuggestions = useSearchStore((s) => s.fetchSuggestions);
  const fetchResults = useSearchStore((s) => s.fetchResults);

  const [filter, setFilter] = useState<'all' | 'songs' | 'artists' | 'albums' | 'playlists'>('all');
  const [isFocused, setIsFocused] = useState(false);
  const [micModalVisible, setMicModalVisible] = useState(false);

  const handleCategoryPress = useCallback((category: string) => {
    setIsFocused(true);
    setQuery(category);
    fetchResults(category);
    Keyboard.dismiss();
  }, [setQuery, fetchResults]);

  const handleRecentSelect = useCallback((item: RecentSearchItem) => {
    // Song is already played in RecentSearches component
    // Just dismiss keyboard
    Keyboard.dismiss();
  }, []);

  const handleAudioResult = useCallback((q: string) => {
    setMicModalVisible(false);
    setQuery(q);
    fetchResults(q);
    Keyboard.dismiss();
  }, [setQuery, fetchResults]);

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

  // Auto-focus when query comes from external source (like Browse categories)
  React.useEffect(() => {
    if (query.trim().length > 0 && !isFocused) {
      setIsFocused(true);
    }
  }, [query]);

  // Handle system back gesture
  React.useEffect(() => {
    if (isFocused) {
      const backAction = () => {
        handleBlur();
        return true; // Prevent default behavior
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }
  }, [isFocused, handleBlur]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: isFocused ? Colors.surface : Colors.background }]} edges={['top']}>
      <StatusBar
        style="light"
        backgroundColor={isFocused ? Colors.surface : Colors.background}
        animated={true}
      />
      <SearchHeader
        onMicPress={() => setMicModalVisible(true)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        isFocused={isFocused}
      />

      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        {showResults && (
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
              <Animated.View layout={Layout.springify()} style={{ flexDirection: 'row', alignItems: 'center' }}>
                {filter !== 'all' ? (
                  <Animated.View entering={FadeIn.duration(200)} layout={Layout.springify()}>
                    <TouchableOpacity
                      onPress={() => setFilter('all')}
                      style={styles.closeButton}
                    >
                      <X size={18} color={Colors.textPrimary} />
                    </TouchableOpacity>
                  </Animated.View>
                ) : null}

                {filter === 'all' ? (
                  FILTERS.filter(f => f.id !== 'all').map((f) => (
                    <Animated.View key={f.id} entering={FadeIn.duration(200)}>
                      <TouchableOpacity
                        style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
                        onPress={() => setFilter(f.id as any)}
                      >
                        <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ))
                ) : (
                  <Animated.View entering={FadeIn.duration(200)}>
                    <FilterChip
                      label={FILTERS.find(f => f.id === filter)?.label || ''}
                      isActive={true}
                      onPress={() => setFilter('all')}
                    />
                  </Animated.View>
                )}
              </Animated.View>
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
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingTop: 4,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
  },
  filterText: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  }
});

const FilterChip = ({ label, isActive, onPress }: { label: string, isActive: boolean, onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.filterChip, isActive && styles.filterChipActive]}
  >
    <Text style={[styles_extra.filterChipText, isActive && styles.filterTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles_extra = StyleSheet.create({
  filterChipText: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '600',
  }
});