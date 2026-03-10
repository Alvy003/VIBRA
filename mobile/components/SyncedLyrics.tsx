// components/SyncedLyrics.tsx
import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, FlatList } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedReaction,
  runOnJS,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { LyricLine } from '@/lib/lyrics';
import { findActiveLyricIndex } from '@/utils/lyricsSync';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const LYRIC_LINE_HEIGHT = 60;
const SCROLL_OFFSET = SCREEN_HEIGHT * 0.35;

interface SyncedLyricsProps {
  lines: LyricLine[];
  currentPosition: SharedValue<number>;
}

const LyricLineItem = React.memo(({
  item,
  index,
  activeIndex,
}: {
  item: LyricLine;
  index: number;
  activeIndex: SharedValue<number>;
}) => {
  const isActive = useSharedValue(false);

  useAnimatedReaction(
    () => activeIndex.value === index,
    (active) => {
      isActive.value = active;
    },
    [index]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const active = isActive.value;
    return {
      opacity: withTiming(active ? 1 : 0.4, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      }),
      transform: [
        {
          scale: withTiming(active ? 1.05 : 1, {
            duration: 150,
            easing: Easing.out(Easing.cubic),
          }),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.lyricLine, animatedStyle]}>
      <Text style={styles.lyricText}>{item.text}</Text>
    </Animated.View>
  );
});

LyricLineItem.displayName = 'LyricLineItem';

export default function SyncedLyrics({
  lines,
  currentPosition,
}: SyncedLyricsProps) {
  const listRef = useRef<FlatList<LyricLine>>(null);
  
  const activeIndex = useSharedValue(-1);
  const userScrolling = useSharedValue(false);
  const lastUserScrollTime = useSharedValue(0);
  const lastAutoScrollIndex = useSharedValue(-1);

  useAnimatedReaction(
    () => currentPosition.value,
    (position) => {
      const newIndex = findActiveLyricIndex(lines, position);
      
      if (newIndex !== activeIndex.value && newIndex >= 0) {
        activeIndex.value = newIndex;
        
        const timeSinceUserScroll = Date.now() - lastUserScrollTime.value;
        const canAutoScroll = !userScrolling.value && timeSinceUserScroll > 3000;
        
        if (canAutoScroll && newIndex !== lastAutoScrollIndex.value) {
          lastAutoScrollIndex.value = newIndex;
          runOnJS(scrollToIndex)(newIndex);
        }
      }
    },
    [lines]
  );

  const scrollToIndex = useCallback((index: number) => {
    if (listRef.current && index >= 0 && index < lines.length) {
      listRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.4,
      });
    }
  }, [lines.length]);

  const handleScrollBegin = useCallback(() => {
    userScrolling.value = true;
    lastUserScrollTime.value = Date.now();
  }, []);

  const handleScrollEnd = useCallback(() => {
    userScrolling.value = false;
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: LyricLine; index: number }) => (
      <LyricLineItem item={item} index={index} activeIndex={activeIndex} />
    ),
    [activeIndex]
  );

  const keyExtractor = useCallback((item: LyricLine, index: number) => {
    return `${item.time}-${index}`;
  }, []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: LYRIC_LINE_HEIGHT,
      offset: LYRIC_LINE_HEIGHT * index,
      index,
    }),
    []
  );

  const onScrollToIndexFailed = useCallback((info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0.4,
      });
    }, 100);
  }, []);

  if (lines.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No lyrics available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={lines}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollToIndexFailed={onScrollToIndexFailed}
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={11}
        initialNumToRender={15}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    paddingTop: SCROLL_OFFSET,
    paddingBottom: SCREEN_HEIGHT - SCROLL_OFFSET - LYRIC_LINE_HEIGHT,
    paddingHorizontal: 32,
  },
  lyricLine: {
    height: LYRIC_LINE_HEIGHT,
    justifyContent: 'center',
  },
  lyricText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
});