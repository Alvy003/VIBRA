import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Star } from 'lucide-react-native';
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

export const NewReleasesSection = React.memo(() => {
    const router = useRouter();
    // Selective subscription
    const newAlbums = useStreamStore(s => s.homepageData?.newAlbums);

    const handleNavigateExternal = useCallback(
        (item: ExternalItem) => {
            const id = (item._id || item.externalId || item.id || '').replace(
                /jiosaavn_(album|playlist|artist)_/,
                ''
            );
            if (id) router.push(`/album/external/jiosaavn/${id}` as any);
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
                icon={<Star size={16} color="#f59e0b" />}
                accentColor="#f59e0b"
            />
            <View style={{ minHeight: 200 }}>
                <FlashList<any>
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    data={newAlbums.slice(0, 8)}
                    keyExtractor={(item) => item.externalId || item.id || String(item._id)}
                    renderItem={renderNewRelease as any}
                />
            </View>
        </View>
    );
});

NewReleasesSection.displayName = 'NewReleasesSection';

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 24 },
});
