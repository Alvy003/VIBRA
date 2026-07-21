import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from '@/components/PremiumCard';
import { useStreamStore } from '@/stores/useStreamStore';
import { SectionHeader } from './SectionHeader';
import { ExternalItem } from './types';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.40;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const FeaturedPlaylistsSection = React.memo(({ onOptions }: { onOptions?: (item: any, type: string) => void }) => {
    if (__DEV__) {
    }
    const router = useRouter();
    const topPlaylists = useStreamStore(s => s.homepageData?.topPlaylists);
    const isLoading = useStreamStore(s => s.isLoadingHomepage);

    const handleNavigateExternal = useCallback(
        (item: ExternalItem) => {
            const id = item.externalId?.replace('jiosaavn_playlist_', '');
            if (id) router.push(`/(tabs)/playlist/external/jiosaavn/${id}?from=home` as any);
        },
        [router]
    );

    const renderFeaturedPlaylist = useCallback(({ item, index }: { item: any; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.songCount ? `${item.songCount} songs` : item.description}
            imageUrl={item.imageUrl}
            onPress={item.isPlaceholder ? undefined : () => handleNavigateExternal(item)}
            onLongPress={item.isPlaceholder ? undefined : () => onOptions?.(item, 'playlist')}
            index={index}
            width={CARD_WIDTH}
            isPlaceholder={item.isPlaceholder}
        />
    ), [handleNavigateExternal, onOptions]);

    const displayPlaylists = topPlaylists && topPlaylists.length > 0 ? topPlaylists.slice(0, 8) : (isLoading ? Array(4).fill({ isPlaceholder: true }) : []);

    if (displayPlaylists.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Featured Playlists"
                accentColor="#ec4899"
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                data={displayPlaylists}
                keyExtractor={(item, idx) => item.isPlaceholder ? `placeholder-${idx}` : (item.externalId || item.id || String(item._id))}
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
    sectionContainer: { marginTop: 24 },
});
