import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/stores/useToastStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import Colors from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 52;
const BOTTOM_PLAYER_HEIGHT = 57;

export const GlobalToast: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { activeToast, hideToast } = useToastStore();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const {
    isPlayerExpanded,
    isQueueVisible,
    isSongOptionsVisible,
    isArtistModalVisible,
    isLyricsModalVisible,
  } = usePlayerUIStore();

  const isPlayerVisible = !!currentTrack && !isPlayerExpanded;

  // Layering guard: Hide the toast if any full-screen or modal sheets are active
  const shouldHideToast =
    isPlayerExpanded ||
    isQueueVisible ||
    isSongOptionsVisible ||
    isArtistModalVisible ||
    isLyricsModalVisible;

  const isVisible = !!activeToast && !shouldHideToast;

  const [shouldRender, setShouldRender] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(16, { duration: 150 }, (finished) => {
        if (finished) {
          runOnJS(setShouldRender)(false);
        }
      });
    }
  }, [isVisible]);

  // Calculate dynamic bottom offset positioning
  const bottomOffset =
    insets.bottom +
    TAB_BAR_HEIGHT +
    (isPlayerVisible ? BOTTOM_PLAYER_HEIGHT + 12 : 12);

  const handleActionPress = () => {
    if (activeToast?.action?.onPress) {
      activeToast.action.onPress();
    }
    hideToast();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    bottom: bottomOffset,
  }));

  if (!shouldRender || !activeToast) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.toastContent}>
        {/* Liked Songs Premium Gradient Tile */}
        {activeToast.iconType === 'heart' && (
          <LinearGradient
            colors={[Colors.primaryDark, Colors.accent]}
            style={styles.iconBox}
          >
            <Heart size={16} color="white" fill="white" />
          </LinearGradient>
        )}

        <Text style={styles.message} numberOfLines={2}>
          {activeToast.message}
        </Text>

        {activeToast.action && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleActionPress}
            activeOpacity={0.7}
          >
            <Text style={styles.actionLabel}>{activeToast.action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 9999, // Layer on top of bottom player and tabs, but rendered before modals to sit beneath them
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: '#191414',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  actionBtn: {
    marginLeft: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionLabel: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
