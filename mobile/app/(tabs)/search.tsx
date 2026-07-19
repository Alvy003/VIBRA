import { AudioSearchModal } from '@/components/search/AudioSearchModal';
import { BrowseCategories } from '@/components/search/BrowseCategories';
import { RecentSearches } from '@/components/search/RecentSearches';
import { SearchHeader } from '@/components/search/SearchHeader';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchSuggestions } from '@/components/search/SearchSuggestions';
import Colors from '@/constants/Colors';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { AutocompleteSuggestion, RecentSearchItem, useSearchStore } from '@/stores/useSearchStore';
import { useToastStore } from '@/stores/useToastStore';
import { useNavigation, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Keyboard, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const fetchSuggestions = useSearchStore((s) => s.fetchSuggestions);
  const fetchResults = useSearchStore((s) => s.fetchResults);
  const results = useSearchStore((s) => s.results);
  const addRecentSearch = useSearchStore((s) => s.addRecentSearch);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const [filter, setFilter] = useState<'all' | 'songs' | 'artists' | 'albums' | 'playlists'>('all');
  const [isFocused, setIsFocused] = useState(false);
  const [micModalVisible, setMicModalVisible] = useState(false);

  const searchHeaderRef = useRef<{ focus: () => void; blur: () => void }>(null);
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
      const isFocusedScreen = navigation.isFocused();
      if (isFocusedScreen) {
        searchHeaderRef.current?.focus();
      }
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        Keyboard.dismiss();
        searchHeaderRef.current?.blur();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const handleCategoryPress = useCallback((category: string) => {
    if (!useNetworkStore.getState().isOnline) {
      useToastStore.getState().showToast({
        message: "Search unavailable while offline",
        iconType: 'none',
      });
      return;
    }
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
    if (!useNetworkStore.getState().isOnline) {
      useToastStore.getState().showToast({
        message: "Search unavailable while offline",
        iconType: 'none',
      });
      return;
    }
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

  const isSearching = useSearchStore((s) => s.isSearching);
  const isSearchSubmitted = results !== null || isSearching;
  const showAutocomplete = query.trim().length >= 2 && !isSearchSubmitted;
  const showRecents = isFocused && !showAutocomplete && !isSearchSubmitted;
  const showBrowse = !showAutocomplete && !isSearchSubmitted && !showRecents;

  const handleSuggestionSelect = useCallback((item: AutocompleteSuggestion | string) => {
    Keyboard.dismiss();
    
    if (typeof item === 'string') {
      setQuery(item);
      fetchResults(item);
      return;
    }
    
    // Log to recent searches
    const prefixMap = {
      song: 'jiosaavn_',
      artist: 'jiosaavn_artist_',
      album: 'jiosaavn_album_',
      playlist: 'jiosaavn_playlist_',
    };
    const prefix = prefixMap[item.type];
    const recentId = String(item.id).startsWith(prefix) ? item.id : `${prefix}${item.id}`;
    
    addRecentSearch({
      id: recentId,
      title: item.title,
      artist: item.artist || '',
      imageUrl: item.imageUrl || '',
      type: item.type,
      timestamp: Date.now(),
    });

    // Play or Navigate directly
    if (item.type === 'song') {
      playTrack({
        id: recentId,
        title: item.title,
        artist: item.artist,
        artwork: item.imageUrl,
        source: 'jiosaavn',
      } as any);
    } else {
      const cleanId = String(item.id).replace(/^(jiosaavn_artist_|jiosaavn_album_|jiosaavn_playlist_|jiosaavn_)/, '');
      const pathMap = {
        artist: `/(tabs)/artist/external/jiosaavn/${cleanId}?from=search`,
        album: `/(tabs)/album/external/jiosaavn/${cleanId}?from=search`,
        playlist: `/(tabs)/playlist/external/jiosaavn/${cleanId}?from=search`,
      };
      const path = pathMap[item.type as 'artist' | 'album' | 'playlist'];
      if (path) {
        router.push(path as any);
      }
    }
  }, [playTrack, addRecentSearch, router]);

  const handleAutofill = useCallback((text: string) => {
    setQuery(text);
    fetchSuggestions(text);
  }, [setQuery, fetchSuggestions]);

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
    <View style={[styles.root, { backgroundColor: isFocused ? Colors.surface : Colors.background }]} pointerEvents="box-none">
      <StatusBar
        style="light"
        backgroundColor={isFocused ? Colors.surface : Colors.background}
        animated={true}
      />
      <SearchHeader
        ref={searchHeaderRef}
        onMicPress={() => setMicModalVisible(true)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        isFocused={isFocused}
      />

      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        {isSearchSubmitted && (
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
          {showBrowse && (
            <BrowseCategories onCategoryPress={handleCategoryPress} />
          )}

          {showAutocomplete && (
            <SearchSuggestions
              onSelect={handleSuggestionSelect}
              onAutofill={handleAutofill}
            />
          )}

          {isSearchSubmitted && (
            <SearchResults visible={true} activeFilter={filter} />
          )}

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
      </View>
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