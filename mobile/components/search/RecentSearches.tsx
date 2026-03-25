// components/search/RecentSearches.tsx
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSearchStore, RecentSearchItem } from '@/stores/useSearchStore';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface RecentSearchesProps {
  onSelect: (song: RecentSearchItem) => void;
  visible: boolean;
}

const RecentItem = React.memo(({
  item,
  onSelect,
  onRemove,
}: {
  item: RecentSearchItem;
  onSelect: () => void;
  onRemove: () => void;
}) => (
  <View style={styles.item}>
    <TouchableOpacity
      onPress={onSelect}
      style={styles.itemContent}
      activeOpacity={0.7}
    >
      <Image
        source={item.imageUrl}
        style={[
          styles.itemImage,
          item.type === 'artist' && styles.itemImageRound,
        ]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemSubtitle} numberOfLines={1}>
          {item.type === 'artist' ? 'Artist' : `Song • ${item.artist}`}
        </Text>
      </View>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={onRemove}
      style={styles.removeButton}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <X size={20} color="#727272" />
    </TouchableOpacity>
  </View>
));

RecentItem.displayName = 'RecentItem';

export const RecentSearches = React.memo(({ 
  onSelect,
  visible,
}: RecentSearchesProps) => {
  const recentSearches = useSearchStore((s) => s.recentSearches);
  const removeRecentSearch = useSearchStore((s) => s.removeRecentSearch);
  const clearAllRecentSearches = useSearchStore((s) => s.clearAllRecentSearches);
  const query = useSearchStore((s) => s.query);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const handleSelect = useCallback((item: RecentSearchItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (item.type === 'song') {
      playTrack({
        id: item.id,
        title: item.title,
        artist: item.artist,
        artwork: item.imageUrl,
        source: 'jiosaavn',
      } as any);
    }
    
    onSelect(item);
  }, [playTrack, onSelect]);

  const handleRemove = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeRecentSearch(id);
  }, [removeRecentSearch]);

  const handleClearAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearAllRecentSearches();
  }, [clearAllRecentSearches]);

  if (!visible || query.length > 0 || recentSearches.length === 0) {
    return null;
  }

  const renderItem = ({ item }: { item: RecentSearchItem }) => (
    <RecentItem
      item={item}
      onSelect={() => handleSelect(item)}
      onRemove={() => handleRemove(item.id)}
    />
  );

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Recents</Text>
        <TouchableOpacity onPress={handleClearAll}>
          <Text style={styles.clearAll}>Clear all</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={recentSearches}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
      />
    </Animated.View>
  );
});

RecentSearches.displayName = 'RecentSearches';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#121212',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  clearAll: {
    color: '#b3b3b3',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 140,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 4,
    backgroundColor: '#282828',
  },
  itemImageRound: {
    borderRadius: 26,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 3,
  },
  itemSubtitle: {
    color: '#b3b3b3',
    fontSize: 13,
    fontWeight: '400',
  },
  removeButton: {
    padding: 10,
  },
});