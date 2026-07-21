import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { DiscoveryMixCard } from './DiscoveryMixCard';
import { SectionHeader } from './SectionHeader';
import { useStreamStore } from '@/stores/useStreamStore';
import { useMusicStore } from '@/stores/useMusicStore';
import Colors from '@/constants/Colors';

export const MixSection = React.memo(() => {
    if (__DEV__) {
    }
    
    const fetchDailyMix = useStreamStore(s => s.fetchDailyMix);
    const fetchWeeklyMix = useStreamStore(s => s.fetchWeeklyMix);
    const refreshVersion = useStreamStore(s => s.refreshVersion);
    const isAuthReady = useMusicStore(s => s.isAuthReady);

    React.useEffect(() => {
        if (isAuthReady) {
            fetchDailyMix(refreshVersion > 0);
            fetchWeeklyMix(refreshVersion > 0);
        }
    }, [fetchDailyMix, fetchWeeklyMix, refreshVersion, isAuthReady]);

    return (
        <View style={styles.sectionContainer}>
            <SectionHeader
                title="Made For You"
                // subtitle="Your personal discovery mixes"
                accentColor={Colors.accent}
            />
            <View style={styles.cardsContainer}>
                <DiscoveryMixCard type="daily" />
                <DiscoveryMixCard type="weekly" />
            </View>
        </View>
    );
});

MixSection.displayName = 'MixSection';

const styles = StyleSheet.create({
    sectionContainer: {
        marginTop: 24,
    },
    cardsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 16,
        justifyContent: 'space-between',
    }
});
