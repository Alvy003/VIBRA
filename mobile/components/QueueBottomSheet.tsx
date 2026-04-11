import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated as RNAnimated, Modal, Pressable, LayoutAnimation, Dimensions, useWindowDimensions } from 'react-native';
import { Music, Trash2, ListPlus, Shuffle, X } from 'lucide-react-native';
import { Swipeable, GestureHandlerRootView, PanGestureHandler, State as GestureState, GestureDetector, Gesture } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, interpolate, Extrapolate, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import TrackPlayer, { State } from 'react-native-track-player';
import { SharpPlay, SharpPause } from './SharpIcons';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { resolveAssetUrl } from '@/lib/url';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Line } from 'react-native-svg';

interface QueueBottomSheetProps {
    visible: boolean;
    onClose: () => void;
}

const DragHandle = () => (
    <Svg width="16" height="16" viewBox="0 0 16 16">
        <Line x1="2" y1="4" x2="14" y2="4" stroke="#4b4b4b" strokeWidth="1.2" strokeLinecap="round" />
        <Line x1="2" y1="8" x2="14" y2="8" stroke="#4b4b4b" strokeWidth="1.2" strokeLinecap="round" />
        <Line x1="2" y1="12" x2="14" y2="12" stroke="#4b4b4b" strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
);

export default function QueueBottomSheet({ visible, onClose }: QueueBottomSheetProps) {
    const {
        queue,
        currentIndex,
        currentTrack,
        removeFromQueue,
        setPlayNext,
        toggleShuffle,
        shuffleMode,
        currentContext,
        playbackState,
        togglePlay,
        isPlaying
    } = usePlayerStore();
    const insets = useSafeAreaInsets();
    const { height: SCREEN_HEIGHT } = useWindowDimensions();
    const [undoItem, setUndoItem] = useState<{ track: any; index: number } | null>(null);
    const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());

    // --- REANIMATED STATE ---
    const SAFE_TOP = Math.max(0, insets.top - 8); // Tighter fit to status bar
    const CONTENT_HEIGHT = SCREEN_HEIGHT - SAFE_TOP;
    const INITIAL_SNAP = CONTENT_HEIGHT * 0.4; // 60% visible
    const FULL_SNAP = 0;

    const translateY = useSharedValue(SCREEN_HEIGHT);
    const contextY = useSharedValue(0);
    const isExpanded = useSharedValue(false);

    const ANIM_CONFIG = {
        duration: 300,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
    };

    // Initial admission animation
    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(INITIAL_SNAP, ANIM_CONFIG);
            isExpanded.value = false;
        } else {
            translateY.value = withTiming(SCREEN_HEIGHT, ANIM_CONFIG);
        }
    }, [visible, SCREEN_HEIGHT, INITIAL_SNAP]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }]
    }));

    const expandSheet = () => {
        'worklet';
        translateY.value = withTiming(FULL_SNAP, ANIM_CONFIG);
        isExpanded.value = true;
    };

    const closeSheet = () => {
        'worklet';
        translateY.value = withTiming(SCREEN_HEIGHT, ANIM_CONFIG, (finished) => {
            if (finished) runOnJS(onClose)();
        });
    };

    const panGesture = Gesture.Pan()
        .activeOffsetY([-10, 10]) // Make it more deliberate
        .onStart(() => {
            contextY.value = translateY.value;
        })
        .onUpdate((event) => {
            const newVal = contextY.value + event.translationY;
            if (newVal >= FULL_SNAP) {
                translateY.value = newVal;
            }
        })
        .onEnd((event) => {
            // Dismissal conditions
            if (translateY.value > INITIAL_SNAP + 80 || (event.velocityY > 600 && translateY.value > INITIAL_SNAP)) {
                closeSheet();
            }
            // Expansion conditions
            else if (translateY.value < INITIAL_SNAP - 40 || event.velocityY < -600) {
                expandSheet();
            }
            // Reset to closest snap point
            else {
                translateY.value = withTiming(isExpanded.value ? FULL_SNAP : INITIAL_SNAP, ANIM_CONFIG);
            }
        });

    const upcomingTracks = useMemo(() => {
        return queue.slice(currentIndex + 1);
    }, [queue, currentIndex]);

    // ═══════════════════════════════════════════
    // SWIPE ACTIONS
    // ═══════════════════════════════════════════
    const renderRightActions = (progress: any, dragX: any, actualIndex: number) => {
        const iconOpacity = dragX.interpolate({
            inputRange: [-80, -40, 0],
            outputRange: [1, 0.5, 0],
            extrapolate: 'clamp',
        });
        const iconTranslateX = dragX.interpolate({
            inputRange: [-100, -50, 0],
            outputRange: [0, 20, 60],
            extrapolate: 'clamp',
        });
        const colorTranslateX = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [0, 100],
            extrapolate: 'clamp',
        });

        return (
            <View style={[styles.swipeActionContainer, { width: 116, paddingRight: 16 }]}>
                <RNAnimated.View
                    style={[
                        styles.swipeColorFill,
                        styles.swipeColorFillRight,
                        { transform: [{ translateX: colorTranslateX }] }
                    ]}
                />
                <RNAnimated.View style={[
                    styles.swipeIconWrap,
                    { opacity: iconOpacity, transform: [{ translateX: iconTranslateX }] }
                ]}>
                    <Trash2 size={24} color="#000" strokeWidth={1.5} />
                </RNAnimated.View>
            </View>
        );
    };

    const renderLeftActions = (progress: any, dragX: any) => {
        const iconOpacity = dragX.interpolate({
            inputRange: [0, 40, 80],
            outputRange: [0, 0.5, 1],
            extrapolate: 'clamp',
        });
        const iconTranslateX = dragX.interpolate({
            inputRange: [0, 50, 100],
            outputRange: [-60, -20, 0],
            extrapolate: 'clamp',
        });
        const colorTranslateX = dragX.interpolate({
            inputRange: [0, 100],
            outputRange: [-100, 0],
            extrapolate: 'clamp',
        });

        return (
            <View style={[styles.swipeActionContainer, { width: 116, paddingLeft: 16 }]}>
                <RNAnimated.View
                    style={[
                        styles.swipeColorFill,
                        styles.swipeColorFillLeft,
                        { transform: [{ translateX: colorTranslateX }] }
                    ]}
                />
                <RNAnimated.View style={[
                    styles.swipeIconWrap,
                    { opacity: iconOpacity, transform: [{ translateX: iconTranslateX }] }
                ]}>
                    <ListPlus size={24} color="#000" strokeWidth={1.5} />
                </RNAnimated.View>
            </View>
        );
    };

    const renderItem = ({ item, getIndex, drag, isActive }: RenderItemParams<any>) => {
        const index = getIndex();
        const actualIndex = currentIndex + 1 + (index || 0);

        return (
            <ScaleDecorator activeScale={1.01}>
                <Swipeable
                    ref={(ref) => {
                        if (ref) swipeableRefs.current.set(actualIndex, ref);
                        else swipeableRefs.current.delete(actualIndex);
                    }}
                    renderRightActions={(p, d) => renderRightActions(p, d, actualIndex)}
                    renderLeftActions={renderLeftActions}
                    onSwipeableOpen={(direction) => {
                        if (direction === 'right') {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            const removedTrack = item;
                            const removedIndex = actualIndex;
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            removeFromQueue(actualIndex);
                            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                            setUndoItem({ track: removedTrack, index: removedIndex });
                            undoTimeoutRef.current = setTimeout(() => {
                                setUndoItem(null);
                            }, 3500);
                        } else if (direction === 'left') {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            swipeableRefs.current.get(actualIndex)?.close();
                            setPlayNext(item);
                        }
                    }}
                    friction={2}
                    leftThreshold={100}
                    rightThreshold={100}
                    overshootLeft={false}
                    overshootRight={false}
                    overshootFriction={8}
                    enabled={!isActive}
                >
                    <View style={[styles.trackItem, isActive && styles.activeDraggingItem]}>
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
                                        <Music size={18} color="#52525b" />
                                    </View>
                                )}
                            </View>
                            <View style={styles.trackInfo}>
                                <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.actions}>
                            <TouchableOpacity
                                onLongPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    drag();
                                }}
                                delayLongPress={150}
                                style={styles.dragHandle}
                                activeOpacity={0.7}
                            >
                                <DragHandle />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Swipeable>
            </ScaleDecorator>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.dismissArea} onPress={onClose} />

                    <Animated.View style={[
                        styles.modalContent,
                        animatedStyle,
                        { height: CONTENT_HEIGHT, bottom: 0 }
                    ]}>
                        {/* HANDLE (with GestureDetector) */}
                        <GestureDetector gesture={panGesture}>
                            <View style={styles.handleContainer}>
                                <View style={styles.handleIndicator} />
                            </View>
                        </GestureDetector>

                        <View style={styles.stickyHeaderContent}>
                            <TouchableOpacity activeOpacity={1} onPress={() => { expandSheet(); }}>
                                <View style={styles.header}>
                                    <Text style={styles.headerTitle}>Queue</Text>
                                </View>
                            </TouchableOpacity>

                            {currentTrack && (
                                <View style={styles.nowPlayingSection}>
                                    {(currentContext?.title || currentTrack?.album || currentTrack?.title) && (
                                        <Text style={styles.playingSubLabel}>
                                            Playing <Text style={styles.playingContextTitle}>
                                                {currentContext?.title || currentTrack?.album || currentTrack?.title}
                                            </Text>
                                        </Text>
                                    )}
                                    <View style={[styles.trackItem, styles.nowPlayingItem]}>
                                        <View style={styles.trackContent}>
                                            <View style={styles.artworkContainer}>
                                                {currentTrack.artwork || (currentTrack as any).imageUrl ? (
                                                    <Image
                                                        source={{ uri: resolveAssetUrl(currentTrack.artwork || (currentTrack as any).imageUrl) }}
                                                        style={styles.artwork}
                                                    />
                                                ) : (
                                                    <View style={styles.artworkPlaceholder}>
                                                        <Music size={18} color="#52525b" />
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

                                            {/* Play Button */}
                                            <TouchableOpacity
                                                onPress={togglePlay}
                                                style={styles.headerPlayButton}
                                                activeOpacity={0.8}
                                            >
                                                {isPlaying ? (
                                                    <SharpPause size={18} color="#000" />
                                                ) : (
                                                    <SharpPlay size={18} color="#000" />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}

                            <View style={styles.nextUpHeader}>
                                {shuffleMode && (
                                    <View style={styles.shuffleHeader}>
                                        <Shuffle size={12} color="#a3a3a3" />
                                        <Text style={styles.shuffleText}>
                                            Shuffling from:                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <DraggableFlatList
                            data={upcomingTracks}
                            keyExtractor={(item: any, index: number) => `queue-${item.id || index}-${index}`}
                            renderItem={renderItem}
                            onDragEnd={({ from, to }) => {
                                const absoluteFrom = currentIndex + 1 + from;
                                const absoluteTo = currentIndex + 1 + to;
                                usePlayerStore.getState().reorderQueue(absoluteFrom, absoluteTo);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            onScroll={(e) => {
                                'worklet';
                                if (e.nativeEvent.contentOffset.y > 5 && translateY.value > FULL_SNAP) {
                                    translateY.value = withTiming(FULL_SNAP, ANIM_CONFIG);
                                    isExpanded.value = true;
                                }
                            }}
                            scrollEventThrottle={8} // Faster throttle for gesture response
                            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>Queue is empty</Text>
                                </View>
                            }
                            activationDistance={15}
                        />
                    </Animated.View>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dismissArea: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: '#0f0f0f',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        // Shadow for premium feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 20,
    },
    handleContainer: {
        paddingVertical: 18, // Increased hit area
        width: '100%',       // Ensure it spans the top
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,          // Ensure it's on top
    },
    handleIndicator: {
        width: 36,
        height: 4.5,
        borderRadius: 2.25,
        backgroundColor: '#3f3f46',
    },
    stickyHeaderContent: {
        paddingHorizontal: 16,
        paddingBottom: 4,
        backgroundColor: '#0f0f0f',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 0,
        paddingBottom: 4, // Reduced for tighter fit
    },
    playingSubLabel: {
        color: '#a3a3a3',
        fontSize: 12,
        fontWeight: '400',
        marginBottom: 8,
        marginTop: 4,
    },
    playingContextTitle: {
        color: 'white',
        fontWeight: '500',
        fontSize: 12,
    },
    headerPlayButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
    },
    closeButton: {
        padding: 4,
    },
    nowPlayingSection: {
        marginBottom: 4,
    },
    nextUpHeader: {
        marginBottom: 0,
    },
    sectionLabel: {
        color: '#a3a3a3',
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    playingFromBold: {
        color: 'white',
        fontWeight: '600',
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 16, // Added padding here instead of list
        backgroundColor: '#0f0f0f',
    },
    nowPlayingItem: {
        marginHorizontal: -6,
        paddingHorizontal: 6,
        borderRadius: 12,
    },
    trackContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    artworkContainer: {
        width: 45,
        height: 45,
        borderRadius: 4,
        backgroundColor: '#1a1a1a',
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
        backgroundColor: '#1a1a1a',
    },
    trackInfo: {
        flex: 1,
        marginRight: 8,
    },
    trackTitle: {
        color: 'white',
        fontSize: 15,
        fontWeight: '500',
    },
    activeTrackTitle: {
        color: '#7B2CF5',
        fontWeight: '600',
    },
    trackArtist: {
        color: '#a3a3a3',
        fontSize: 12,
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dragHandle: {
        padding: 12,
        marginRight: -12,
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingBottom: 60,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyText: {
        color: '#52525b',
        fontSize: 14,
    },
    swipeActionContainer: {
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    swipeColorFill: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '100%',
    },
    swipeColorFillRight: {
        right: 0,
        backgroundColor: '#FF414D', // Premium Red
    },
    swipeColorFillLeft: {
        left: 0,
        backgroundColor: '#7B2CF5', // Vibra Purple
    },
    swipeIconWrap: {
        zIndex: 1,
    },
    activeDraggingItem: {
        backgroundColor: '#1a1a1a', // Solid dark color
        borderRadius: 8,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    shuffleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    shuffleText: {
        color: '#a3a3a3',
        fontSize: 12,
    },
});