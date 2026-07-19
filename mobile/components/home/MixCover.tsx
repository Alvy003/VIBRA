import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';

const GRAIN_TEXTURE = require('../../assets/images/grain.jpg');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Floating Orb (replaces GeometricShape + AnimatedBlob) ───────────────────
const FloatingOrb = React.memo(({
    color,
    size,
    initialPos,
    duration = 10000,
    dominant = false,
    gradientStart = { x: 0.3, y: 0.3 },
    gradientEnd = { x: 1, y: 1 },
    opacity = 1,
    animated = true,
}: {
    color: string;
    size: number;
    initialPos: { x: number; y: number };
    duration?: number;
    dominant?: boolean;
    gradientStart?: { x: number; y: number };
    gradientEnd?: { x: number; y: number };
    opacity?: number;
    animated?: boolean;
}) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);

    useEffect(() => {
        if (!animated) return;

        if (Platform.OS === 'android') {
            // Simplified animation for Android to reduce CPU/GPU redraws on Xiaomi/lower-end devices
            translateX.value = withRepeat(
                withTiming(dominant ? 8 : 12, { duration: duration * 1.5, easing: Easing.inOut(Easing.sin) }),
                -1,
                true
            );
            translateY.value = withRepeat(
                withTiming(dominant ? -10 : -14, { duration: duration * 1.8, easing: Easing.inOut(Easing.sin) }),
                -1,
                true
            );
            scale.value = 1.0; // Disable real-time gradient scale redraws on Android!
            return;
        }

        const delay = Math.random() * 800;
        const timer = setTimeout(() => {
            translateX.value = withRepeat(
                withSequence(
                    withTiming(dominant ? 14 : 20, { duration, easing: Easing.inOut(Easing.sin) }),
                    withTiming(dominant ? -14 : -20, { duration, easing: Easing.inOut(Easing.sin) })
                ),
                -1,
                true
            );
            translateY.value = withRepeat(
                withSequence(
                    withTiming(dominant ? -16 : -24, { duration: duration * 1.3, easing: Easing.inOut(Easing.sin) }),
                    withTiming(dominant ? 16 : 24, { duration: duration * 1.3, easing: Easing.inOut(Easing.sin) })
                ),
                -1,
                true
            );
            scale.value = withRepeat(
                withSequence(
                    withTiming(dominant ? 1.06 : 1.1, { duration: duration * 1.5 }),
                    withTiming(0.94, { duration: duration * 1.5 })
                ),
                -1,
                true
            );
        }, delay);
        return () => clearTimeout(timer);
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    left: initialPos.x,
                    top: initialPos.y,
                    opacity,
                },
                animStyle,
            ]}
        >
            <LinearGradient
                colors={[color, 'transparent']}
                style={StyleSheet.absoluteFill}
                start={gradientStart}
                end={gradientEnd}
            />
        </Animated.View>
    );
});

FloatingOrb.displayName = 'FloatingOrb';

// ─── Noise Overlay ────────────────────────────────────────────────────────────
const NoiseOverlay = React.memo(() => (
    <Image
        source={GRAIN_TEXTURE}
        style={[StyleSheet.absoluteFill, { opacity: 0.06 }]}
        contentFit="cover"
        cachePolicy="memory"
        priority="low"
    />
));

NoiseOverlay.displayName = 'NoiseOverlay';

// ─── Time Context ─────────────────────────────────────────────────────────────
const getTimeContext = () => {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;
    if (hour >= 5 && hour < 12) return { type: 'morning', isWeekend };
    if (hour >= 12 && hour < 17) return { type: 'afternoon', isWeekend };
    if (hour >= 17 && hour < 21) return { type: 'evening', isWeekend };
    return { type: 'night', isWeekend };
};

export const getMixBaseColor = (variant: 'daily' | 'weekly') => {
    const { type } = getTimeContext();
    if (variant === 'daily') {
        if (type === 'morning') return '#772269';
        if (type === 'afternoon') return '#9e30e0';
        if (type === 'evening') return '#ba2899';
        return '#9333ea'; // night
    } else {
        if (type === 'morning') return '#6640e9';
        if (type === 'afternoon') return '#522cbe';
        if (type === 'evening') return '#351c70';
        return '#2d306eff'; // night
    }
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface MixCoverProps {
    variant: 'daily' | 'weekly';
    title?: string;
    style?: any;
    animated?: boolean;
}

export const MixCover = React.memo(({ variant, style, animated = true }: MixCoverProps) => {
    const isDaily = variant === 'daily';
    const context = useMemo(() => getTimeContext(), []);

    const config = useMemo(() => {
        const { type, isWeekend } = context;

        const palettes: Record<string, any> = {
            morning: {
                daily: {
                    gradient: ['#771126', '#3b1c70', '#050507'],
                    orbs: [
                        { 
                            color: 'rgba(225,29,72,0.85)', size: 300, 
                            pos: { x: -90, y: -80 }, 
                            dominant: true, duration: 9000,
                            gradientStart: { x: 0.2, y: 0.2 },
                            gradientEnd: { x: 1, y: 1 }
                        },
                        { 
                            color: 'rgba(124,58,237,0.7)', size: 240, 
                            pos: { x: 80, y: 160 },
                            duration: 11000,
                            gradientStart: { x: 0.5, y: 0 },
                            gradientEnd: { x: 0, y: 1 }
                        },
                        { 
                            color: 'rgba(251,113,133,0.5)', size: 180, 
                            pos: { x: 160, y: -40 },
                            duration: 13000,
                            gradientStart: { x: 0, y: 0.5 },
                            gradientEnd: { x: 1, y: 0.5 }
                        },
                    ],
                    accents: [
                        { color: 'rgba(255,255,255,0.9)', size: 6, pos: { x: 60, y: 80 } },
                        { color: 'rgba(251,113,133,1)', size: 4, pos: { x: 200, y: 200 } },
                        { color: 'rgba(255,255,255,0.7)', size: 3, pos: { x: 140, y: 120 } },
                    ],
                    label: 'DAILY MIX',
                    subtitle: 'Morning Energy',
                },
                weekly: {
                    gradient: ['#282375', '#3b1c70', '#050507'],
                    orbs: [
                        { 
                            color: 'rgba(99,102,241,0.9)', size: 300, 
                            pos: { x: -90, y: -80 },
                            dominant: true, duration: 12000,
                            gradientStart: { x: 0.2, y: 0.2 },
                            gradientEnd: { x: 1, y: 1 }
                        },
                        { 
                            color: 'rgba(167,139,250,0.65)', size: 220, 
                            pos: { x: 100, y: 170 },
                            duration: 14000,
                            gradientStart: { x: 0.5, y: 0 },
                            gradientEnd: { x: 0, y: 1 }
                        },
                        { 
                            color: 'rgba(79,70,229,0.4)', size: 160, 
                            pos: { x: 170, y: -30 },
                            duration: 16000,
                            gradientStart: { x: 0, y: 0.5 },
                            gradientEnd: { x: 1, y: 0.5 }
                        },
                    ],
                    accents: [
                        { color: 'rgba(255,255,255,0.9)', size: 6, pos: { x: 70, y: 90 } },
                        { color: 'rgba(167,139,250,1)', size: 4, pos: { x: 190, y: 190 } },
                        { color: 'rgba(255,255,255,0.6)', size: 3, pos: { x: 130, y: 140 } },
                    ],
                    label: 'WEEKLY MIX',
                    subtitle: 'Just for you',
                },
            },
            afternoon: {
                daily: {
                    gradient: ['#61176b', '#3b1c70', '#050507'],
                    orbs: [
                        { 
                            color: 'rgba(192,38,211,0.9)', size: 300, 
                            pos: { x: -90, y: -80 },
                            dominant: true, duration: 9000,
                            gradientStart: { x: 0.2, y: 0.2 },
                            gradientEnd: { x: 1, y: 1 }
                        },
                        { 
                            color: 'rgba(139,92,246,0.65)', size: 230, 
                            pos: { x: 90, y: 150 },
                            duration: 11000,
                            gradientStart: { x: 0.5, y: 0 },
                            gradientEnd: { x: 0, y: 1 }
                        },
                        { 
                            color: 'rgba(232,121,249,0.45)', size: 170, 
                            pos: { x: 160, y: -40 },
                            duration: 13000,
                            gradientStart: { x: 0, y: 0.5 },
                            gradientEnd: { x: 1, y: 0.5 }
                        },
                    ],
                    accents: [
                        { color: 'rgba(255,255,255,0.9)', size: 6, pos: { x: 55, y: 75 } },
                        { color: 'rgba(232,121,249,1)', size: 4, pos: { x: 195, y: 195 } },
                        { color: 'rgba(255,255,255,0.6)', size: 3, pos: { x: 145, y: 115 } },
                    ],
                    label: 'DAILY MIX',
                    subtitle: "Today's Energy",
                },
                weekly: {
                    gradient: ['#1c1852', '#35136b', '#050507'],
                    orbs: [
                        { 
                            color: 'rgba(79,70,229,0.9)', size: 300, 
                            pos: { x: -90, y: -80 },
                            dominant: true, duration: 12000,
                            gradientStart: { x: 0.2, y: 0.2 },
                            gradientEnd: { x: 1, y: 1 }
                        },
                        { 
                            color: 'rgba(139,92,246,0.6)', size: 220, 
                            pos: { x: 100, y: 160 },
                            duration: 14000,
                            gradientStart: { x: 0.5, y: 0 },
                            gradientEnd: { x: 0, y: 1 }
                        },
                        { 
                            color: 'rgba(109,40,217,0.4)', size: 160, 
                            pos: { x: 165, y: -35 },
                            duration: 16000,
                            gradientStart: { x: 0, y: 0.5 },
                            gradientEnd: { x: 1, y: 0.5 }
                        },
                    ],
                    accents: [
                        { color: 'rgba(255,255,255,0.9)', size: 6, pos: { x: 65, y: 85 } },
                        { color: 'rgba(139,92,246,1)', size: 4, pos: { x: 185, y: 185 } },
                        { color: 'rgba(255,255,255,0.6)', size: 3, pos: { x: 135, y: 130 } },
                    ],
                    label: 'WEEKLY MIX',
                    subtitle: 'Just for you',
                },
            },
            evening: {
                daily: {
                    gradient: ['#4a1a75', '#700e24', '#050507'],
                    orbs: [
                        { 
                            color: 'rgba(147,51,234,0.9)', size: 300, 
                            pos: { x: -90, y: -80 },
                            dominant: true, duration: 10000,
                            gradientStart: { x: 0.2, y: 0.2 },
                            gradientEnd: { x: 1, y: 1 }
                        },
                        { 
                            color: 'rgba(225,29,72,0.65)', size: 230, 
                            pos: { x: 95, y: 155 },
                            duration: 12000,
                            gradientStart: { x: 0.5, y: 0 },
                            gradientEnd: { x: 0, y: 1 }
                        },
                        { 
                            color: 'rgba(192,38,211,0.45)', size: 170, 
                            pos: { x: 160, y: -35 },
                            duration: 14000,
                            gradientStart: { x: 0, y: 0.5 },
                            gradientEnd: { x: 1, y: 0.5 }
                        },
                    ],
                    accents: [
                        { color: 'rgba(255,255,255,0.9)', size: 6, pos: { x: 58, y: 78 } },
                        { color: 'rgba(249,168,212,1)', size: 4, pos: { x: 192, y: 192 } },
                        { color: 'rgba(255,255,255,0.6)', size: 3, pos: { x: 138, y: 118 } },
                    ],
                    label: 'DAILY MIX',
                    subtitle: 'Evening Vibes',
                },
                weekly: {
                    gradient: ['#0f0d26', '#260f4a', '#050507'],
                    orbs: [
                        { 
                            color: 'rgba(99,102,241,0.8)', size: 300, 
                            pos: { x: -90, y: -80 },
                            dominant: true, duration: 13000,
                            gradientStart: { x: 0.2, y: 0.2 },
                            gradientEnd: { x: 1, y: 1 }
                        },
                        { 
                            color: 'rgba(124,58,237,0.55)', size: 220, 
                            pos: { x: 100, y: 160 },
                            duration: 15000,
                            gradientStart: { x: 0.5, y: 0 },
                            gradientEnd: { x: 0, y: 1 }
                        },
                        { 
                            color: 'rgba(139,92,246,0.35)', size: 160, 
                            pos: { x: 165, y: -35 },
                            duration: 17000,
                            gradientStart: { x: 0, y: 0.5 },
                            gradientEnd: { x: 1, y: 0.5 }
                        },
                    ],
                    accents: [
                        { color: 'rgba(255,255,255,0.85)', size: 6, pos: { x: 62, y: 82 } },
                        { color: 'rgba(167,139,250,1)', size: 4, pos: { x: 188, y: 188 } },
                        { color: 'rgba(255,255,255,0.55)', size: 3, pos: { x: 132, y: 128 } },
                    ],
                    label: 'WEEKLY MIX',
                    subtitle: isWeekend ? 'Weekend Recap' : 'Weekly Recap',
                },
            },
            night: {
                daily: {
                    gradient: ['#2c0e44', '#181740', '#050507'],
                    orbs: [
                        { 
                            color: 'rgba(126,34,206,0.9)', size: 300, 
                            pos: { x: -90, y: -80 },
                            dominant: true, duration: 14000,
                            gradientStart: { x: 0.2, y: 0.2 },
                            gradientEnd: { x: 1, y: 1 }
                        },
                        { 
                            color: 'rgba(168,85,247,0.55)', size: 220, 
                            pos: { x: 100, y: 160 },
                            duration: 16000,
                            gradientStart: { x: 0.5, y: 0 },
                            gradientEnd: { x: 0, y: 1 }
                        },
                        { 
                            color: 'rgba(109,40,217,0.35)', size: 165, 
                            pos: { x: 165, y: -35 },
                            duration: 18000,
                            gradientStart: { x: 0, y: 0.5 },
                            gradientEnd: { x: 1, y: 0.5 }
                        },
                    ],
                    accents: [
                        { color: 'rgba(255,255,255,0.85)', size: 5, pos: { x: 62, y: 82 } },
                        { color: 'rgba(216,180,254,1)', size: 4, pos: { x: 185, y: 185 } },
                        { color: 'rgba(255,255,255,0.5)', size: 3, pos: { x: 130, y: 125 } },
                    ],
                    label: 'DAILY MIX',
                    subtitle: 'Late Night Vibes',
                },
                weekly: {
                    gradient: ['#0f0d26', '#070b14', '#050507'],
                    orbs: [
                        { 
                            color: 'rgba(79,70,229,0.75)', size: 300, 
                            pos: { x: -90, y: -80 },
                            dominant: true, duration: 15000,
                            gradientStart: { x: 0.2, y: 0.2 },
                            gradientEnd: { x: 1, y: 1 }
                        },
                        { 
                            color: 'rgba(99,102,241,0.5)', size: 220, 
                            pos: { x: 100, y: 165 },
                            duration: 17000,
                            gradientStart: { x: 0.5, y: 0 },
                            gradientEnd: { x: 0, y: 1 }
                        },
                        { 
                            color: 'rgba(67,56,202,0.35)', size: 160, 
                            pos: { x: 165, y: -35 },
                            duration: 19000,
                            gradientStart: { x: 0, y: 0.5 },
                            gradientEnd: { x: 1, y: 0.5 }
                        },
                    ],
                    accents: [
                        { color: 'rgba(255,255,255,0.8)', size: 5, pos: { x: 65, y: 85 } },
                        { color: 'rgba(129,140,248,1)', size: 4, pos: { x: 182, y: 182 } },
                        { color: 'rgba(255,255,255,0.5)', size: 3, pos: { x: 128, y: 122 } },
                    ],
                    label: 'WEEKLY MIX',
                    subtitle: isWeekend ? 'Weekend Recap' : 'Your Weekly Recap',
                },
            },
        };
        return palettes[type][isDaily ? 'daily' : 'weekly'];
    }, [isDaily, context]);

    return (
        <View style={[styles.container, style]}>
            {/* 1. Base Gradient */}
            <LinearGradient
                colors={config.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* 2. Floating Orbs */}
            {config.orbs.map((orb: any, i: number) => (
                <FloatingOrb
                    key={`${variant}-orb-${i}`}
                    color={orb.color}
                    size={orb.size}
                    initialPos={orb.pos}
                    duration={orb.duration}
                    dominant={orb.dominant}
                    gradientStart={orb.gradientStart}
                    gradientEnd={orb.gradientEnd}
                    opacity={orb.opacity ?? 1}
                    animated={animated}
                    />
            ))}

            {/* 3. Grain Texture */}
            <NoiseOverlay />

            {/* Subtle Overlay to make it feel "baked in" */}
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)', zIndex: 1 }} />

            {/* 4. Bottom vignette for text readability */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                locations={[0.6, 1]}
                style={styles.vignette}
            />

            {/* 5. Typography */}
            <View style={styles.textContainer}>
                <Text style={styles.label}>{config.label}</Text>
                <Text style={styles.subtitle}>{config.subtitle}</Text>
            </View>
        </View>
    );
});

MixCover.displayName = 'MixCover';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090b',
        overflow: 'hidden',
    },
    vignette: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '55%',
    },
    textContainer: {
        position: 'absolute',
        bottom: 20,
        left: 18,
        right: 18,
    },
    label: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
        textTransform: 'uppercase',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.60)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 3,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
});
