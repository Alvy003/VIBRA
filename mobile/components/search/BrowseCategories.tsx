// components/search/BrowseCategories.tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { CategoryCard } from './CategoryCard';

const CATEGORIES = [
  { id: 'music', label: 'Music', color: '#8400E7' },
  { id: 'made-for-you', label: 'Made For You', color: '#1E3264' },
  { id: 'new-releases', label: 'New Releases', color: '#E8115B' },
  { id: 'hindi', label: 'Hindi', color: '#148A08' },
  { id: 'punjabi', label: 'Punjabi', color: '#BC5900' },
  { id: 'tamil', label: 'Tamil', color: '#D84000' },
  { id: 'telugu', label: 'Telugu', color: '#8D67AB' },
  { id: 'pop', label: 'Pop', color: '#1E3264' },
  { id: 'hiphop', label: 'Hip-Hop', color: '#BA5D07' },
  { id: 'rock', label: 'Rock', color: '#E91429' },
  { id: 'indie', label: 'Indie', color: '#608108' },
  { id: 'chill', label: 'Chill', color: '#477D95' },
  { id: 'party', label: 'Party', color: '#AF2896' },
  { id: 'romance', label: 'Romance', color: '#DC148C' },
  { id: 'workout', label: 'Workout', color: '#777777' },
  { id: 'sleep', label: 'Sleep', color: '#1E3264' },
  { id: '2000s', label: '2000s', color: '#503750' },
  { id: '90s', label: '90s', color: '#E1118B' },
];

interface BrowseCategoriesProps {
  onCategoryPress: (category: string) => void;
}

export const BrowseCategories = React.memo(({ 
  onCategoryPress 
}: BrowseCategoriesProps) => {
  const handlePress = useCallback((category: string) => {
    onCategoryPress(category);
  }, [onCategoryPress]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Browse all</Text>
      
      <View style={styles.grid}>
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            id={category.id}
            label={category.label}
            color={category.color}
            onPress={() => handlePress(category.label)}
          />
        ))}
      </View>
      
      <View style={styles.footer} />
    </ScrollView>
  );
});

BrowseCategories.displayName = 'BrowseCategories';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  footer: {
    height: 140,
  },
});