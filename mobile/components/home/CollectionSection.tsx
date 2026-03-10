import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Disc } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from '@/components/PremiumCard';
import { useMusicStore } from '@/stores/useMusicStore';
import { SectionHeader } from './SectionHeader';
import { SongItem } from './types';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.38;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const CollectionSection = React.memo(() => {
    const router = useRouter();
    const albums = useMusicStore(s => s.albums);

    const renderCollectionAlbum = useCallback(({ item, index }: { item: SongItem; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.artist}
            imageUrl={item.imageUrl}
            onPress={() => router.push(`/album/${item._id}` as any)}
            index={index}
        />
    ), [router]);

    if (!albums || albums.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Your Collection"
                icon={<Disc size={16} color="#a78bfa" />}
                accentColor="#a78bfa"
            />
            <View style={{ minHeight: 200 }}>
                <FlashList<any>
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    data={albums}
                    keyExtractor={(item) => item._id}
                    renderItem={renderCollectionAlbum as any}
                />
            </View>
        </View>
    );
});

CollectionSection.displayName = 'CollectionSection';

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 28 },
});
