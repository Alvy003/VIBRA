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
import { useSearchStore } from '@/stores/useSearchStore';

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
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const fetchSuggestions = useSearchStore((s) => s.fetchSuggestions);
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

  const handleChange = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 300);
  }, [setQuery, fetchSuggestions]);

  const handleClear = useCallback(() => {
    clearSearch();
    inputRef.current?.focus();
  }, [clearSearch]);

  const handleBack = useCallback(() => {
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

  // Back button animation
  const backButtonStyle = useAnimatedStyle(() => ({
    width: interpolate(focusAnimation.value, [0, 1], [0, 44], Extrapolation.CLAMP),
    opacity: focusAnimation.value,
    marginRight: interpolate(focusAnimation.value, [0, 1], [0, 8], Extrapolation.CLAMP),
  }));

  // Search bar color animation
  const searchBarStyle = useAnimatedStyle(() => {
    const bgColor = interpolate(focusAnimation.value, [0, 1], [0, 1]);
    return {
      backgroundColor: bgColor === 0 ? '#fff' : '#2a2a2a',
    };
  });

  const iconColor = isFocused ? '#b3b3b3' : '#121212';
  const textColor = isFocused ? '#fff' : '#121212';
  const placeholderColor = isFocused ? '#727272' : '#535353';

  return (
    <View style={styles.container}>
      {/* Title - Collapses when focused */}
      <Animated.View style={[styles.titleContainer, titleStyle]}>
        <Text style={styles.title}>Search</Text>
      </Animated.View>

      {/* Search Row */}
      <View style={styles.inputRow}>
        {/* Back Button - Appears when focused */}
        <Animated.View style={[styles.backButtonContainer, backButtonStyle]}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Search Input Container */}
        <Animated.View style={[styles.inputContainer, searchBarStyle]}>
          <Search size={20} color={iconColor} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleChange}
            onFocus={onFocus}
            placeholder="What do you want to listen to?"
            placeholderTextColor={placeholderColor}
            style={[styles.input, { color: textColor }]}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor="#8B5CF6"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={iconColor} />
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
                <AudioLines size={20} color="#121212" />
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </View>
  );
});

SearchHeader.displayName = 'SearchHeader';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#121212',
  },
  titleContainer: {
    overflow: 'hidden',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonContainer: {
    overflow: 'hidden',
  },
  backButton: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 6,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#121212',
    opacity: 0.15,
    marginHorizontal: 10,
  },
  voiceButton: {
    padding: 4,
  },
});