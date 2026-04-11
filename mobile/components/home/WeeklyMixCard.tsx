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
                        colors={isEligible ? ['#4c1d95', '#310a5b'] : ['#18181b', '#09090b']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Animated Aura */}
                    {isEligible && (
                        <Animated.View style={[styles.glowLayer, glowStyle]}>
                            <LinearGradient
                                colors={['rgba(139, 92, 246, 0.3)', 'transparent']}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    )}

                    <View style={styles.content}>
                        <View style={styles.textContent}>
                            <View style={styles.header}>
                                <View style={[styles.badge, { backgroundColor: isEligible ? 'rgba(255,255,255,0.1)' : 'rgba(139, 92, 246, 0.1)' }]}>
                                    {isEligible ? (
                                        <Sparkles size={12} color="#fff" />
                                    ) : (
                                        <Trophy size={12} color="#7B2CF5" />
                                    )}
                                    <Text style={[styles.badgeText, { color: isEligible ? '#fff' : '#7B2CF5' }]}>
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
                                    <Play size={24} color="#000" fill="#000" style={{ marginLeft: 2 }} />
                                </View>
                            ) : (
                                <View style={styles.lockedIcon}>
                                    <ArrowRight size={20} color="rgba(255,255,255,0.3)" />
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
        borderColor: 'rgba(139, 92, 246, 0.15)',
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
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 6,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#7B2CF5',
        borderRadius: 2,
    },
    progressPercent: {
        color: '#7B2CF5',
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
        backgroundColor: '#fff',
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
