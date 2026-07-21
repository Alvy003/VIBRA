// components/home/FrequentGridSection.tsx
import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumCard } from '@/components/PremiumCard';
import { useStreamStore } from '@/stores/useStreamStore';
import { SectionHeader } from './SectionHeader';
import { ListMusic, User } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.40;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

const getFallbackIcon = (type: string) => {
    if (type === 'artist') return User;
    if (type === 'playlist') return ListMusic;
    return undefined; // Defaults to Disc in PremiumCard
};

export const FrequentGridSection = React.memo(({ onOptions }: { onOptions?: (item: any, type: string) => void }) => {
    if (__DEV__) {
    }
    const router = useRouter();
    const frequentCollections = useStreamStore(s => s.frequentCollectionsData);
    const isLoading = useStreamStore(s => s.isLoadingFrequentCollections);
    const fetchFrequentCollections = useStreamStore(s => s.fetchFrequentCollections);
    const refreshVersion = useStreamStore(state => state.refreshVersion);

    React.useEffect(() => {
        fetchFrequentCollections(refreshVersion > 0);
    }, [fetchFrequentCollections, refreshVersion]);

    const handlePress = useCallback((item: any) => {
        const id = item.id;
        const source = item.source || 'jiosaavn';
        const type = item.type || 'album';
        const isExternal = item.isExternal || false;

        if (type === 'album') {
            if (isExternal) {
                router.push(`/(tabs)/album/external/${source}/${id}?from=home` as any);
            } else {
                router.push(`/(tabs)/album/${id}?from=home` as any);
            }
        } else if (type === 'playlist') {
            if (isExternal) {
                router.push(`/(tabs)/playlist/external/${source}/${id}?from=home` as any);
            } else {
                router.push(`/(tabs)/playlist/${id}?from=home` as any);
            }
        } else if (type === 'artist') {
            router.push(`/(tabs)/artist/external/${source}/${id}?from=home` as any);
        }
    }, [router]);

    const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
        <PremiumCard
            title={item.title}
            subtitle={item.isPlaceholder ? undefined : item.subtitle}
            imageUrl={item.artwork || item.imageUrl}
            fallbackIcon={getFallbackIcon(item.type || 'album')}
            onPress={item.isPlaceholder ? undefined : () => handlePress(item)}
            onLongPress={item.isPlaceholder ? undefined : () => onOptions?.(item, item.type || 'album')}
            index={index}
            width={CARD_WIDTH}
            isPlaceholder={item.isPlaceholder}
        />
    ), [handlePress, onOptions]);

    const displayCollections = frequentCollections && frequentCollections.length > 0 ? frequentCollections : (isLoading ? Array(4).fill({ isPlaceholder: true }) : []);

    if (displayCollections.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="On Repeat"
                accentColor="#a78bfa"
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                data={displayCollections}
                keyExtractor={(item, idx) => item.isPlaceholder ? `placeholder-${idx}` : `${item.type}_${item.isExternal ? 'ext' : 'loc'}_${item.id || idx}`}
                renderItem={renderItem}
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

FrequentGridSection.displayName = 'FrequentGridSection';

const styles = StyleSheet.create({
    sectionContainer: { 
        marginTop: 24, 
    },
});
