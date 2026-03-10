// components/PremiumCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Disc } from 'lucide-react-native';
import { AnimatedCard } from './AnimatedCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.38;
const CARD_WIDTH_LG = SCREEN_WIDTH * 0.42;

interface PremiumCardProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  onPress: () => void;
  size?: 'default' | 'large';
  fallbackIcon?: React.ComponentType<any>;
  index?: number;
}

export const PremiumCard: React.FC<PremiumCardProps> = React.memo(({
  title,
  subtitle,
  imageUrl,
  onPress,
  size = 'default',
  fallbackIcon: FallbackIcon = Disc,
}) => {
  const cardW = size === 'large' ? CARD_WIDTH_LG : CARD_WIDTH;

  return (
    <AnimatedCard
      onPress={onPress}
      scaleDown={0.97}
      style={{ width: cardW, marginRight: 14 }}
    >
      <View style={[styles.cardContainer, { borderRadius: 18 }]}>
        <View style={{ width: cardW, height: cardW, position: 'relative' }}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl, width: 250, height: 250 }}
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
      </View>
    </AnimatedCard>
  );
}, (prev, next) => (
  prev.title === next.title &&
  prev.imageUrl === next.imageUrl &&
  prev.subtitle === next.subtitle
));

const styles = StyleSheet.create({
  cardContainer: {
    overflow: 'hidden',
    backgroundColor: '#18181b',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#71717a',
    fontSize: 11.5,
    marginTop: 1.5,
    fontWeight: '500',
  },
});