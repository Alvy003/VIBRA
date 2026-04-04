import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, Dimensions, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from '@/components/PremiumCard';
import { useMusicStore } from '@/stores/useMusicStore';
import { useStreamStore } from '@/stores/useStreamStore';
import { SectionHeader } from './SectionHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.38;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const CollectionSection = React.memo(() => {
    const router = useRouter();
    
    // Personalized data
    const recentCollections = useMusicStore(s => s.recentCollections);
    
    const displayData = useMemo(() => {
        // Only show if we have enough items (at least 6)
        if (!recentCollections || recentCollections.length < 6) {
            return [];
        }
        return recentCollections.slice(0, 8);
    }, [recentCollections]);

    const isPersonalized = true; // Since we removed the fallback, it's always personalized if shown

    const renderCollectionItem = useCallback(({ item, index }: { item: any; index: number }) => {
        const id = item.externalId || item._id;
        const source = item.source || 'jiosaavn';
        const type = item.type || 'album';

        const handlePress = () => {
            // Strip prefixes like 'jiosaavn_album_' or 'jiosaavn_playlist_'
            const cleanId = id.replace(/^jiosaavn_(album|playlist)_/, '');

            if (type === 'album') {
                router.push(`/(tabs)/album/external/${source}/${cleanId}` as any);
            } else if (type === 'playlist') {
                router.push(`/(tabs)/playlist/external/${source}/${cleanId}` as any);
            }
        };

        return (
            <PremiumCard
                title={item.title}
                subtitle={item.artist || (type === 'playlist' ? 'Playlist' : 'Album')}
                imageUrl={item.imageUrl}
                onPress={handlePress}
                index={index}
            />
        );
    }, [router]);

    if (!displayData || displayData.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title={isPersonalized ? "Your Collection" : "New Releases"}
                subtitle={isPersonalized ? "Based on your activity" : "Fresh music for you"}
                accentColor="#a78bfa"
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                data={displayData}
                keyExtractor={(item, idx) => `${item.externalId || item._id}_${idx}`}
                renderItem={renderCollectionItem}
                snapToInterval={ITEM_SIZE}
                decelerationRate="fast"
                getItemLayout={(_, index) => ({
                    length: ITEM_SIZE,
                    offset: ITEM_SIZE * index,
                    index,
                })}
            />
        </View>
    );
});

CollectionSection.displayName = 'CollectionSection';

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 10 },
});
