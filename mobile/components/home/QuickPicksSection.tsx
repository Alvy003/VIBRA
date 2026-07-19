import { PremiumCard } from '@/components/PremiumCard';
import Colors from '@/constants/Colors';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import React, { useCallback, useMemo } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { SectionHeader } from './SectionHeader';
import { SongItem } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.40;
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
            width={CARD_WIDTH}
        />
    ), [handlePlay]);

    if (quickPicks.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Quick Picks"
                accentColor={Colors.textMuted}
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
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
        marginTop: 24,
    },
});
