import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from '@/components/PremiumCard';
import { useMusicStore } from '@/stores/useMusicStore';
import { SectionHeader } from './SectionHeader';
import { Album } from './types';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.38;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const CollectionSection = React.memo(() => {
    const router = useRouter();
    const albums = useMusicStore(s => s.albums);

    const renderCollectionAlbum = useCallback(({ item, index }: { item: Album; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.artist}
            imageUrl={item.imageUrl}
            onPress={() => router.push(`/(tabs)/album/${item._id}` as any)}
            index={index}
        />
    ), [router]);

    if (!albums || albums.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Your Collection"
                subtitle="Albums you've saved"
                accentColor="#a78bfa"
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                data={albums}
                keyExtractor={(item) => item._id}
                renderItem={renderCollectionAlbum}
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
    sectionContainer: { marginTop: 28 },
});
