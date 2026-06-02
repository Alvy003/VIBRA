// components/home/SectionHeader.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, RADIUS, TIME_GRADIENTS, getTimeOfDay } from '@/constants/design';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  showSeeAll?: boolean;
  useTimeAccent?: boolean;
  accentColor?: string;
}

export const SectionHeader = React.memo(({
  title,
  subtitle,
  onSeeAll,
  showSeeAll = false,
  useTimeAccent = false,
  accentColor,
}: SectionHeaderProps) => {
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  
  const finalAccentColor = accentColor || 
    (useTimeAccent ? TIME_GRADIENTS[timeOfDay].accent : COLORS.textMuted);

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      </View>

      {showSeeAll && onSeeAll && (
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={onSeeAll}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllText, { color: finalAccentColor }]}>
            See all
          </Text>
          <ChevronRight size={14} color={finalAccentColor} />
        </TouchableOpacity>
      )}
    </View>
  );
});

SectionHeader.displayName = 'SectionHeader';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  accentLine: {
    width: 3,
    height: 20,
    borderRadius: RADIUS.xs,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
});