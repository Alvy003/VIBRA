import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Zap } from 'lucide-react-native';
import { AnimatedCard } from '@/components/AnimatedCard';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { SectionHeader } from './SectionHeader';
import { SongItem } from './types';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QuickPickCard = React.memo(({
    song,
    onPress,
}: {
    song: SongItem;
    onPress: () => void;
}) => (
    <AnimatedCard
        onPress={onPress}
        scaleDown={0.97}
        style={{
            width: (SCREEN_WIDTH - 48 - 10) / 2,
            marginBottom: 10,
        }}
    >
        <View style={styles.cardContainer}>
            <Image
                source={{ uri: song.imageUrl, width: 100, height: 100 }}
                style={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority="high"
                transition={200}
            />
            <View style={styles.textContainer}>
                <Text numberOfLines={1} style={styles.title}>
                    {song.title}
                </Text>
                <Text numberOfLines={1} style={styles.subtitle}>
                    {song.artist}
                </Text>
            </View>
        </View>
    </AnimatedCard>
), (prev, next) => prev.song._id === next.song._id);

export const QuickPicksSection = React.memo(() => {
    // Selective Zustand subscription
    const featuredSongs = useMusicStore(s => s.featuredSongs);
    const playTrack = usePlayerStore(s => s.playTrack);

    const quickPicks = useMemo(() => featuredSongs.slice(0, 6), [featuredSongs]);

    const handlePlay = useCallback(
        (song: SongItem) => {
            playTrack({
                id: song.videoId || song.externalId || song._id || '',
                url: song.streamUrl || song.audioUrl || '',
                title: song.title,
                artist: song.artist,
                artwork: song.imageUrl,
                duration: song.duration,
                source: song.source || (song.videoId ? 'youtube' : 'jiosaavn'),
            } as any);
        },
        [playTrack]
    );

    const renderQuickPick = useCallback((song: SongItem) => (
        <QuickPickCard
            key={song._id}
            song={song}
            onPress={() => handlePlay(song)}
        />
    ), [handlePlay]);

    if (quickPicks.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Quick Picks"
                icon={<Zap size={16} color="#9333ea" />}
                accentColor="#9333ea"
            />
            <View style={styles.grid}>
                {quickPicks.map(renderQuickPick)}
            </View>
        </View>
    );
});

QuickPicksSection.displayName = 'QuickPicksSection';

const styles = StyleSheet.create({
    sectionContainer: {
        marginTop: 20,
        paddingHorizontal: 20
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    cardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(39, 39, 42, 0.6)',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    image: { width: 50, height: 50 },
    textContainer: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
    title: { color: '#fff', fontSize: 12.5, fontWeight: '600' },
    subtitle: { color: '#71717a', fontSize: 11, marginTop: 1 },
});
