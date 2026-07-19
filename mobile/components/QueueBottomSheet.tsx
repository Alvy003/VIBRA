// components/QueueBottomSheet.tsx
import React, { useMemo, useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { Image } from 'expo-image';
import { Music, Trash2, Shuffle } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import TrackPlayer from 'react-native-track-player';
import { SharpPause, SharpPlay, SharpAddQueue } from './SharpIcons';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { resolveAssetUrl } from '@/lib/url';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Line } from 'react-native-svg';
import BottomSheet from './BottomSheet';
import Colors from '@/constants/Colors';

const DragHandle = memo(() => (
    <Svg width="16" height="16" viewBox="0 0 16 16">
        <Line x1="2" y1="4" x2="14" y2="4" stroke={Colors.textSecondary} strokeWidth="1.2" strokeLinecap="round" />
        <Line x1="2" y1="8" x2="14" y2="8" stroke={Colors.textSecondary} strokeWidth="1.2" strokeLinecap="round" />
        <Line x1="2" y1="12" x2="14" y2="12" stroke={Colors.textSecondary} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
));

const TrackItem = memo(({ item, getIndex, drag, onRemove, onPlayNext }: any) => {
    const swipeableRef = useRef<Swipeable>(null);

    const handlePress = useCallback(async () => {
        const index = getIndex();
        const actualIndex = usePlayerStore.getState().currentIndex + 1 + (index || 0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await TrackPlayer.skip(actualIndex);
        await TrackPlayer.play();
    }, [getIndex]);

    const handleSwipeOpen = useCallback((direction: string) => {
        const index = getIndex();
        const actualIndex = usePlayerStore.getState().currentIndex + 1 + (index || 0);
        if (direction === 'right') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            swipeableRef.current?.close();
            // Defer actual removal to let swipe closing animation finish cleanly
            setTimeout(() => {
                onRemove(actualIndex);
            }, 200);
        } else if (direction === 'left') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            swipeableRef.current?.close();
            // Defer non-critical store mutation/TrackPlayer sync to prevent UI stutter during swipe close
            setTimeout(() => {
                onPlayNext(item);
            }, 200);
        }
    }, [getIndex, item, onRemove, onPlayNext]);

    return (
        <ScaleDecorator activeScale={1.02}>
            <Swipeable
                ref={swipeableRef}
                activeOffsetX={[-10, 10]}
                failOffsetY={[-5, 5]}
                rightThreshold={80}
                leftThreshold={80}
                overshootRight={false}
                overshootLeft={false}
                friction={1}
                renderRightActions={() => (
                    <View style={[styles.swipeActionContainer, styles.swipeRight]}>
                        <Trash2 size={24} color={Colors.background} />
                    </View>
                )}
                renderLeftActions={() => (
                    <View style={[styles.swipeActionContainer, styles.swipeLeft]}>
                        <SharpAddQueue size={24} color={Colors.background} />
                    </View>
                )}
                onSwipeableOpen={handleSwipeOpen}
            >
                <View style={styles.trackItem}>
                    <TouchableOpacity
                        style={styles.trackContent}
                        onPress={handlePress}
                        activeOpacity={0.6}
                    >
                        <View style={styles.artworkContainer}>
                            {item.artwork || item.imageUrl ? (
                                <Image
                                    source={{ uri: resolveAssetUrl(item.artwork || item.imageUrl) }}
                                    style={styles.artwork}
                                    transition={150}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={styles.artworkPlaceholder}>
                                    <Music size={18} color={Colors.textMuted} />
                                </View>
                            )}
                        </View>
                        <View style={styles.trackInfo}>
                            <Text style={styles.trackTitle} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPressIn={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            drag();
                        }}
                        style={styles.dragHandle}
                        activeOpacity={0.8}
                    >
                        <DragHandle />
                    </TouchableOpacity>
                </View>
            </Swipeable>
        </ScaleDecorator>
    );
});

import { usePlayerUIStore } from '@/stores/usePlayerUIStore';

export default function QueueBottomSheet() {
    const visible = usePlayerUIStore(state => state.isQueueVisible);
    const setQueueVisible = usePlayerUIStore(state => state.setQueueVisible);
    const onClose = useCallback(() => setQueueVisible(false), [setQueueVisible]);

    const queue = usePlayerStore(state => state.queue);
    const currentIndex = usePlayerStore(state => state.currentIndex);
    const currentTrack = usePlayerStore(state => state.currentTrack);
    const removeFromQueue = usePlayerStore(state => state.removeFromQueue);
    const setPlayNext = usePlayerStore(state => state.setPlayNext);
    const currentContext = usePlayerStore(state => state.currentContext);
    const togglePlay = usePlayerStore(state => state.togglePlay);
    const isPlaying = usePlayerStore(state => state.isPlaying);
    const shuffleMode = usePlayerStore(state => state.shuffleMode);
    
    const insets = useSafeAreaInsets();
    const bottomSheetRef = useRef<any>(null);
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Initial derivation from store
    const storeUpcomingTracks = useMemo(() => {
        return queue.slice(currentIndex + 1);
    }, [queue, currentIndex]);

    // Local optimistic state for instant UI feedback
    const [localTracks, setLocalTracks] = React.useState(storeUpcomingTracks);

    // Sync local state when store state changes
    React.useEffect(() => {
        setLocalTracks(storeUpcomingTracks);
    }, [storeUpcomingTracks]);

    const handleRemoveTrack = useCallback((index: number) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        
        // Optimistic UI update
        const state = usePlayerStore.getState();
        const storeIndexOffset = state.currentIndex + 1;
        const localIndex = index - storeIndexOffset;
        if (localIndex >= 0) {
            setLocalTracks(prev => prev.filter((_, i) => i !== localIndex));
        }

        // Defer heavy store update so UI remains instant
        setTimeout(() => {
            state.removeFromQueue(index);
        }, 50);
    }, []);

    const renderItem = useCallback(({ item, getIndex, drag }: RenderItemParams<any>) => {
        return (
            <TrackItem
                item={item}
                getIndex={getIndex}
                drag={drag}
                onRemove={handleRemoveTrack}
                onPlayNext={setPlayNext}
            />
        );
    }, [handleRemoveTrack, setPlayNext]);

    const Header = useMemo(() => (
        <View style={styles.headerContainer}>
          <View style={{paddingBottom: 10}}>
            <View style={styles.headerTop}>
                <Text style={styles.headerTitle}>Queue</Text>
            </View>

            {currentTrack && (
                <View style={styles.nowPlayingSection}>
                    <Text style={styles.playingSubLabel}>
                        Playing{' '}
                        <Text style={styles.playingContextTitle}>
                            {currentContext?.title || currentTrack?.album || 'Current Session'}
                        </Text>
                    </Text>
                    
                    <View>
                        <View style={styles.nowPlayingContent}>
                            <View style={styles.artworkContainer}>
                                {currentTrack.artwork || (currentTrack as any).imageUrl ? (
                                    <Image
                                        source={{ uri: resolveAssetUrl(currentTrack.artwork || (currentTrack as any).imageUrl) }}
                                        style={styles.artwork}
                                        transition={150}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View style={styles.artworkPlaceholder}>
                                        <Music size={18} color={Colors.textMuted} />
                                    </View>
                                )}
                            </View>
                            <View style={styles.trackInfo}>
                                <Text style={[styles.trackTitle, styles.activeTrackTitle]} numberOfLines={1}>
                                    {currentTrack.title}
                                </Text>
                                <Text style={styles.trackArtist} numberOfLines={1}>
                                    {currentTrack.artist}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={togglePlay}
                                style={styles.playButton}
                            >
                                {isPlaying ? (
                                    <SharpPause size={18} color={Colors.background} />
                                ) : (
                                    <SharpPlay size={18} color={Colors.background} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
            </View>

            {shuffleMode && (
                <View style={styles.shuffleContainer}>
                    <Shuffle size={12} color={Colors.textSecondary} />
                    <Text style={styles.shuffleText}>Shuffling from:</Text>
                </View>
            )}
        </View>
    ), [currentTrack, currentContext, isPlaying, shuffleMode, togglePlay]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            isOpen={visible}
            onClose={onClose}
            snapPoints={['65%', '96.5%']}
            header={Header}
            showHandle
            onIndexChange={(index) => setIsExpanded(index === 1)}
            enablePanDownToClose={!isExpanded}
            enableContentPanningGesture
        >
            <DraggableFlatList
                data={localTracks}
                keyExtractor={(item: any, index: number) => `queue-${item.id || item.externalId || index}`}
                renderItem={renderItem}
                scrollEnabled={isExpanded} // Bridge: Only scroll list when sheet is expanded
                onDragEnd={({ data, from, to }) => {
                    // Optimistic Data update
                    setLocalTracks(data);

                    const absoluteFrom = currentIndex + 1 + from;
                    const absoluteTo = currentIndex + 1 + to;

                    // Defer heavy store update so UI drop animation completes instantly
                    setTimeout(() => {
                        usePlayerStore.getState().reorderQueue(absoluteFrom, absoluteTo);
                    }, 100);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Queue is empty</Text>
                    </View>
                }
                activationDistance={isExpanded ? 10 : 999}
                removeClippedSubviews={true}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                getItemLayout={(data, index) => ({
                    length: 68,
                    offset: 68 * index,
                    index,
                })}
            />
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        paddingHorizontal: 0,
    },
    headerTop: {
        paddingVertical: 0,
    },
    headerTitle: {
        color: Colors.textPrimary,
        fontSize: 18,
        fontWeight: '800',
    },
    nowPlayingSection: {
        paddingVertical: 2,
    },
    playingSubLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginBottom: 15,
    },
    playingContextTitle: {
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    nowPlayingContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: Colors.surface,
    },
    trackContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    artworkContainer: {
        width: 48,
        height: 48,
        borderRadius: 4,
        backgroundColor: Colors.border,
        overflow: 'hidden',
        marginRight: 12,
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    artworkPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    trackTitle: {
        color: Colors.textPrimary,
        fontSize: 15,
        fontWeight: '400',
    },
    activeTrackTitle: {
        color: Colors.accent,
    },
    trackArtist: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    playButton: {
        width: 35,
        height: 35,
        borderRadius: 20,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 30,
    },
    dragHandle: {
        padding: 12,
        marginLeft: 30, // More space between metadata and handle
        marginRight: -5,
    },
    shuffleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingBottom: 10,
    },
    shuffleText: {
        color: Colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    listContent: {
        paddingTop: 0,
    },
    swipeActionContainer: {
        width: 150,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    swipeRight: {
        backgroundColor: Colors.error,
    },
    swipeLeft: {
        backgroundColor: Colors.accent,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyText: {
        color: Colors.textMuted,
        fontSize: 14,
    },
});
