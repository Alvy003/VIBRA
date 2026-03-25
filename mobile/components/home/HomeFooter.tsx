// components/home/HomeFooter.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Music2 } from 'lucide-react-native';
import { COLORS, TIME_GRADIENTS, getTimeOfDay } from '@/constants/design';

export const HomeFooter = React.memo(() => {
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const accentColor = TIME_GRADIENTS[timeOfDay].accent;

  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <View style={styles.content}>
        <View style={[styles.iconContainer, { borderColor: accentColor }]}>
          <Music2 size={14} color={accentColor} />
        </View>
        <Text style={styles.text}>Made for music lovers</Text>
      </View>
    </View>
  );
});

HomeFooter.displayName = 'HomeFooter';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 20,
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  text: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
});