// components/PremiumCard.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Disc } from 'lucide-react-native';
import { AnimatedCard } from './AnimatedCard';
import { resolveAssetUrl } from '@/lib/url';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.38;

interface PremiumCardProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  onPress: () => void;
  fallbackIcon?: React.ComponentType<any>;
  index?: number;
}

export const PremiumCard: React.FC<PremiumCardProps> = React.memo(({
  title,
  subtitle,
  imageUrl,
  onPress,
  fallbackIcon: FallbackIcon = Disc,
}) => {
  const cardW = CARD_WIDTH;

  const resolvedUri = useMemo(() => resolveAssetUrl(imageUrl), [imageUrl]);

  return (
    <AnimatedCard
      onPress={onPress}
      scaleDown={0.97}
      enableHaptic
      hapticStyle="light"
      style={{ width: cardW, marginRight: 14 }}
    >
      <View style={{ width: cardW, height: cardW, borderRadius: 4, overflow: 'hidden' }}>
        {imageUrl ? (
          <Image
            source={{ uri: resolvedUri, width: 250, height: 250 }}
            contentFit="cover"
            style={styles.cardImage}
            cachePolicy="memory-disk"
            recyclingKey={imageUrl}
            transition={200}
          />
        ) : (
          <View style={styles.fallbackContainer}>
            <FallbackIcon size={36} color="#52525b" />
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.cardSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </AnimatedCard>
  );
}, (prev, next) => (
  prev.title === next.title &&
  prev.imageUrl === next.imageUrl &&
  prev.subtitle === next.subtitle
));

const styles = StyleSheet.create({
  cardImage: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 4,
  },
  cardInfo: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  cardTitle: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#71717a',
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '400',
  },
});