// app/(tabs)/chat.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>

      <View style={styles.emptyState}>
        {/* Chat illustration */}
        <View style={styles.iconContainer}>
          <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 3C7.038 3 3 6.59 3 11c0 1.883.736 3.63 2 5.028V21l4.29-2.145A10.181 10.181 0 0012 19c4.962 0 9-3.59 9-8s-4.038-8-9-8z"
              stroke="#535353"
              strokeWidth={1.2}
            />
            <Circle cx="8" cy="11" r="1" fill="#535353" />
            <Circle cx="12" cy="11" r="1" fill="#535353" />
            <Circle cx="16" cy="11" r="1" fill="#535353" />
          </Svg>
        </View>

        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptySubtitle}>
          Connect with friends and share what{'\n'}you're listening to
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