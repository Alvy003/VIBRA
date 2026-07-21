import { PremiumCard } from '@/components/PremiumCard';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useStreamStore } from '@/stores/useStreamStore';
import React, { useCallback, useEffect } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { SectionHeader } from './SectionHeader';

import { useMusicStore } from '@/stores/useMusicStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.40;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const DailyMixSection = React.memo(() => {
    if (__DEV__) {
    }
    const dailyMix = useStreamStore(s => s.dailyMix);
    const isLoading = useStreamStore(s => s.isLoadingDailyMix);
    const fetchDailyMix = useStreamStore(s => s.fetchDailyMix);
    const initializeQueue = usePlayerStore(state => state.initializeQueue);
    const refreshVersion = useStreamStore(state => state.refreshVersion);
    const isAuthReady = useMusicStore(s => s.isAuthReady);

    useEffect(() => {
        if (isAuthReady) {
            fetchDailyMix(refreshVersion > 0);
        }
    }, [fetchDailyMix, refreshVersion, isAuthReady]);

    const handlePlay = useCallback((index: number) => {
        if (dailyMix) {
            initializeQueue(dailyMix, index, { type: 'discovery', id: 'daily-mix', title: 'Daily Mix' });
        }
    }, [initializeQueue, dailyMix]);

    const renderPick = useCallback(({ item, index }: { item: any; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.artist}
            imageUrl={item.imageUrl}
            onPress={item.isPlaceholder ? undefined : () => handlePlay(index)}
            index={index}
            width={CARD_WIDTH}
            isPlaceholder={item.isPlaceholder}
        />
    ), [handlePlay]);

    const displayMix = dailyMix && dailyMix.length > 0 ? dailyMix : (isLoading ? Array(4).fill({ isPlaceholder: true }) : []);

    if (displayMix.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Daily Mix"
                subtitle="Your personal discovery station"
                accentColor="#ec4899"
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                data={displayMix}
                keyExtractor={(item, idx) => item.isPlaceholder ? `placeholder-${idx}` : `${item.externalId || item._id || item.id}-${idx}`}
                renderItem={renderPick}
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

DailyMixSection.displayName = 'DailyMixSection';

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 24 },
});
