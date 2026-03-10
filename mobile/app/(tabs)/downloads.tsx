// app/(tabs)/downloads.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function DownloadsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Downloads</Text>
      </View>

      <View style={styles.emptyState}>
        {/* Download illustration */}
        <View style={styles.iconContainer}>
          <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 3v12m0 0l4.5-4.5M12 15l-4.5-4.5"
              stroke="#535353"
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M20 17v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2"
              stroke="#535353"
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        <Text style={styles.emptyTitle}>No downloads</Text>
        <Text style={styles.emptySubtitle}>
          Download music to listen offline{'\n'}without using data
        </Text>

        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#B3B3B3',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  comingSoonBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 500,
    backgroundColor: '#282828',
    borderWidth: 1,
    borderColor: '#333',
  },
  comingSoonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B3B3B3',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});