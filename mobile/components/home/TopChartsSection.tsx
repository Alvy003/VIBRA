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

export const TopChartsSection = React.memo(() => {
    const router = useRouter();
    const charts = useStreamStore(s => s.homepageData?.charts);

    const handleNavigateExternal = useCallback(
        (item: ExternalItem) => {
            const id = item.externalId?.replace('jiosaavn_playlist_', '');
            if (id) router.push(`/(tabs)/playlist/external/jiosaavn/${id}` as any);
        },
        [router]
    );

    const renderTopChart = useCallback(({ item, index }: { item: ExternalItem; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.description}
            imageUrl={item.imageUrl}
            onPress={() => handleNavigateExternal(item)}
            index={index}
        />
    ), [handleNavigateExternal]);

    if (!charts || charts.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Top Charts"
                accentColor="#06b6d4"
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                data={charts.slice(0, 8)}
                keyExtractor={(item) => item.externalId || item.id || String(item._id)}
                renderItem={renderTopChart}
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

TopChartsSection.displayName = 'TopChartsSection';

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 28 },
});
