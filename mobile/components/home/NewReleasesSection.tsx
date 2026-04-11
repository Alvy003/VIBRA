import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from '@/components/PremiumCard';
import { useStreamStore } from '@/stores/useStreamStore';
import { SectionHeader } from './SectionHeader';
import { ExternalItem } from './types';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.45;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const NewReleasesSection = React.memo(() => {
    const router = useRouter();
    const newAlbums = useStreamStore(s => s.homepageData?.newAlbums);

    const handleNavigateExternal = useCallback(
        (item: ExternalItem) => {
            const id = item.externalId?.replace('jiosaavn_album_', '');
            if (id) router.push(`/(tabs)/album/external/jiosaavn/${id}` as any);
        },
        [router]
    );

    const renderNewRelease = useCallback(({ item, index }: { item: ExternalItem; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.artist}
            imageUrl={item.imageUrl}
            onPress={() => handleNavigateExternal(item)}
            index={index}
        />
    ), [handleNavigateExternal]);

    if (!newAlbums || newAlbums.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="New Releases"
                accentColor="#f59e0b"
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                data={newAlbums.slice(0, 8)}
                keyExtractor={(item) => item.externalId || item.id || String(item._id)}
                renderItem={renderNewRelease}
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

NewReleasesSection.displayName = 'NewReleasesSection';

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 28 },
});
