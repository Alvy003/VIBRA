import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { TrendingUp, Play } from 'lucide-react-native';
import { AnimatedCard } from '@/components/AnimatedCard';
import { PremiumCard } from '@/components/PremiumCard';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { SectionHeader } from './SectionHeader';
import { SongItem } from './types';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.38;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const TrendingSection = React.memo(() => {
    const trendingSongs = useMusicStore(s => s.trendingSongs);
    const playTrack = usePlayerStore(s => s.playTrack);

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

    const renderTrendingSong = useCallback(({ item, index }: { item: SongItem; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.artist}
            imageUrl={item.imageUrl}
            onPress={() => handlePlay(item)}
            index={index} // Just for staggered logic if any
        />
    ), [handlePlay]);

    if (trendingSongs.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Trending Now"
                icon={<TrendingUp size={16} color="#f97316" />}
                accentColor="#f97316"
            />

            <AnimatedCard
                onPress={() => handlePlay(trendingSongs[0])}
                scaleDown={0.98}
                enableHaptic
                style={styles.heroCardWrapper}
            >
                <View style={styles.highlightCard}>
                    <Image
                        source={{ uri: trendingSongs[0].imageUrl, width: 150, height: 150 }}
                        style={styles.highlightImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        priority="low"
                        transition={200}
                    />
                    <View style={styles.highlightInfo}>
                        <View style={styles.trendingBadge}>
                            <TrendingUp size={11} color="#f97316" />
                            <Text style={styles.trendingBadgeText}>#1 TRENDING</Text>
                        </View>
                        <Text numberOfLines={1} style={styles.highlightTitle}>
                            {trendingSongs[0].title}
                        </Text>
                        <Text numberOfLines={1} style={styles.highlightArtist}>
                            {trendingSongs[0].artist}
                        </Text>
                    </View>
                    <View style={styles.playCircle}>
                        <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 1.5 }} />
                    </View>
                </View>
            </AnimatedCard>

            <View style={{ minHeight: 200 }}>
                <FlashList<any>
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    data={trendingSongs.slice(1, 9)}
                    keyExtractor={(item) => item._id}
                    renderItem={renderTrendingSong as any}
                />
            </View>
        </View>
    );
});

TrendingSection.displayName = 'TrendingSection';

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 28 },
    heroCardWrapper: { marginHorizontal: 20, marginBottom: 14 },
    highlightCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181b',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    highlightImage: {
        width: 64,
        height: 64,
        borderRadius: 10,
    },
    highlightInfo: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'center',
    },
    trendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(249, 115, 22, 0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        marginBottom: 6,
    },
    trendingBadgeText: {
        color: '#f97316',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    highlightTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    highlightArtist: {
        color: '#a1a1aa',
        fontSize: 13,
    },
    playCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#9333ea',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        shadowColor: '#9333ea',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
});
