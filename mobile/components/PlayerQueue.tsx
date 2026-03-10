// components/PlayerQueue.tsx
import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '@/stores/usePlayerStore';
import TrackPlayer from 'react-native-track-player';
import * as Haptics from 'expo-haptics';
import { Play, GripVertical } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65;
const DISMISS_THRESHOLD = 100;

const TIMING_CONFIG = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
};

interface PlayerQueueProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Queue Item ───
const QueueItem = React.memo(({
  track,
  index,
  isCurrentTrack,
  onPress,
}: {
  track: any;
  index: number;
  isCurrentTrack: boolean;
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          queueStyles.item,
          isCurrentTrack && queueStyles.currentItem,
          animatedStyle,
        ]}
      >
        <View style={queueStyles.dragHandle}>
          <GripVertical size={18} color="rgba(255,255,255,0.3)" />
        </View>

        <View style={queueStyles.artworkContainer}>
          <Image
            source={{ uri: track.artwork, width: 100, height: 100 }}
            style={queueStyles.artwork}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
          {isCurrentTrack && (
            <View style={queueStyles.playingIndicator}>
              <Play size={12} color="#fff" fill="#fff" />
            </View>
          )}
        </View>

        <View style={queueStyles.info}>
          <Text
            style={[
              queueStyles.title,
              isCurrentTrack && queueStyles.currentTitle,
            ]}
            numberOfLines={1}
          >
            {track.title}
          </Text>
          <Text style={queueStyles.artist} numberOfLines={1}>
            {track.artist}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

const queueStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    borderRadius: 12,
  },
  currentItem: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
  },
  dragHandle: {
    marginRight: 12,
  },
  artworkContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  playingIndicator: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  currentTitle: {
    color: '#a78bfa',
  },
  artist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
});

// ─── Main Queue Component ───
export default function PlayerQueue({ visible, onClose }: PlayerQueueProps) {
  const insets = useSafeAreaInsets();
  const { queue, currentTrack, currentIndex } = usePlayerStore();

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, TIMING_CONFIG);
      backdropOpacity.value = withTiming(1, TIMING_CONFIG);
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, TIMING_CONFIG);
      backdropOpacity.value = withTiming(0, TIMING_CONFIG);
    }
  }, [visible]);

  const dismissGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        backdropOpacity.value = 1 - (event.translationY / SHEET_HEIGHT) * 0.5;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > 800) {
        translateY.value = withTiming(SHEET_HEIGHT, TIMING_CONFIG);
        backdropOpacity.value = withTiming(0, TIMING_CONFIG);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, TIMING_CONFIG);
        backdropOpacity.value = withTiming(1, TIMING_CONFIG);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handlePlayTrack = useCallback(async (track: any, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await TrackPlayer.skip(index);
      await TrackPlayer.play();
    } catch (error) {
      console.error('Failed to skip to track:', error);
    }
  }, []);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <QueueItem
      track={item}
      index={index}
      isCurrentTrack={index === currentIndex}
      onPress={() => handlePlayTrack(item, index)}
    />
  ), [currentIndex, handlePlayTrack]);

  const keyExtractor = useCallback((item: any, index: number) =>
    item.id || item._id || String(index), []);

  if (!visible) return null;

  const upNext = queue.slice(currentIndex + 1);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      {/* Sheet */}
      <GestureDetector gesture={dismissGesture}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.sheetOverlay} />

          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Queue</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
            </TouchableOpacity>
          </View>

          {/* Current Track */}
          {currentTrack && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Now Playing</Text>
              <View style={styles.currentTrackContainer}>
                <Image
                  source={{ uri: currentTrack.artwork, width: 150, height: 150 }}
                  style={styles.currentArtwork}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
                <View style={styles.currentInfo}>
                  <Text style={styles.currentTitle} numberOfLines={1}>
                    {currentTrack.title}
                  </Text>
                  <Text style={styles.currentArtist} numberOfLines={1}>
                    {currentTrack.artist}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Up Next */}
          <View style={styles.queueSection}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>
              Up Next • {upNext.length} tracks
            </Text>
            <FlatList
              data={upNext}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              initialNumToRender={8}
              maxToRenderPerBatch={5}
              windowSize={5}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    zIndex: 201,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24,24,27,0.85)',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  currentTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  currentArtwork: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  currentInfo: {
    flex: 1,
    marginLeft: 14,
  },
  currentTitle: {
    color: '#a78bfa',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  currentArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
  },
  queueSection: {
    flex: 1,
    paddingTop: 16,
  },
});