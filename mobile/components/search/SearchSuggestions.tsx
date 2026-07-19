import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Search, ArrowUpRight } from 'lucide-react-native';
import { useSearchStore, AutocompleteSuggestion } from '@/stores/useSearchStore';
import Colors from '@/constants/Colors';
import SongOptions from '@/components/SongOptions';

interface SearchSuggestionsProps {
  onSelect: (item: AutocompleteSuggestion | string) => void;
  onAutofill: (text: string) => void;
}

type UnifiedItem =
  | { type: 'text'; text: string }
  | { type: 'media'; item: AutocompleteSuggestion };

const filterSuggestions = (items: AutocompleteSuggestion[]): AutocompleteSuggestion[] => {
  const seenKeys = new Set<string>();
  const filtered: AutocompleteSuggestion[] = [];

  for (const item of items) {
    const title = (item.title || '').trim();
    if (!title) continue;

    const titleLower = title.toLowerCase();
    const duplicateKey = `${item.type}-${titleLower}`;

    if (seenKeys.has(duplicateKey) || seenKeys.has(item.id)) {
      continue;
    }

    seenKeys.add(duplicateKey);
    seenKeys.add(item.id);
    filtered.push(item);
  }

  return filtered;
};

const generateTextSuggestions = (
  sortedMediaItems: AutocompleteSuggestion[],
  query: string
): string[] => {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // Find the top-ranked artist entity from the sorted list
  const topArtist = sortedMediaItems.find(item => item.type === 'artist');
  if (!topArtist) return [];

  const artistName = topArtist.title.trim();

  // Skip query generation if the artist's name is too long (> 22 characters)
  if (artistName.length > 22) return [];

  const resultSet = new Set<string>();

  const addIfMatches = (text: string) => {
    const lower = text.toLowerCase();
    if (!lower.includes(q)) return;

    const cleaned = text
      .toLowerCase()
      .replace(/\(.*\)|\[.*\]|-.*|·.*/g, '') // remove brackets, dashes, middot
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned) {
      resultSet.add(cleaned);
    } else {
      resultSet.add(lower.replace(/\s+/g, ' ').trim());
    }
  };

  addIfMatches(artistName);
  addIfMatches(`${artistName} hits`);
  addIfMatches(`${artistName} songs`);

  const list = Array.from(resultSet);

  // Sort: prefix matches first, then by length (shorter first)
  return list.sort((a, b) => {
    const aStarts = a.startsWith(q);
    const bStarts = b.startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.length - b.length;
  }).slice(0, 3); // Maximum 3 text suggestions
};

const scoreSuggestion = (item: AutocompleteSuggestion, query: string): number => {
  const title = (item.title || '').trim();
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase().trim();

  let score = 0;

  // 1. Match type boosts
  if (titleLower === queryLower) {
    score += 3000;
    if (item.type === 'artist') score += 1000; // Prefer artist exact match
  } else if (titleLower.startsWith(queryLower)) {
    score += 1500;
    if (item.type === 'artist') score += 500; // Prefer artist prefix match
  } else if (titleLower.includes(queryLower)) {
    score += 500;
  }

  // 2. Artwork quality scoring
  const isPlaceholderImg = !item.imageUrl ||
    item.imageUrl.includes('artist-default') ||
    item.imageUrl.includes('album-default') ||
    item.imageUrl.includes('playlist-default') ||
    item.imageUrl.includes('song-default') ||
    item.imageUrl.includes('placeholder') ||
    item.imageUrl.includes('default-film') ||
    item.imageUrl.trim() === '';

  if (isPlaceholderImg) {
    score -= 2000; // Large penalty to demote low-quality entities to the bottom
  } else {
    score += 500;  // Boost items with valid artwork
  }

  // 3. Entity-type ranking weights
  if (item.type === 'artist') score += 300;
  if (item.type === 'song') score += 200;
  if (item.type === 'album') score += 100;

  // 4. Low quality/garbage name penalties
  const lowQualityTerms = ['karaoke', 'instrumental', 'ringtone', 'cover version', 'tribute to', 'remix', 'dj'];
  if (lowQualityTerms.some(term => titleLower.includes(term))) {
    score -= 1500;
  }

  return score;
};

const sortSuggestions = (items: AutocompleteSuggestion[], query: string): AutocompleteSuggestion[] => {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return items;

  return [...items].sort((a, b) => {
    const scoreA = scoreSuggestion(a, lowerQuery);
    const scoreB = scoreSuggestion(b, lowerQuery);
    return scoreB - scoreA;
  });
};

const TextSuggestionRow = React.memo(({
  text,
  onPress,
  onArrowPress,
}: {
  text: string;
  onPress: () => void;
  onArrowPress: () => void;
}) => {
  return (
    <View style={styles.textRowContainer}>
      <TouchableOpacity onPress={onPress} style={styles.textRowLeft} activeOpacity={0.7}>
        <Search size={18} color="#71717a" style={styles.searchIcon} />
        <Text style={styles.textRowText} numberOfLines={1}>{text}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onArrowPress} style={styles.arrowBtn} activeOpacity={0.7}>
        <ArrowUpRight size={18} color="#71717a" />
      </TouchableOpacity>
    </View>
  );
});
TextSuggestionRow.displayName = 'TextSuggestionRow';

const SuggestionRow = React.memo(
  ({
    item,
    onPress,
  }: {
    item: AutocompleteSuggestion;
    onPress: () => void;
  }) => {
    const isArtist = item.type === 'artist';

    const getSubtitle = () => {
      switch (item.type) {
        case 'song':
          return `Song${item.artist ? ` • ${item.artist}` : ''}`;
        case 'artist':
          return 'Artist';
        case 'album':
          return `Album${item.artist ? ` • ${item.artist}` : ''}`;
        case 'playlist':
          return 'Playlist';
        default:
          return '';
      }
    };

    return (
      <View style={styles.row}>
        <TouchableOpacity onPress={onPress} style={styles.rowLeft} activeOpacity={0.7}>
          {item.imageUrl ? (
            <Image
              source={item.imageUrl}
              style={[styles.thumb, isArtist && styles.thumbCircle]}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback, isArtist && styles.thumbCircle]}>
              <Search size={16} color="#a1a1aa" />
            </View>
          )}
          <View style={styles.rowText}>
            <Text style={styles.primaryText} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.secondaryText} numberOfLines={1}>
              {getSubtitle()}
            </Text>
          </View>
        </TouchableOpacity>

        {item.type === 'song' && (
          <SongOptions
            song={{
              id: item.id,
              title: item.title,
              artist: item.artist || '',
              artwork: item.imageUrl || '',
              source: 'jiosaavn',
            }}
          />
        )}
      </View>
    );
  }
);
SuggestionRow.displayName = 'SuggestionRow';

export const SearchSuggestions = React.memo(({ onSelect, onAutofill }: SearchSuggestionsProps) => {
  const suggestions = useSearchStore((s) => s.suggestions);
  const isSuggesting = useSearchStore((s) => s.isSuggesting);
  const query = useSearchStore((s) => s.query);

  const filteredSuggestions = useMemo(() => {
    return filterSuggestions(suggestions || []);
  }, [suggestions]);

  const sortedMediaItems = useMemo(() => {
    return sortSuggestions(filteredSuggestions, query);
  }, [filteredSuggestions, query]);

  const textSuggestions = useMemo(() => {
    return generateTextSuggestions(sortedMediaItems, query);
  }, [sortedMediaItems, query]);

  const unifiedList = useMemo((): UnifiedItem[] => {
    const items: UnifiedItem[] = [];
    textSuggestions.forEach((text) => {
      items.push({ type: 'text', text });
    });
    sortedMediaItems.forEach((item) => {
      items.push({ type: 'media', item });
    });
    return items;
  }, [textSuggestions, sortedMediaItems]);

  // if (isSuggesting && unifiedList.length === 0) {
  //   return (
  //     <View style={styles.loadingRow}>
  //       <Text style={styles.loadingText}>Searching...</Text>
  //     </View>
  //   );
  // }

  if (unifiedList.length === 0) {
    return null;
  }

  return (
    <FlatList
      data={unifiedList}
      keyExtractor={(item, idx) => item.type === 'text' ? `text-${item.text}-${idx}` : `media-${item.item.type}-${item.item.id}`}
      renderItem={({ item }) => {
        if (item.type === 'text') {
          return (
            <TextSuggestionRow
              text={item.text}
              onPress={() => onSelect(item.text)}
              onArrowPress={() => onAutofill(item.text)}
            />
          );
        } else {
          return (
            <SuggestionRow
              item={item.item}
              onPress={() => onSelect(item.item)}
            />
          );
        }
      }}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
});
SearchSuggestions.displayName = 'SearchSuggestions';

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 8,
    paddingBottom: 120, // offset for bottom player
  },
  loadingRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingText: {
    color: '#a1a1aa',
    fontSize: 14,
  },
  textRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  textRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 0,
  },
  textRowText: {
    color: '#e4e4e7',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  arrowBtn: {
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
    marginRight: 8,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#18181b',
  },
  thumbCircle: {
    borderRadius: 24,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    justifyContent: 'center',
  },
  primaryText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '500',
  },
  secondaryText: {
    color: '#ffffff80',
    fontSize: 12.5,
    marginTop: 2,
  },
});
