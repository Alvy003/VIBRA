import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { TrendingUp, Play } from 'lucide-react-native';
import { AnimatedCard } from '@/components/AnimatedCard';
import { PremiumCard } from '@/components/PremiumCard';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { SectionHeader } from './SectionHeader';
import { SongItem } from './types';
import { Dimensions } from 'react-native';
import { resolveAssetUrl } from '@/lib/url';
import Colors from '@/constants/Colors';

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
            index={index}
        />
    ), [handlePlay]);

    if (trendingSongs.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Trending Now"
                subtitle="What everyone's listening to"
                accentColor={Colors.accent}
            />

            {/* Highlighted #1 Trending Card */}
            <AnimatedCard
                onPress={() => handlePlay(trendingSongs[0])}
                scaleDown={0.98}
                enableHaptic
                hapticStyle="medium"
                style={styles.heroCardWrapper}
            >
                <View style={styles.highlightCard}>
                    <Image
                        source={{ uri: resolveAssetUrl(trendingSongs[0].imageUrl), width: 150, height: 150 }}
                        style={styles.highlightImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        priority="low"
                        transition={200}
                    />
                    <View style={styles.highlightInfo}>
                        <View style={styles.trendingBadge}>
                            <TrendingUp size={11} color={Colors.accent} />
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

            {/* Horizontal scroll carousel */}
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                data={trendingSongs.slice(1, 9)}
                keyExtractor={(item, index) => `${item._id || item.id}-${index}`}
                renderItem={renderTrendingSong}
                snapToInterval={ITEM_SIZE}
                decelerationRate="fast"
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={3}
                removeClippedSubviews={true}
                getItemLayout={(_, index) => ({
                    length: ITEM_SIZE,
                    offset: ITEM_SIZE * index,
                    index,
                })}
            />
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
        backgroundColor: Colors.surfaceLighter,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.whiteAlpha08,
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
        backgroundColor: Colors.primaryAlpha15,
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        marginBottom: 6,
    },
    trendingBadgeText: {
        color: Colors.accent,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    highlightTitle: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    highlightArtist: {
        color: Colors.textSecondary,
        fontSize: 13,
    },
    playCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        shadowColor: Colors.primary,
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
});
