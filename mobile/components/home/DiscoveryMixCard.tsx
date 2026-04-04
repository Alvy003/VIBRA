import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { RADIUS } from '@/constants/design';
import { useStreamStore } from '@/stores/useStreamStore';
import { MixCover } from './MixCover';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

interface DiscoveryMixCardProps {
    type: 'daily' | 'weekly';
}

export const DiscoveryMixCard = React.memo(({ type }: DiscoveryMixCardProps) => {
    const router = useRouter();
    const { dailyMix, weeklyMix } = useStreamStore();
    
    const isWeekly = type === 'weekly';
    const mixData = isWeekly ? weeklyMix?.results : dailyMix;
    const isEligible = isWeekly ? weeklyMix?.eligible : !!(dailyMix && dailyMix.length > 0);
    
    const firstSong = mixData && mixData.length > 0 ? mixData[0] : null;
    const accentColor = isWeekly ? '#8b5cf6' : '#ec4899';
    const label = isWeekly ? 'Weekly Mix' : 'Daily Mix';

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({
            pathname: "/(tabs)/playlist/[id]" as any,
            params: { id: `${type}-mix` }
        });
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.9}
            style={styles.container}
        >
            <View style={styles.card}>
                {/* 1. Base Creative Cover (The "Creative" part) */}
                <MixCover 
                    variant={type}
                    style={StyleSheet.absoluteFill} 
                />

                {/* Lock/Progress Overlay for Weekly */}
                {isWeekly && !isEligible && (
                    <View style={styles.lockedOverlay}>
                         <View style={styles.progressBar}>
                             <View 
                                style={[
                                    styles.progressFill, 
                                    { width: `${Math.min(((weeklyMix?.progress?.count || 0) / 20) * 100, 100)}%`, backgroundColor: accentColor }
                                ]} 
                             />
                         </View>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

DiscoveryMixCard.displayName = 'DiscoveryMixCard';

const styles = StyleSheet.create({
    container: {
        width: CARD_SIZE,
        height: CARD_SIZE,
        borderRadius: RADIUS.md,
        overflow: 'hidden',
    },
    card: {
        flex: 1,
        backgroundColor: '#09090b',
        position: 'relative',
    },
    labelBar: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
    },
    labelBackground: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.9,
    },
    labelText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
        paddingHorizontal: 10,
        paddingVertical: 4,
        textTransform: 'uppercase',
        letterSpacing: -0.5,
        zIndex: 2,
    },
    lockedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        padding: 10,
    },
    progressBar: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 1.5,
        overflow: 'hidden',
        marginBottom: 35, // Positioned above the label bar area
    },
    progressFill: {
        height: '100%',
        borderRadius: 1.5,
    }
});
