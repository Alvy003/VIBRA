// components/home/FrequentGridSection.tsx
import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from '@/components/PremiumCard';
import { useMusicStore } from '@/stores/useMusicStore';
import { SectionHeader } from './SectionHeader';
import CollectionOptions, { CollectionOptionsRef } from '@/components/CollectionOptions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.45;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const FrequentGridSection = React.memo(({ onOptions }: { onOptions?: (item: any, type: string) => void }) => {
    const router = useRouter();
    const frequentCollections = useMusicStore(s => s.frequentCollections);

    const handlePress = useCallback((item: any) => {
        const id = item.externalId || item._id;
        const source = item.source || 'jiosaavn';
        const type = item.type || 'album';

        // Strip prefixes
        const cleanId = String(id).replace(/^jiosaavn_(album|playlist)_/, '');

        if (type === 'album') {
            router.push(`/(tabs)/album/external/${source}/${cleanId}?from=home` as any);
        } else if (type === 'playlist') {
            router.push(`/(tabs)/playlist/external/${source}/${cleanId}?from=home` as any);
        } else if (type === 'artist') {
            router.push(`/(tabs)/artist/external/${source}/${cleanId}?from=home` as any);
        }
    }, [router]);

    const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.type === 'album' ? 'Album' : item.type === 'playlist' ? 'Playlist' : 'Artist'}
            imageUrl={item.imageUrl}
            onPress={() => handlePress(item)}
            onLongPress={() => onOptions?.(item, item.type || 'album')}
            index={index}
        />
    ), [handlePress, onOptions]);

    if (!frequentCollections || frequentCollections.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="On Repeat"
                accentColor="#a78bfa"
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                data={frequentCollections}
                keyExtractor={(item) => `${item.type}_${item.externalId || item._id || item.id}`}
                renderItem={renderItem}
                snapToInterval={ITEM_SIZE}
                decelerationRate="fast"
                initialNumToRender={4}
                windowSize={3}
                removeClippedSubviews={true}
            />
        </View>
    );
});

FrequentGridSection.displayName = 'FrequentGridSection';

const styles = StyleSheet.create({
    sectionContainer: { 
        marginTop: 28, 
        marginBottom: 10 
    },
});
