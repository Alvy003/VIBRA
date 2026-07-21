import Colors from '@/constants/Colors';
import { RADIUS } from '@/constants/design';
import { useStreamStore } from '@/stores/useStreamStore';
import { useToastStore } from '@/stores/useToastStore';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MixCover } from './MixCover';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

interface DiscoveryMixCardProps {
    type: 'daily' | 'weekly';
}

export const DiscoveryMixCard = React.memo(({ type }: DiscoveryMixCardProps) => {
    if (__DEV__) {
    }
    const router = useRouter();
    const dailyMix = useStreamStore(s => s.dailyMix);
    const weeklyMix = useStreamStore(s => s.weeklyMix);

    const isWeekly = type === 'weekly';
    const mixData = isWeekly ? weeklyMix?.results : dailyMix;
    const isEligible = isWeekly ? weeklyMix?.eligible : !!(dailyMix && dailyMix.length > 0);

    const firstSong = mixData && mixData.length > 0 ? mixData[0] : null;
    const accentColor = isWeekly ? Colors.accent : Colors.accent; // Both use central accent for consistency
    const label = isWeekly ? 'Weekly Mix' : 'Daily Mix';

    const handlePress = () => {
        if (!isEligible) {
            useToastStore.getState().showToast({ message: `Keep listening to unlock ${label}.` });
            return;
        }
        router.push({
            pathname: "/(tabs)/playlist/[id]" as any,
            params: { id: `${type}-mix`, from: 'home' }
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

                {/* Lock/Progress Overlay */}
                {!isEligible && (
                    <View style={styles.lockedOverlay}>
                        <View style={styles.lockContainer}>
                            <Lock color={Colors.textPrimary} size={28} opacity={0.9} />
                        </View>
                        {isWeekly && (
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${Math.min(((weeklyMix?.progress?.count || 0) / 20) * 100, 100)}%`, backgroundColor: accentColor }
                                    ]}
                                />
                            </View>
                        )}
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
        backgroundColor: Colors.background,
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
        color: Colors.textPrimary,
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
        backgroundColor: Colors.blackAlpha50,
        justifyContent: 'center',
        padding: 10,
    },
    lockContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    progressBar: {
        height: 3,
        backgroundColor: Colors.whiteAlpha20,
        borderRadius: 1.5,
        overflow: 'hidden',
        position: 'absolute',
        bottom: 12,
        left: 10,
        right: 10,
    },
    progressFill: {
        height: '100%',
        borderRadius: 1.5,
    }
});
