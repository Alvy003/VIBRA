// components/PlainLyrics.tsx
import React from 'react';
import { StyleSheet, Text, ScrollView, View } from 'react-native';

interface PlainLyricsProps {
  text: string;
}

export default function PlainLyrics({ text }: PlainLyricsProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Unsynced Lyrics</Text>
        </View>
        <Text style={styles.text}>{text}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 100,
  },
  labelContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  text: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '400',
    textAlign: 'center',
  },
});