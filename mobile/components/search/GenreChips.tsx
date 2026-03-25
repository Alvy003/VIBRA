// components/search/GenreChips.tsx
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GENRE_CHIPS, SEARCH_COLORS, RADIUS } from '@/constants/design';

interface GenreChipsProps {
  onGenrePress: (genre: string) => void;
}

const GenreChip = React.memo(({ 
  genre, 
  index,
  onPress 
}: { 
  genre: typeof GENRE_CHIPS[0]; 
  index: number;
  onPress: () => void;
}) => {
  return (
    <Animated.View entering={FadeInUp.delay(index * 30).springify()}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.chip}
        activeOpacity={0.7}
      >
        <Text style={styles.emoji}>{genre.icon}</Text>
        <Text style={styles.label}>{genre.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

GenreChip.displayName = 'GenreChip';

export const GenreChips = React.memo(({ onGenrePress }: GenreChipsProps) => {
  const handlePress = useCallback(
    (genre: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onGenrePress(genre);
    },
    [onGenrePress]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Browse by genre</Text>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {GENRE_CHIPS.map((genre, index) => (
          <GenreChip
            key={genre.id}
            genre={genre}
            index={index}
            onPress={() => handlePress(genre.label)}
          />
        ))}
      </ScrollView>
    </View>
  );
});

GenreChips.displayName = 'GenreChips';

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
  },
  title: {
    color: SEARCH_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SEARCH_COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: SEARCH_COLORS.inputBorder,
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    color: SEARCH_COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});