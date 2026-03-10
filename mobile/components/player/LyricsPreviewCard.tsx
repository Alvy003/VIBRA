import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useLyricsStore } from '@/stores/useLyricsStore';
import { useColorStore } from '@/stores/useColorStore';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import { LyricLine } from '@/lib/lyrics';

const LYRICS_PREVIEW_HEIGHT = 260;
const PREVIEW_LINE_COUNT = 4;

function getVibrantColor(hex: string): string {
    const color = hex.replace('#', '');
    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);

    const gray = (r + g + b) / 3;
    const saturationBoost = 1.3;

    r = Math.min(255, Math.max(0, Math.floor(gray + (r - gray) * saturationBoost)));
    g = Math.min(255, Math.max(0, Math.floor(gray + (g - gray) * saturationBoost)));
    b = Math.min(255, Math.max(0, Math.floor(gray + (b - gray) * saturationBoost)));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const LyricsPreviewCard = React.memo(() => {
    const currentTrack = usePlayerStore((s) => s.currentTrack);
    const getLyrics = useLyricsStore((s) => s.getLyrics);
    const getTrackColors = useColorStore((s) => s.getTrackColors);

    const lyricsState = currentTrack ? getLyrics(currentTrack.id) : { status: 'idle' as const };
    const hasSyncedLyrics = lyricsState.status === 'synced' && 'lines' in lyricsState;
    const hasPlainLyrics = lyricsState.status === 'plain' && 'text' in lyricsState;
    const syncedLines = hasSyncedLyrics ? (lyricsState as any).lines : [];

    const trackColors = currentTrack ? getTrackColors(currentTrack.id) : ({} as { dominant?: string });
    const activeIndex = usePlayerUIStore((s) => s.activeIndex);
    const setLyricsModalVisible = usePlayerUIStore((s) => s.setLyricsModalVisible);

    const previewLines = useMemo(() => {
        if (!hasSyncedLyrics) return [];
        const currentIdx = Math.max(0, activeIndex);
        const startIdx = Math.max(0, currentIdx - 1);

        const lines: LyricLine[] = [];
        for (let i = 0; i < PREVIEW_LINE_COUNT; i++) {
            lines.push(syncedLines[startIdx + i] || { time: -1, text: '' });
        }
        return lines;
    }, [hasSyncedLyrics, activeIndex, syncedLines]);

    const baseColor = trackColors.dominant || '#3a3a5c';
    const vibrantColor = getVibrantColor(baseColor);
    const cardBackground = `${vibrantColor}99`;

    return (
        <TouchableOpacity
            style={[
                styles.lyricsPreviewContainer,
                { backgroundColor: cardBackground }
            ]}
            activeOpacity={0.85}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLyricsModalVisible(true);
            }}
        >
            <View style={styles.lyricsPreviewHeader}>
                <Text style={styles.lyricsPreviewTitle}>
                    {hasSyncedLyrics ? 'Lyrics preview' : 'Lyrics preview'}
                </Text>
            </View>

            <View style={styles.lyricsPreviewContentWrapper}>
                {hasSyncedLyrics ? (
                    previewLines.map((line, idx) => {
                        const isActive = idx === 1;
                        const isPast = idx === 0;
                        return (
                            <View
                                key={`preview-${idx}-${line.time}`}
                                style={styles.lyricsPreviewLineWrapper}
                            >
                                <Text
                                    style={[
                                        styles.lyricsPreviewLine,
                                        isActive && styles.lyricsPreviewActive,
                                        isPast && styles.lyricsPreviewPast,
                                        !isActive && !isPast && styles.lyricsPreviewInactive,
                                    ]}
                                    numberOfLines={2}
                                >
                                    {line.text}
                                </Text>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.plainLyricsPreview}>
                        <Text style={styles.unsyncedLabel}>
                            {lyricsState.status === 'loading' || lyricsState.status === 'idle' ? 'Loading lyrics...' :
                                lyricsState.status === 'plain' ? 'Unsynced lyrics' : 'No lyrics available'}
                        </Text>
                        <Text
                            style={[
                                styles.lyricsPreviewLine,
                                { color: 'rgba(255,255,255,0.9)', fontSize: 16 }
                            ]}
                            numberOfLines={4}
                        >
                            {lyricsState.status === 'plain'
                                ? (lyricsState as any).text.substring(0, 200) + '...'
                                : ''}
                        </Text>
                    </View>
                )}
            </View>

            <TouchableOpacity
                style={styles.expandButton}
                activeOpacity={0.7}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLyricsModalVisible(true);
                }}
            >
                <Text style={styles.expandButtonText}>Show lyrics</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
});
LyricsPreviewCard.displayName = 'LyricsPreviewCard';
export default LyricsPreviewCard;

const styles = StyleSheet.create({
    lyricsPreviewContainer: {
        marginTop: 10,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        overflow: 'hidden',
    },
    lyricsPreviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    lyricsPreviewTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    expandButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        marginTop: 20,
        alignSelf: 'flex-start',
    },
    expandButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    lyricsPreviewContentWrapper: {
        height: LYRICS_PREVIEW_HEIGHT,
        justifyContent: 'flex-start',
        position: 'relative',
        paddingTop: 8,
    },
    lyricsPreviewLineWrapper: {
        minHeight: LYRICS_PREVIEW_HEIGHT / 4,
        justifyContent: 'center',
        paddingHorizontal: 4,
        marginBottom: 2,
    },
    lyricsPreviewLine: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'left',
        letterSpacing: -0.3,
    },
    lyricsPreviewActive: {
        color: '#fff',
        fontSize: 20,
    },
    lyricsPreviewPast: {
        color: '#fff',
        fontSize: 20,
    },
    lyricsPreviewInactive: {
        color: '#000',
        fontSize: 20,
    },
    plainLyricsPreview: {
        height: LYRICS_PREVIEW_HEIGHT,
        justifyContent: 'flex-start',
        paddingHorizontal: 4,
    },
    unsyncedLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 12,
        letterSpacing: 0.5,
    }
});
