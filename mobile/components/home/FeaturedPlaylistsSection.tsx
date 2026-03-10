import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ListMusic } from 'lucide-react-native';
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
            const id = (item._id || item.externalId || item.id || '').replace(
                /jiosaavn_(album|playlist|artist)_/,
                ''
            );
            if (id) router.push(`/playlist/external/jiosaavn/${id}` as any);
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
                icon={<ListMusic size={16} color="#ec4899" />}
                accentColor="#ec4899"
            />
            <View style={{ minHeight: 200 }}>
                <FlashList<any>
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    data={topPlaylists.slice(0, 8)}
                    keyExtractor={(item) => item.externalId || item.id || String(item._id)}
                    renderItem={renderFeaturedPlaylist as any}
                />
            </View>
        </View>
    );
});

FeaturedPlaylistsSection.displayName = 'FeaturedPlaylistsSection';

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 28 },
});
