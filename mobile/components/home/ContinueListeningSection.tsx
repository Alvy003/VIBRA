import Colors from '@/constants/Colors';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useStreamStore } from '@/stores/useStreamStore';
import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { ContinueListeningCard } from './ContinueListeningCard';
import { SectionHeader } from './SectionHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.40;
const CARD_MARGIN = 14;
const ITEM_SIZE = CARD_WIDTH + CARD_MARGIN;

export const ContinueListeningSection = React.memo(({ onOptions }: { onOptions?: (item: any, type: string) => void }) => {
    if (__DEV__) {
        console.log('[ContinueListeningSection] Render');
    }
    
    const { isSignedIn, isLoaded } = useAuth();
    const isAuthReady = useMusicStore(state => state.isAuthReady);
    const resumePlayback = usePlayerStore(state => state.resumePlayback);
    
    const items = useStreamStore(state => state.continueListeningData) || [];
    const fetchContinueListening = useStreamStore(state => state.fetchContinueListening);

    useFocusEffect(
        useCallback(() => {
            if (isLoaded && isSignedIn && isAuthReady) {
                fetchContinueListening();
            }
        }, [fetchContinueListening, isLoaded, isSignedIn, isAuthReady])
    );

    // Refresh immediately when auth state becomes ready
    useEffect(() => {
        if (isLoaded) {
            if (isSignedIn && isAuthReady) {
                fetchContinueListening();
            } else if (!isSignedIn) {
                // Clear store via reset if needed, handled by global auth listener
            }
        }
    }, [isLoaded, isSignedIn, isAuthReady, fetchContinueListening]);

    const handlePress = useCallback(async (item: any) => {
        await resumePlayback({ track: item, position: item.position });
    }, [resumePlayback]);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <ContinueListeningCard
            title={item.title}
            subtitle={item.artist}
            imageUrl={item.artwork}
            progress={item.progress}
            onPress={() => handlePress(item)}
        />
    ), [handlePress]);

    if (items.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Continue Listening"
                accentColor={Colors.accent}
            />
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                data={items}
                keyExtractor={(item) => item.id}
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

ContinueListeningSection.displayName = 'ContinueListeningSection';

const styles = StyleSheet.create({
    sectionContainer: { marginTop: 28 },
});
