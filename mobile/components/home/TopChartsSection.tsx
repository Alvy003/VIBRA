import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from '@/components/PremiumCard';
import { useStreamStore } from '@/stores/useStreamStore';
import { SectionHeader } from './SectionHeader';
import Colors from '@/constants/Colors';
import { ExternalItem } from './types';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.40;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const TopChartsSection = React.memo(({ onOptions }: { onOptions?: (item: any, type: string) => void }) => {
    if (__DEV__) {
        console.log('[TopChartsSection] Render');
    }
    const router = useRouter();
    const charts = useStreamStore(s => s.homepageData?.charts);
    const isLoading = useStreamStore(s => s.isLoadingHomepage);

    const handleNavigateExternal = useCallback(
        (item: ExternalItem) => {
            const id = item.externalId?.replace('jiosaavn_playlist_', '');
            if (id) router.push(`/(tabs)/playlist/external/jiosaavn/${id}?from=home` as any);
        },
        [router]
    );

    const renderTopChart = useCallback(({ item, index }: { item: any; index: number }) => (
        <PremiumCard
            title={item.title}
            // subtitle={item.description}
            imageUrl={item.imageUrl}
            onPress={item.isPlaceholder ? undefined : () => handleNavigateExternal(item)}
            onLongPress={item.isPlaceholder ? undefined : () => onOptions?.(item, 'playlist')}
            index={index}
            width={CARD_WIDTH}
            isPlaceholder={item.isPlaceholder}
        />
    ), [handleNavigateExternal, onOptions]);

    const displayCharts = charts && charts.length > 0 ? charts.slice(0, 8) : (isLoading ? Array(4).fill({ isPlaceholder: true }) : []);

    if (displayCharts.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Top Charts"
                accentColor={Colors.accent}
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                data={displayCharts}
                keyExtractor={(item, idx) => item.isPlaceholder ? `placeholder-${idx}` : (item.externalId || item.id || String(item._id))}
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
    sectionContainer: { marginTop: 24 },
});
