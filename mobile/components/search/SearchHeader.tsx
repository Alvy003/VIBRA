// components/search/SearchHeader.tsx
import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { Search, X, AudioLines, ArrowLeft } from 'lucide-react-native';
import { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { useSearchStore } from '@/stores/useSearchStore';
import { UserProfileIcon } from '../UserProfileIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';

interface SearchHeaderProps {
  onMicPress: () => void;
  onFocus: () => void;
  onBlur: () => void;
  isFocused: boolean;
}

export const SearchHeader = React.memo(({
  onMicPress,
  onFocus,
  onBlur,
  isFocused,
}: SearchHeaderProps) => {
  const insets = useSafeAreaInsets();
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const fetchSuggestions = useSearchStore((s) => s.fetchSuggestions);
  const fetchResults = useSearchStore((s) => s.fetchResults);
  const clearSearch = useSearchStore((s) => s.clearSearch);
  const inputRef = useRef<TextInput>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusAnimation = useSharedValue(0);

  useEffect(() => {
    focusAnimation.value = withTiming(isFocused ? 1 : 0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [isFocused]);

  const normalizeQuery = (q: string): string => {
    return q
      .replace(/\s+/g, ' ')          // collapse multiple spaces
      .replace(/\bsong\b/gi, '')     // strip accidental suffixes
      .replace(/\bmp3\b/gi, '')
      .replace(/\blyrics\b/gi, '')
      .trim();
  };

  const handleChange = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    // Minimum 2-character guard
    const normalizedText = normalizeQuery(text);
    if (normalizedText.length < 2) {
      if (text.trim().length === 0) {
        useSearchStore.getState().clearSearch();
      }
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(normalizedText);
    }, 400); // 400ms debounce
  }, [setQuery, fetchSuggestions]);

  const handleSubmit = useCallback(() => {
    const normalizedText = normalizeQuery(query);
    if (normalizedText.length >= 2) {
      fetchResults(normalizedText);
    }
    Keyboard.dismiss();
  }, [query, fetchResults]);

  const handleClear = useCallback(() => {
    clearSearch();
    inputRef.current?.focus();
  }, [clearSearch]);

  const handleCancel = useCallback(() => {
    clearSearch();
    inputRef.current?.blur();
    Keyboard.dismiss();
    onBlur();
  }, [clearSearch, onBlur]);

  // Title collapse animation
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focusAnimation.value, [0, 0.3], [1, 0], Extrapolation.CLAMP),
    height: interpolate(focusAnimation.value, [0, 1], [36, 0], Extrapolation.CLAMP),
    marginBottom: interpolate(focusAnimation.value, [0, 1], [16, 0], Extrapolation.CLAMP),
  }));

  // Search bar color animation
  const searchBarStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(isFocused ? Colors.surface : Colors.textPrimary, { duration: 200 }),
    };
  });

  const iconColor = isFocused ? Colors.textPrimary : Colors.background;
  const textColor = isFocused ? Colors.textPrimary : Colors.background;
  const placeholderColor = isFocused ? Colors.textMuted : '#535353';

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(isFocused ? Colors.surface : Colors.background, { duration: 200 }),
    paddingBottom: withTiming(isFocused ? 12 : 16, { duration: 200 }),
  }));

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top + 14 }, containerStyle]}>
      {/* Title - Collapses when focused */}
      <Animated.View style={[styles.titleContainer, titleStyle]}>
        <Text className="text-white text-2xl font-extrabold tracking-wide">Search</Text>
        <UserProfileIcon size={34} />
      </Animated.View>

      {/* Search Row */}
      <View style={styles.inputRow}>
        {/* Back Button - Appears when focused */}
        {isFocused && (
          <Animated.View 
            entering={SlideInLeft.duration(200)} 
            exiting={SlideOutLeft.duration(200)}
            style={styles.backButtonContainer}
          >
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Search Input Container */}
        <Animated.View style={[styles.inputContainer, searchBarStyle]}>
          {!isFocused && <Search size={20} color={iconColor} style={styles.searchIcon} />}
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleChange}
            onFocus={onFocus}
            placeholder="What do you want to listen to?"
            placeholderTextColor={placeholderColor}
            style={[styles.input, { color: textColor }]}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor={Colors.accent}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={iconColor} />
            </TouchableOpacity>
          )}
          {/* Voice button inside - only show when not focused */}
          {!isFocused && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                onPress={onMicPress}
                style={styles.voiceButton}
                activeOpacity={0.7}
              >
                <AudioLines size={20} color={Colors.background} />
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
});

SearchHeader.displayName = 'SearchHeader';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
  },
  titleContainer: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  backButtonContainer: {
    marginRight: 0,
  },
  backButton: {
    padding: 4,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    height: 48,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
    padding: 0,
  },
  clearButton: {
    padding: 0,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.background,
    opacity: 0.15,
    marginHorizontal: 10,
  },
  voiceButton: {
    padding: 4,
  },
});