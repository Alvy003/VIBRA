// components/home/ContinueListeningCard.tsx
import Colors from '@/constants/Colors';
import { resolveAssetUrl } from '@/lib/url';
import { Image } from 'expo-image';
import { Music2 } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { AnimatedCard } from '../AnimatedCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.40;

interface ContinueListeningCardProps {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  progress?: number; // 0 to 100
  onPress?: () => void;
  onLongPress?: () => void;
  fallbackIcon?: React.ComponentType<any>;
  isPlaceholder?: boolean;
}

export const ContinueListeningCard: React.FC<ContinueListeningCardProps> = React.memo(({
  title,
  subtitle,
  imageUrl,
  progress = 0,
  onPress,
  onLongPress,
  fallbackIcon: FallbackIcon = Music2,
  isPlaceholder,
}) => {
  const cardW = CARD_WIDTH;

  if (isPlaceholder) {
    return (
      <View style={{ width: cardW, marginRight: 14 }}>
        <View style={{ width: cardW, height: cardW, borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.placeholderBg, justifyContent: 'center', alignItems: 'center' }}>
          <Music2 size={39} color={Colors.placeholderGlyph} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitlePlaceholder} />
          <View style={styles.cardSubtitlePlaceholder} />
        </View>
      </View>
    );
  }

  const resolvedUri = useMemo(() => resolveAssetUrl(imageUrl), [imageUrl]);

  return (
    <AnimatedCard
      onPress={onPress || (() => {})}
      onLongPress={onLongPress}
      scaleDown={0.97}
      enableHaptic={false}
      style={{ width: cardW, marginRight: 14 }}
    >
      <View style={{ width: cardW, height: cardW, borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.placeholderBg }}>
        {imageUrl ? (
          <>
            <Image
              source={{ uri: resolvedUri, width: 250, height: 250 }}
              contentFit="cover"
              style={styles.cardImage}
              cachePolicy="memory-disk"
              recyclingKey={imageUrl}
              transition={120}
              placeholder={Colors.placeholderBg}
            />
            <View style={styles.imageOverlay} />
          </>
        ) : (
          <View style={styles.fallbackContainer}>
            <FallbackIcon size={50} color={Colors.placeholderGlyph} />
          </View>
        )}

        {/* Subtle Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
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
  prev.subtitle === next.subtitle &&
  prev.progress === next.progress &&
  prev.isPlaceholder === next.isPlaceholder
));

ContinueListeningCard.displayName = 'ContinueListeningCard';

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
    backgroundColor: Colors.placeholderBg,
    borderRadius: 4,
  },
  cardInfo: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '400',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.blackAlpha12,
    zIndex: 1,
  },
  progressBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  cardTitlePlaceholder: {
    width: '75%',
    height: 12,
    backgroundColor: Colors.placeholderText,
    borderRadius: 4,
    marginTop: 4,
  },
  cardSubtitlePlaceholder: {
    width: '50%',
    height: 10,
    backgroundColor: Colors.placeholderSubtitleText,
    borderRadius: 3,
    marginTop: 6,
  },
});
