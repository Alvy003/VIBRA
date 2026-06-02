// components/search/BrowseCategories.tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { CategoryCard } from './CategoryCard';

const CATEGORIES = [
  { id: 'music', label: 'Music', gradient: ['#8c01ff', '#5c00a8'] },
  { id: 'made-for-you', label: 'Made For You', gradient: ['#1e3264', '#16254a'] },
  { id: 'new-releases', label: 'New Releases', gradient: ['#f037a5', '#e8115b'] },
  { id: 'hindi', label: 'Hindi', gradient: ['#148a08', '#0f6b06'] },
  { id: 'punjabi', label: 'Punjabi', gradient: ['#bc5900', '#914500'] },
  { id: 'tamil', label: 'Tamil', gradient: ['#477d95', '#365f72'] },
  { id: 'telugu', label: 'Telugu', gradient: ['#8d67ab', '#6b4e82'] },
  { id: 'pop', label: 'Pop', gradient: ['#1e3264', '#16254a'] },
  { id: 'hiphop', label: 'Hip-Hop', gradient: ['#ba5d07', '#8f4706'] },
  { id: 'rock', label: 'Rock', gradient: ['#e91429', '#b10f1f'] },
  { id: 'indie', label: 'Indie', gradient: ['#608108', '#496306'] },
  { id: 'chill', label: 'Chill', gradient: ['#477d95', '#365f72'] },
  { id: 'party', label: 'Party', gradient: ['#af2896', '#871f73'] },
  { id: 'romance', label: 'Romance', gradient: ['#dc148c', '#a80f6b'] },
  { id: 'workout', label: 'Workout', gradient: ['#777777', '#4d4d4d'] },
  { id: 'sleep', label: 'Sleep', gradient: ['#1e3264', '#16254a'] },
  { id: '2000s', label: '2000s', gradient: ['#503750', '#3a283a'] },
  { id: '90s', label: '90s', gradient: ['#e1118b', '#af0d6c'] },
] as const;

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
            gradient={category.gradient}
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
    fontWeight: '600',
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