import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Play, Trophy, ArrowRight } from 'lucide-react-native';
import { useStreamStore } from '@/stores/useStreamStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { COLORS, RADIUS } from '@/constants/design';
import Colors from '@/constants/Colors';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WeeklyMixCard = React.memo(({ index = 0 }: { index?: number }) => {
    const { weeklyMix, fetchWeeklyMix, isLoadingWeeklyMix } = useStreamStore();
    const initializeQueue = usePlayerStore(state => state.initializeQueue);

    const glowValue = useSharedValue(0);

    useEffect(() => {
        if (!weeklyMix && !isLoadingWeeklyMix) {
            fetchWeeklyMix();
        }

        glowValue.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
                withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
    }, [weeklyMix, isLoadingWeeklyMix, fetchWeeklyMix]);

    const handlePlay = useCallback(() => {
        if (weeklyMix?.eligible && (weeklyMix.results?.length ?? 0) > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            initializeQueue(weeklyMix.results!, 0, {
                type: 'discovery',
                id: 'weekly-mix',
                title: weeklyMix.metadata?.name || 'Weekly Mix'
            });
        }
    }, [initializeQueue, weeklyMix]);

    const glowStyle = useAnimatedStyle(() => ({
        opacity: 0.2 + glowValue.value * 0.3,
        transform: [{ scale: 1 + glowValue.value * 0.05 }],
    }));

    if (!weeklyMix) return null;

    const isEligible = weeklyMix.eligible;

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100).duration(800)}
            style={styles.container}
        >
            <TouchableOpacity
                onPress={isEligible ? handlePlay : undefined}
                activeOpacity={isEligible ? 0.9 : 1}
                style={styles.touchable}
            >
                <View style={styles.card}>
                    <LinearGradient
                        colors={isEligible ? [Colors.primary, Colors.primaryDark] : [Colors.surfaceLighter, Colors.background]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Animated Aura */}
                    {isEligible && (
                        <Animated.View style={[styles.glowLayer, glowStyle]}>
                            <LinearGradient
                                colors={[Colors.primaryLight, 'transparent']}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    )}

                    <View style={styles.content}>
                        <View style={styles.textContent}>
                            <View style={styles.header}>
                                <View style={[styles.badge, { backgroundColor: isEligible ? Colors.whiteAlpha10 : Colors.primaryAlpha10 }]}>
                                    {isEligible ? (
                                        <Sparkles size={12} color={Colors.white} />
                                    ) : (
                                        <Trophy size={12} color={Colors.accent} />
                                    )}
                                    <Text style={[styles.badgeText, { color: isEligible ? Colors.white : Colors.accent }]}>
                                        {isEligible ? 'WEEKEND VIBE' : 'RECAP PROGRESS'}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.title}>
                                {isEligible ? (weeklyMix.metadata?.name || 'The Weekly Recap') : 'Unlock Your Week'}
                            </Text>
                            <Text style={styles.subtitle}>
                                {isEligible
                                    ? (weeklyMix.metadata?.description || 'Your personalized weekly discovery mix.')
                                    : `Listen to ${20 - (weeklyMix.progress?.count || 0)} more songs to unlock your weekend vibe.`
                                }
                            </Text>

                            {!isEligible && (
                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBar}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                { width: `${Math.min(((weeklyMix.progress?.count || 0) / 20) * 100, 100)}%` }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.progressPercent}>
                                        {Math.floor(Math.min(((weeklyMix.progress?.count || 0) / 20) * 100, 100))}% Ready
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.actionContainer}>
                            {isEligible ? (
                                <View style={styles.playButton}>
                                    <Play size={24} color={Colors.background} fill={Colors.background} style={{ marginLeft: 2 }} />
                                </View>
                            ) : (
                                <View style={styles.lockedIcon}>
                                    <ArrowRight size={20} color={Colors.whiteAlpha30} />
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

WeeklyMixCard.displayName = 'WeeklyMixCard';

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    touchable: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.primaryAlpha15,
    },
    card: {
        padding: 24,
        minHeight: 160,
        position: 'relative',
        overflow: 'hidden',
    },
    glowLayer: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2,
    },
    textContent: {
        flex: 1,
        paddingRight: 16,
    },
    header: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    title: {
        color: Colors.white,
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 6,
    },
    subtitle: {
        color: Colors.whiteAlpha60,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '400',
    },
    progressContainer: {
        marginTop: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: Colors.whiteAlpha10,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.accent,
        borderRadius: 2,
    },
    progressPercent: {
        color: Colors.accent,
        fontSize: 11,
        fontWeight: '600',
    },
    actionContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.textPrimary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    lockedIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    }
});
