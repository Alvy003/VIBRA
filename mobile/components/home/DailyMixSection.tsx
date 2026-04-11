import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from '@/components/PremiumCard';
import { useStreamStore } from '@/stores/useStreamStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { SectionHeader } from './SectionHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.4;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const DailyMixSection = React.memo(() => {
    const { dailyMix, fetchDailyMix } = useStreamStore();
    const initializeQueue = usePlayerStore(state => state.initializeQueue);

    useEffect(() => {
        if (!dailyMix) {
            fetchDailyMix();
        }
    }, []);

    const handlePlay = useCallback((index: number) => {
        if (dailyMix) {
            initializeQueue(dailyMix, index);
        }
    }, [initializeQueue, dailyMix]);

    const renderPick = useCallback(({ item, index }: { item: any; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.artist}
            imageUrl={item.imageUrl}
            onPress={() => handlePlay(index)}
            index={index}
        />
    ), [handlePlay]);

    if (!dailyMix || dailyMix.length === 0) return null;

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
                contentContainerStyle={{ paddingHorizontal: 20 }}
                data={dailyMix}
                keyExtractor={(item, idx) => `${item.externalId || item._id || item.id}-${idx}`}
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
    sectionContainer: { marginTop: 28 },
});
