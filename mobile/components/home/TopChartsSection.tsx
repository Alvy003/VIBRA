import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { BarChart3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from '@/components/PremiumCard';
import { useStreamStore } from '@/stores/useStreamStore';
import { SectionHeader } from './SectionHeader';
import { ExternalItem } from './types';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH_LG = SCREEN_WIDTH * 0.42;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH_LG + CARD_MARGIN;

export const TopChartsSection = React.memo(() => {
    const router = useRouter();
    const charts = useStreamStore(s => s.homepageData?.charts);

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

    const renderTopChart = useCallback(({ item, index }: { item: ExternalItem; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.description}
            imageUrl={item.imageUrl}
            onPress={() => handleNavigateExternal(item)}
            size="large"
            index={index}
        />
    ), [handleNavigateExternal]);

    if (!charts || charts.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Top Charts"
                icon={<BarChart3 size={16} color="#06b6d4" />}
                accentColor="#06b6d4"
            />
            <View style={{ minHeight: 200 }}>
                <FlashList<any>
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    data={charts.slice(0, 8)}
                    keyExtractor={(item) => item.externalId || item.id || String(item._id)}
                    renderItem={renderTopChart as any}
                />
            </View>
        </View>
    );
});

TopChartsSection.displayName = 'TopChartsSection';

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 28 },
});
