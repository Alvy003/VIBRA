// components/QueueBottomSheet.tsx
import React, { useMemo, useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, LayoutAnimation } from 'react-native';
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

interface QueueBottomSheetProps {
    visible: boolean;
    onClose: () => void;
}

const DragHandle = memo(() => (
    <Svg width="16" height="16" viewBox="0 0 16 16">
        <Line x1="2" y1="4" x2="14" y2="4" stroke={Colors.textSecondary} strokeWidth="1.2" strokeLinecap="round" />
        <Line x1="2" y1="8" x2="14" y2="8" stroke={Colors.textSecondary} strokeWidth="1.2" strokeLinecap="round" />
        <Line x1="2" y1="12" x2="14" y2="12" stroke={Colors.textSecondary} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
));

const TrackItem = memo(({ item, actualIndex, isCurrent, drag, onRemove, onPlayNext }: any) => {
    const swipeableRef = useRef<Swipeable>(null);

    return (
        <ScaleDecorator activeScale={1.02}>
            <Swipeable
                ref={swipeableRef}
                activeOffsetX={[-30, 30]}
                failOffsetY={[-10, 10]}
                rightThreshold={150}
                leftThreshold={150}
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
                onSwipeableOpen={(direction) => {
                    if (direction === 'right') {
                        onRemove(actualIndex);
                    } else if (direction === 'left') {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        swipeableRef.current?.close();
                        onPlayNext(item);
                    }
                }}
            >
                <View style={styles.trackItem}>
                    <TouchableOpacity
                        style={styles.trackContent}
                        onPress={async () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            await TrackPlayer.skip(actualIndex);
                            await TrackPlayer.play();
                        }}
                        activeOpacity={0.6}
                    >
                        <View style={styles.artworkContainer}>
                            {item.artwork || item.imageUrl ? (
                                <Image
                                    source={{ uri: resolveAssetUrl(item.artwork || item.imageUrl) }}
                                    style={styles.artwork}
                                />
                            ) : (
                                <View style={styles.artworkPlaceholder}>
                                    <Music size={18} color={Colors.textMuted} />
                                </View>
                            )}
                        </View>
                        <View style={styles.trackInfo}>
                            <Text style={[styles.trackTitle, isCurrent && styles.activeTrackTitle]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onLongPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            drag();
                        }}
                        delayLongPress={100}
                        style={styles.dragHandle}
                    >
                        <DragHandle />
                    </TouchableOpacity>
                </View>
            </Swipeable>
        </ScaleDecorator>
    );
});

export default function QueueBottomSheet({ visible, onClose }: QueueBottomSheetProps) {
    const {
        queue,
        currentIndex,
        currentTrack,
        removeFromQueue,
        setPlayNext,
        currentContext,
        togglePlay,
        isPlaying,
        shuffleMode
    } = usePlayerStore();
    
    const insets = useSafeAreaInsets();
    const bottomSheetRef = useRef<any>(null);
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Initial derivation from store
    const storeUpcomingTracks = useMemo(() => {
        return queue.slice(currentIndex + 1);
    }, [queue, currentIndex]);

    // Local optimistic state for instant UI feedback
    const [localTracks, setLocalTracks] = React.useState(storeUpcomingTracks);

    // Sync local state when store state changes (if we're not enthusiastically animating)
    React.useEffect(() => {
        setLocalTracks(storeUpcomingTracks);
    }, [storeUpcomingTracks]);

    const handleRemoveTrack = useCallback((index: number) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        
        // Optimistic UI update
        const storeIndexOffset = currentIndex + 1;
        const localIndex = index - storeIndexOffset;
        if (localIndex >= 0) {
            setLocalTracks(prev => prev.filter((_, i) => i !== localIndex));
        }

        // Defer heavy store update so UI remains instant
        setTimeout(() => {
            removeFromQueue(index);
        }, 50);
    }, [removeFromQueue, currentIndex]);

    const renderItem = useCallback(({ item, getIndex, drag, isActive }: RenderItemParams<any>) => {
        const index = getIndex();
        const actualIndex = currentIndex + 1 + (index || 0);
        return (
            <TrackItem
                item={item}
                actualIndex={actualIndex}
                isCurrent={false}
                drag={drag}
                onRemove={handleRemoveTrack}
                onPlayNext={setPlayNext}
            />
        );
    }, [currentIndex, handleRemoveTrack, setPlayNext]);

    const Header = (
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
    );

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
                    usePlayerStore.getState().reorderQueue(absoluteFrom, absoluteTo);
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
