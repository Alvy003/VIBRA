import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from '@/components/PremiumCard';
import { useStreamStore } from '@/stores/useStreamStore';
import { SectionHeader } from './SectionHeader';
import { ExternalItem } from './types';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.38;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const FeaturedPlaylistsSection = React.memo(() => {
    const router = useRouter();
    const topPlaylists = useStreamStore(s => s.homepageData?.topPlaylists);

    const handleNavigateExternal = useCallback(
        (item: ExternalItem) => {
            const id = item.externalId?.replace('jiosaavn_playlist_', '');
            if (id) router.push(`/(tabs)/playlist/external/jiosaavn/${id}` as any);
        },
        [router]
    );

    const renderFeaturedPlaylist = useCallback(({ item, index }: { item: ExternalItem; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.songCount ? `${item.songCount} songs` : item.description}
            imageUrl={item.imageUrl}
            onPress={() => handleNavigateExternal(item)}
            index={index}
        />
    ), [handleNavigateExternal]);

    if (!topPlaylists || topPlaylists.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Featured Playlists"
                accentColor="#ec4899"
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                data={topPlaylists.slice(0, 8)}
                keyExtractor={(item) => item.externalId || item.id || String(item._id)}
                renderItem={renderFeaturedPlaylist}
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

FeaturedPlaylistsSection.displayName = 'FeaturedPlaylistsSection';

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 28 },
});
