import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
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

export const QuickPicksSection = React.memo(() => {
    const featuredSongs = useMusicStore(s => s.featuredSongs);
    const playTrack = usePlayerStore(s => s.playTrack);

    const quickPicks = useMemo(() => featuredSongs.slice(0, 8), [featuredSongs]);

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

    const renderQuickPick = useCallback(({ item, index }: { item: SongItem; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.artist}
            imageUrl={item.imageUrl}
            onPress={() => handlePlay(item)}
            index={index}
        />
    ), [handlePlay]);

    if (quickPicks.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Quick Picks"
                accentColor="#52525b"
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                data={quickPicks}
                keyExtractor={(item) => item._id}
                renderItem={renderQuickPick}
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

QuickPicksSection.displayName = 'QuickPicksSection';

const styles = StyleSheet.create({
    sectionContainer: {
        marginTop: 28,
    },
});
