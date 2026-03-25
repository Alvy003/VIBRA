// components/QueueBottomSheet.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated as RNAnimated, Platform } from 'react-native';
import { 
    BottomSheetModal, 
    BottomSheetBackdrop,
    BottomSheetView,
    BottomSheetFlatList
} from '@gorhom/bottom-sheet';
import { Music, Trash2, ListPlus, Shuffle } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
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
    <Line x1="2" y1="4" x2="14" y2="4" stroke="#acacacff" strokeWidth="1.5" strokeLinecap="round"/>
    <Line x1="2" y1="8" x2="14" y2="8" stroke="#acacacff" strokeWidth="1.5" strokeLinecap="round"/>
    <Line x1="2" y1="12" x2="14" y2="12" stroke="#acacacff" strokeWidth="1.5" strokeLinecap="round"/>
  </Svg>
);

export default function QueueBottomSheet({ visible, onClose }: QueueBottomSheetProps) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const { queue, currentIndex, currentTrack, removeFromQueue, setPlayNext, toggleShuffle, shuffleMode } = usePlayerStore();
    const insets = useSafeAreaInsets();
    const [undoItem, setUndoItem] = useState<{ track: any; index: number } | null>(null);
    const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());

    useEffect(() => {
        if (visible) {
            bottomSheetModalRef.current?.present();
        } else {
            bottomSheetModalRef.current?.dismiss();
        }
    }, [visible]);

    const snapPoints = useMemo(() => ['65%', '98%'], []);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.7}
            />
        ),
        []
    );

    const upcomingTracks = useMemo(() => {
        return queue.slice(currentIndex + 1);
    }, [queue, currentIndex]);

    // ═══════════════════════════════════════════
    // SWIPE ACTIONS — Color slides in from edge like Spotify
    // ═══════════════════════════════════════════
    const renderRightActions = (progress: any, dragX: any, actualIndex: number) => {
        const scale = dragX.interpolate({
            inputRange: [-120, -80, -40, 0],
            outputRange: [1, 0.75, 0.4, 0],
            extrapolate: 'clamp',
        });
        const iconOpacity = dragX.interpolate({
            inputRange: [-80, -40, 0],
            outputRange: [1, 0.5, 0],
            extrapolate: 'clamp',
        });
        const iconTranslateX = dragX.interpolate({
            inputRange: [-100, -50, 0],
            outputRange: [0, 15, 40],
            extrapolate: 'clamp',
        });
        const colorTranslateX = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [0, 80],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.swipeActionContainer}>
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
                    <Trash2 size={20} color="white" />
                </RNAnimated.View>
            </View>
        );
    };

    const renderLeftActions = (progress: any, dragX: any) => {
        const scale = dragX.interpolate({
            inputRange: [0, 40, 80, 120],
            outputRange: [0, 0.4, 0.75, 1],
            extrapolate: 'clamp',
        });
        const iconOpacity = dragX.interpolate({
            inputRange: [0, 40, 80],
            outputRange: [0, 0.5, 1],
            extrapolate: 'clamp',
        });
        const iconTranslateX = dragX.interpolate({
            inputRange: [0, 50, 100],
            outputRange: [-40, -15, 0],
            extrapolate: 'clamp',
        });
        const colorTranslateX = dragX.interpolate({
            inputRange: [0, 80],
            outputRange: [-80, 0],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.swipeActionContainer}>
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
                    <ListPlus size={20} color="white" />
                </RNAnimated.View>
            </View>
        );
    };

    const renderItem = ({ item, getIndex, drag, isActive }: RenderItemParams<any>) => {
        const index = getIndex();
        const actualIndex = currentIndex + 1 + (index || 0);
        
        return (
            <ScaleDecorator activeScale={1.03}>
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
                        <View style={styles.trackContent}>
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
                        </View>
                        <View style={styles.actions}>
                            <TouchableOpacity 
                                onLongPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    drag();
                                }}
                                delayLongPress={150}
                                style={styles.dragHandle}
                                // Prevent touch from propagating to bottom sheet
                                onPressIn={() => {}}
                            >
                                <DragHandle />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Swipeable>
            </ScaleDecorator>
        );
    };

    const CustomHandle = () => (
        <View style={styles.handleContainer}>
            <View style={styles.handleIndicator} />
        </View>
    );

    // Header component rendered inside the scrollable list
    const ListHeader = useCallback(() => (
        <View>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Queue</Text>
            </View>

            {/* Now Playing — sticky at top visually */}
            {currentTrack && (
                <View style={styles.nowPlayingSection}>
                    <Text style={styles.sectionLabel}>Now Playing</Text>
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
                        </View>
                    </View>
                </View>
            )}

            {/* Next Up label */}
            <View style={styles.nextUpHeader}>
                {shuffleMode && (
                    <View style={styles.shuffleHeader}>
                       <Shuffle size={14} color="#A78BFA" />
                       <Text style={styles.shuffleText}>
                           Shuffling from: <Text style={styles.playingFromBold}>{(currentTrack as any)?.playlistName || 'Queue'}</Text>
                       </Text>
                    </View>
                )}
                <Text style={[styles.sectionLabel, { marginTop: shuffleMode ? 8 : 0 }]}>Next Up</Text>
            </View>
        </View>
    ), [currentTrack, shuffleMode]);

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            onDismiss={onClose}
            backgroundStyle={{ backgroundColor: '#0f0f0f' }}
            handleComponent={CustomHandle}
            enablePanDownToClose
        >
            <BottomSheetView style={[styles.contentContainer, { paddingBottom: insets.bottom + 16 }]}>
                <DraggableFlatList
                    data={upcomingTracks}
                    keyExtractor={(item: any, index: number) => `queue-${item.id || index}-${index}`}
                    renderItem={renderItem}
                    ListHeaderComponent={ListHeader}
                    renderScrollComponent={(props) => <BottomSheetFlatList {...props} />}
                    onDragEnd={({ from, to }) => {
                        const absoluteFrom = currentIndex + 1 + from;
                        const absoluteTo = currentIndex + 1 + to;
                        usePlayerStore.getState().reorderQueue(absoluteFrom, absoluteTo);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Queue is empty</Text>
                        </View>
                    }
                    activationDistance={15}
                />
            </BottomSheetView>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 16,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    nowPlayingSection: {
        marginBottom: 16,
    },
    nextUpHeader: {
        marginBottom: 4,
    },
    sectionLabel: {
        color: '#a3a3a3',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase',
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
        backgroundColor: '#0f0f0f', // Solid bg needed for swipe to look clean
    },
    nowPlayingItem: {
        marginHorizontal: -6,
        paddingHorizontal: 6,
        borderRadius: 10,
        backgroundColor: '#161616',
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
        color: '#A78BFA',
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
        // Ensure handle is easy to tap
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
    handleContainer: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    handleIndicator: {
        width: 36,
        height: 4.5,
        borderRadius: 2.25,
        backgroundColor: '#3f3f46',
    },

    // ═══════════════════════════════════════════
    // Swipe action styles — sliding color from edge
    // ═══════════════════════════════════════════
    swipeActionContainer: {
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: 8,
    },
    swipeColorFill: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '100%',
        borderRadius: 4,
    },
    swipeColorFillRight: {
        right: 0,
        backgroundColor: '#dc2626',
    },
    swipeColorFillLeft: {
        left: 0,
        backgroundColor: '#7c3aed',
    },
    swipeIconWrap: {
        zIndex: 1,
    },

    activeDraggingItem: {
        backgroundColor: 'rgba(167, 139, 250, 0.08)',
        borderRadius: 10,
        paddingHorizontal: 6,
    },
    shuffleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    shuffleText: {
        color: '#a3a3a3',
        fontSize: 13,
    },
});