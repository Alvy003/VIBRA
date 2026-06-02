// components/search/AudioSearchCTA.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AudioLines, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SEARCH_COLORS, RADIUS } from '@/constants/design';
import Colors from '@/constants/Colors';

interface AudioSearchCTAProps {
  onPress: () => void;
}

export const AudioSearchCTA = React.memo(({ onPress }: AudioSearchCTAProps) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(100).springify()}
      style={styles.container}
    >
      <TouchableOpacity 
        onPress={handlePress}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        <LinearGradient
          colors={[Colors.primaryAlpha15, Colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconBg}>
              <AudioLines size={24} color={Colors.primaryDark} />
            </View>
            <View style={styles.sparkle}>
              <Sparkles size={14} color="#f59e0b" fill="#f59e0b" />
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Identify Song</Text>
            <Text style={styles.subtitle}>
              Hold your phone near music to find it instantly
            </Text>
          </View>

          <View style={styles.arrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

AudioSearchCTA.displayName = 'AudioSearchCTA';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  touchable: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primaryAlpha15,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    position: 'relative',
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryAlpha15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  content: {
    flex: 1,
  },
  title: {
    color: SEARCH_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: SEARCH_COLORS.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryAlpha15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: Colors.primaryDark,
    fontSize: 18,
    fontWeight: '600',
  },
});