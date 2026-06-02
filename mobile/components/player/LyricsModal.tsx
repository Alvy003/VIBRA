import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, LocateFixed } from 'lucide-react-native';
import { SharpPause, SharpPlay} from '../SharpIcons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';

import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLyricsStore } from '@/stores/useLyricsStore';
import { useColorStore } from '@/stores/useColorStore';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import { LyricLine } from '@/lib/lyrics';

import ProgressBar from '../ProgressBar';
import LyricsTimeDisplay from '../LyricsTimeDisplay';
import ControlButton from '../ControlButton';

// ✅ OPTIMIZED: Only subscribe to the specific index, not the whole state
const ImmersiveLyricLine = React.memo(({ 
    line, 
    index, 
    activeIndex,
    onPress 
}: { 
    line: LyricLine; 
    index: number;
    activeIndex: number;
    onPress: (index: number, time: number) => void;
}) => {
    const isActive = activeIndex === index;
    const isPast = activeIndex > index;

    return (
        <TouchableOpacity 
            style={styles.lyricLineWrapper}
            onPress={() => onPress(index, line.time)}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.lyricText,
                isActive && styles.lyricTextActive,
                isPast && styles.lyricTextPast,
                !isActive && !isPast && styles.lyricTextInactive
            ]}>
                {line.text}
            </Text>
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => {
    // ✅ Custom comparison: only re-render if this line's state actually changed
    const wasActive = prevProps.activeIndex === prevProps.index;
    const isActive = nextProps.activeIndex === nextProps.index;
    const wasPast = prevProps.activeIndex > prevProps.index;
    const isPast = nextProps.activeIndex > nextProps.index;
    
    return wasActive === isActive && wasPast === isPast && prevProps.line.text === nextProps.line.text;
});

const LyricsLoadingSkeleton = React.memo(() => (
    <View style={styles.noLyricsContainer}>
        <Text style={styles.noLyricsText}>Loading lyrics...</Text>
    </View>
));

const NoLyricsView = React.memo(() => (
    <View style={styles.noLyricsContainer}>
        <Text style={styles.noLyricsText}>No lyrics available.</Text>
    </View>
));

function darkenColor(hex: string, factor: number = 0.5): string {
    if (!hex) return '#000000';
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    const newR = Math.floor(r * (1 - factor));
    const newG = Math.floor(g * (1 - factor));
    const newB = Math.floor(b * (1 - factor));

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as any;

// ✅ OPTIMIZED: Extract constants
const LINE_HEIGHT = 80;
const SCROLL_OFFSET_MULTIPLIER = 0.25;
const AUTO_HIDE_SYNC_DELAY = 5000;

const LyricsModal = React.memo(() => {
    const insets = useSafeAreaInsets();

    const currentTrack = usePlayerStore((s) => s.currentTrack);
    const { isPlaying, togglePlay, playNext, playPrevious } = usePlayerStore();
    const getLyrics = useLyricsStore((s) => s.getLyrics);
    const getTrackColors = useColorStore((s) => s.getTrackColors);

    const isLyricsModalVisible = usePlayerUIStore((s) => s.isLyricsModalVisible);
    const setLyricsModalVisible = usePlayerUIStore((s) => s.setLyricsModalVisible);
    
    // ✅ OPTIMIZED: Only subscribe to activeIndex, not the whole state
    const activeIndex = usePlayerUIStore((s) => s.activeIndex);
    
    const lyricsState = currentTrack ? getLyrics(currentTrack.id) : { status: 'idle' };
    const trackColors = currentTrack ? getTrackColors(currentTrack.id) : ({} as any);

    const hasSyncedLyrics = lyricsState.status === 'synced' && 'lines' in lyricsState;
    const hasPlainLyrics = lyricsState.status === 'plain' && 'text' in lyricsState;
    
    // ✅ OPTIMIZED: Memoize with proper dependencies
    const syncedLines = useMemo(() => {
        if (!hasSyncedLyrics) return [];
        return (lyricsState as any).lines as LyricLine[];
    }, [hasSyncedLyrics, lyricsState]);

    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [showSyncButton, setShowSyncButton] = useState(false);
    
    const syncButtonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isUserScrolling = useRef(false);
    const lastScrolledIndex = useRef(-1);
    const flashListRef = useRef<any>(null);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ✅ OPTIMIZED: Debounced scroll function
    const scrollToIndex = useCallback((idx: number) => {
        if (!autoScrollEnabled || idx < 0 || idx === lastScrolledIndex.current) return;
        
        // Clear any pending scroll
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Debounce scroll to prevent multiple rapid scrolls
        scrollTimeoutRef.current = setTimeout(() => {
            if (!flashListRef.current) return;
            
            lastScrolledIndex.current = idx;
            const targetScroll = Math.max(0, (idx * LINE_HEIGHT) - (SCREEN_HEIGHT * SCROLL_OFFSET_MULTIPLIER));

            flashListRef.current.scrollToOffset({
                offset: targetScroll,
                animated: true
            });
        }, 50); // Small debounce to batch rapid updates
    }, [autoScrollEnabled]);

    // ✅ OPTIMIZED: Effect with proper cleanup
    useEffect(() => {
        if (!isLyricsModalVisible || !hasSyncedLyrics) return;
        
        scrollToIndex(activeIndex);
        
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [activeIndex, isLyricsModalVisible, hasSyncedLyrics, scrollToIndex]);

    const handleLyricsScrollBegin = useCallback(() => {
        if (autoScrollEnabled) setAutoScrollEnabled(false);
        isUserScrolling.current = true;
        setShowSyncButton(true);

        if (syncButtonTimerRef.current) clearTimeout(syncButtonTimerRef.current);
    }, [autoScrollEnabled]);

    const handleLyricsScrollEnd = useCallback(() => {
        isUserScrolling.current = false;
        syncButtonTimerRef.current = setTimeout(() => {
            setShowSyncButton(false);
        }, AUTO_HIDE_SYNC_DELAY);
    }, []);

    const handleSyncPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAutoScrollEnabled(true);
        setShowSyncButton(false);

        if (activeIndex >= 0 && flashListRef.current) {
            const targetScroll = Math.max(0, (activeIndex * LINE_HEIGHT) - (SCREEN_HEIGHT * SCROLL_OFFSET_MULTIPLIER));
            flashListRef.current.scrollToOffset({
                offset: targetScroll,
                animated: true,
            });
        }
    }, [activeIndex]);

    // ✅ NEW: Handle tap on lyric line to seek
    const handleLineTap = useCallback(async (index: number, time: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Disable auto-scroll temporarily
        setAutoScrollEnabled(false);
        
        // Seek to that timestamp
        const TrackPlayerObj = require('react-native-track-player').default;
        await TrackPlayerObj.seekTo(time);
        
        // Scroll to that line
        if (flashListRef.current) {
            const targetScroll = Math.max(0, (index * LINE_HEIGHT) - (SCREEN_HEIGHT * SCROLL_OFFSET_MULTIPLIER));
            flashListRef.current.scrollToOffset({
                offset: targetScroll,
                animated: true,
            });
        }
        
        // Re-enable auto-scroll after a short delay
        setTimeout(() => {
            setAutoScrollEnabled(true);
        }, 1000);
    }, []);

    useEffect(() => {
        return () => {
            if (syncButtonTimerRef.current) clearTimeout(syncButtonTimerRef.current);
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!isLyricsModalVisible) {
            setShowSyncButton(false);
            setAutoScrollEnabled(true);
            lastScrolledIndex.current = -1;
        }
    }, [isLyricsModalVisible]);

    const handleSeek = useCallback(async (value: number) => {
        const TrackPlayerObj = require('react-native-track-player').default;
        await TrackPlayerObj.seekTo(value);
    }, []);

    // ✅ OPTIMIZED: Memoize render item callback
    const renderLyricLine = useCallback(({ item, index }: any) => (
        <ImmersiveLyricLine
            line={item}
            index={index}
            activeIndex={activeIndex}
            onPress={handleLineTap}
        />
    ), [activeIndex, handleLineTap]);

    // ✅ OPTIMIZED: Memoize key extractor
    const keyExtractor = useCallback((item: LyricLine, index: number) => `lyric-${index}-${item.time}`, []);

    if (!currentTrack) return null;

    const isLoading = lyricsState.status === 'loading';
    const hasNoLyrics = lyricsState.status === 'not_found' || lyricsState.status === 'error';
    const baseColor = trackColors.dominant || '#3a3a5c';
    const backgroundColor = darkenColor(baseColor, 0.2);

    return (
        <Modal
            visible={isLyricsModalVisible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setLyricsModalVisible(false)}
        >
            <View style={[styles.container, { backgroundColor }]}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setLyricsModalVisible(false);
                        }}
                        style={styles.headerButton}
                        activeOpacity={0.7}
                    >
                        <ChevronDown size={28} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.modalTitle} numberOfLines={1}>
                            {currentTrack?.title}
                        </Text>
                        <Text style={styles.modalArtist} numberOfLines={1}>
                            {currentTrack?.artist}
                        </Text>
                    </View>
                    <View style={styles.headerButton} />
                </View>

                {/* Content */}
                <View style={styles.contentArea}>
                    {isLoading ? (
                        <LyricsLoadingSkeleton />
                    ) : hasNoLyrics ? (
                        <NoLyricsView />
                    ) : hasSyncedLyrics ? (
                        <>
                            {/* ✅ NEW: Top gradient shadow */}
                            <LinearGradient
                                colors={[backgroundColor, `${backgroundColor}00`]}
                                locations={[0, 1]}
                                style={styles.topGradient}
                                pointerEvents="none"
                            />

                            <AnimatedFlashList
                                ref={flashListRef}
                                data={syncedLines}
                                keyExtractor={keyExtractor}
                                renderItem={renderLyricLine}
                                estimatedItemSize={LINE_HEIGHT}
                                drawDistance={SCREEN_HEIGHT * 2}
                                estimatedListSize={{ height: SCREEN_HEIGHT, width: SCREEN_WIDTH }}
                                onScrollBeginDrag={handleLyricsScrollBegin}
                                onScrollEndDrag={handleLyricsScrollEnd}
                                onMomentumScrollEnd={handleLyricsScrollEnd}
                                contentContainerStyle={{ paddingVertical: 40, paddingBottom: SCREEN_HEIGHT * 0.4 }}
                                showsVerticalScrollIndicator={false}
                                removeClippedSubviews={true}
                                maxToRenderPerBatch={10}
                                updateCellsBatchingPeriod={50}
                                windowSize={11}
                            />

                            {/* ✅ NEW: Bottom gradient shadow */}
                            <LinearGradient
                                colors={[`${backgroundColor}00`, backgroundColor]}
                                locations={[0, 1]}
                                style={styles.bottomGradient}
                                pointerEvents="none"
                            />
                        </>
                    ) : hasPlainLyrics ? (
                        <>
                            {/* ✅ NEW: Top gradient shadow for plain lyrics */}
                            <LinearGradient
                                colors={[backgroundColor, `${backgroundColor}00`]}
                                locations={[0, 1]}
                                style={styles.topGradient}
                                pointerEvents="none"
                            />

                            <Animated.ScrollView
                                contentContainerStyle={[
                                    styles.plainContent,
                                    { paddingTop: 24, paddingBottom: SCREEN_HEIGHT * 0.25 },
                                ]}
                                showsVerticalScrollIndicator={false}
                                removeClippedSubviews={true}
                            >
                                <Text style={styles.plainLyricsText}>
                                    {(lyricsState as any).text}
                                </Text>
                            </Animated.ScrollView>

                            {/* ✅ NEW: Bottom gradient shadow for plain lyrics */}
                            <LinearGradient
                                colors={[`${backgroundColor}00`, backgroundColor]}
                                locations={[0, 1]}
                                style={styles.bottomGradient}
                                pointerEvents="none"
                            />
                        </>
                    ) : (
                        <NoLyricsView />
                    )}

                    {showSyncButton && hasSyncedLyrics && (
                        <Animated.View
                            entering={FadeIn.duration(200)}
                            exiting={FadeOut.duration(200)}
                            style={styles.syncButtonContainer}
                        >
                            <TouchableOpacity
                                style={styles.syncButton}
                                onPress={handleSyncPress}
                                activeOpacity={0.8}
                            >
                                <LocateFixed size={16} color="rgba(255,255,255,0.9)" />
                                <Text style={styles.syncButtonText}>Sync</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>

                {/* Bottom Controls */}
                <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.progressContainer}>
                        <ProgressBar onSeek={handleSeek} />
                        <LyricsTimeDisplay />
                    </View>

                    <View style={styles.controlsRow}>
                        <ControlButton onPress={togglePlay} size="xl" variant="solid">
                            {isPlaying ? (
                                <SharpPause size={26} color="#000" />
                            ) : (
                                <SharpPlay size={26} color="#000" style={{ marginLeft: 2 }} />
                            )}
                        </ControlButton>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

LyricsModal.displayName = 'LyricsModal';
export default LyricsModal;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
        zIndex: 10,
    },
    headerButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    modalArtist: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '500',
    },
    contentArea: {
        flex: 1,
        position: 'relative',
        paddingHorizontal: 20,
    },
    lyricLineWrapper: {
        minHeight: LINE_HEIGHT,
        justifyContent: 'center',
    },
    lyricText: {
        fontSize: 20,
        fontWeight: '800',
        lineHeight: 30,
        textAlign: 'left',
        letterSpacing: -0.3,
    },
    lyricTextActive: {
        color: '#fff',
    },
    lyricTextPast: {
        color: 'rgba(255,255,255,0.4)',
    },
    lyricTextInactive: {
        color: 'rgba(255,255,255,0.25)',
    },
    noLyricsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noLyricsText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 16,
        fontWeight: '500',
    },
    plainContent: {
        paddingHorizontal: 2,
    },
    plainLyricsText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 22,
        fontWeight: '600',
        lineHeight: 34,
        letterSpacing: -0.3,
    },
    syncButtonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 20,
    },
    syncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    syncButtonText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
    },
    bottomControls: {
        paddingHorizontal: 0,
        paddingTop: 2,
    },
    progressContainer: {
        marginBottom: 2,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        paddingVertical: 8,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        zIndex: 10,
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
        zIndex: 10,
    },
});