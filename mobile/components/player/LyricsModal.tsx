import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, LocateFixed, Pause, Play, SkipBack, SkipForward } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, SharedValue } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';

import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLyricsStore } from '@/stores/useLyricsStore';
import { useColorStore } from '@/stores/useColorStore';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import { LyricLine } from '@/lib/lyrics';

import ProgressBar from '../ProgressBar';
import LyricsTimeDisplay from '../LyricsTimeDisplay';
import ControlButton from '../ControlButton';

// We inline ImmersiveLyricLine, LyricsLoadingSkeleton, NoLyricsView for simplicity if not extracted
const ImmersiveLyricLine = React.memo(({ line, index, activeIndex }: { line: LyricLine, index: number, activeIndex: SharedValue<number> | number }) => {
    // Normally this has reanimated styles based on activeLineIndex.
    // For FlashList performance, it's usually better to just pass activeIndex as a prop or listen.
    const currentIndex = usePlayerUIStore((s) => s.activeIndex);
    const isActive = currentIndex === index;
    const isPast = index < currentIndex;

    return (
        <View style={styles.lyricLineWrapper}>
            <Text style={[
                styles.lyricText,
                isActive && styles.lyricTextActive,
                isPast && styles.lyricTextPast,
                !isActive && !isPast && styles.lyricTextInactive
            ]}>
                {line.text}
            </Text>
        </View>
    );
});

const LyricsLoadingSkeleton = () => (
    <View style={styles.noLyricsContainer}>
        <Text style={styles.noLyricsText}>Loading lyrics...</Text>
    </View>
);

const NoLyricsView = () => (
    <View style={styles.noLyricsContainer}>
        <Text style={styles.noLyricsText}>No lyrics available.</Text>
    </View>
);

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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as any;

const LyricsModal = React.memo(() => {
    const insets = useSafeAreaInsets();

    const currentTrack = usePlayerStore((s) => s.currentTrack);
    const { isPlaying, togglePlay, playNext, playPrevious } = usePlayerStore();
    const getLyrics = useLyricsStore((s) => s.getLyrics);
    const getTrackColors = useColorStore((s) => s.getTrackColors);

    const isLyricsModalVisible = usePlayerUIStore((s) => s.isLyricsModalVisible);
    const setLyricsModalVisible = usePlayerUIStore((s) => s.setLyricsModalVisible);
    const activeIndex = usePlayerUIStore((s) => s.activeIndex);

    const lyricsState = currentTrack ? getLyrics(currentTrack.id) : { status: 'idle' };
    const trackColors = currentTrack ? getTrackColors(currentTrack.id) : ({} as any);

    const hasSyncedLyrics = lyricsState.status === 'synced' && 'lines' in lyricsState;
    const hasPlainLyrics = lyricsState.status === 'plain' && 'text' in lyricsState;
    const syncedLines = useMemo(() => hasSyncedLyrics ? (lyricsState as any).lines as LyricLine[] : [], [hasSyncedLyrics, lyricsState]);

    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [showSyncButton, setShowSyncButton] = useState(false);
    const syncButtonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isUserScrolling = useRef(false);
    const lastScrolledIndex = useRef(-1);
    const flashListRef = useRef<any>(null);

    useEffect(() => {
        if (
            !isLyricsModalVisible ||
            !autoScrollEnabled ||
            activeIndex < 0 ||
            activeIndex === lastScrolledIndex.current
        ) return;

        lastScrolledIndex.current = activeIndex;

        const lineHeight = 60;
        // We add an offset so the active line shows around 25% from top
        const targetScroll = Math.max(0, (activeIndex * lineHeight) - (SCREEN_HEIGHT * 0.25));

        if (flashListRef.current) {
            flashListRef.current.scrollToOffset({
                offset: targetScroll,
                animated: true
            });
        }
    }, [activeIndex, isLyricsModalVisible, autoScrollEnabled]);

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
        }, 5000);
    }, []);

    const handleSyncPress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAutoScrollEnabled(true);
        setShowSyncButton(false);

        if (activeIndex >= 0 && flashListRef.current) {
            const lineHeight = 60;
            const targetScroll = Math.max(0, (activeIndex * lineHeight) - (SCREEN_HEIGHT * 0.25));
            flashListRef.current.scrollToOffset({
                offset: targetScroll,
                animated: true,
            });
        }
    }, [activeIndex]);

    useEffect(() => {
        return () => {
            if (syncButtonTimerRef.current) clearTimeout(syncButtonTimerRef.current);
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

    if (!currentTrack) return null;

    const isLoading = lyricsState.status === 'loading';
    const hasNoLyrics = lyricsState.status === 'not_found' || lyricsState.status === 'error';
    const baseColor = trackColors.dominant || '#3a3a5c';

    return (
        <Modal
            visible={isLyricsModalVisible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setLyricsModalVisible(false)}
        >
            <View style={styles.container}>
                <View style={StyleSheet.absoluteFill}>
                    <View style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: darkenColor(baseColor, 0.2)
                    }} />
                </View>

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
                        <AnimatedFlashList
                            ref={flashListRef}
                            data={syncedLines}
                            keyExtractor={(item: any, index: number) => `${item.time}-${index}`}
                            renderItem={({ item, index }: any) => (
                                <ImmersiveLyricLine
                                    line={item}
                                    index={index}
                                    activeIndex={activeIndex}
                                />
                            )}
                            estimatedItemSize={60}
                            drawDistance={SCREEN_HEIGHT}
                            onScrollBeginDrag={handleLyricsScrollBegin}
                            onScrollEndDrag={handleLyricsScrollEnd}
                            onMomentumScrollEnd={handleLyricsScrollEnd}
                            contentContainerStyle={{ paddingVertical: 40, paddingBottom: SCREEN_HEIGHT * 0.4 }}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : hasPlainLyrics ? (
                        <Animated.ScrollView
                            contentContainerStyle={[
                                styles.plainContent,
                                { paddingTop: 24, paddingBottom: SCREEN_HEIGHT * 0.25 },
                            ]}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.plainLyricsText}>
                                {(lyricsState as any).text}
                            </Text>
                        </Animated.ScrollView>
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
                        <ControlButton onPress={playPrevious} size="medium">
                            <SkipBack size={22} color="#fff" fill="rgba(255,255,255,0.7)" />
                        </ControlButton>

                        <ControlButton onPress={togglePlay} size="large" variant="solid">
                            {isPlaying ? (
                                <Pause size={26} color="#000" fill="#000" />
                            ) : (
                                <Play size={26} color="#000" fill="#000" style={{ marginLeft: 2 }} />
                            )}
                        </ControlButton>

                        <ControlButton onPress={playNext} size="medium">
                            <SkipForward size={22} color="#fff" fill="rgba(255,255,255,0.7)" />
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
        minHeight: 60,
        justifyContent: 'center',
    },
    lyricText: {
        fontSize: 22,
        fontWeight: '800',
        lineHeight: 34,
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
        color: '#000',
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
        fontWeight: '700',
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
});
