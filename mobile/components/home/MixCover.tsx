import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withSequence,
    Easing,
    interpolate
} from 'react-native-reanimated';

const VIBRA_LOGO = require('../../assets/images/vibra-white.png');
const GRAIN_TEXTURE = require('../../assets/images/grain.jpg');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MixCoverProps {
    variant: 'daily' | 'weekly';
    title?: string; // Optional custom title override
    style?: any;
}

/**
 * Animated Gradient Blob Component
 * Creates a soft, moving organic shape using LinearGradient
 */
const AnimatedBlob = ({ 
    color, 
    size, 
    initialPos, 
    duration = 8000, 
    delay = 0 
}: { 
    color: string, 
    size: number, 
    initialPos: { x: number, y: number },
    duration?: number,
    delay?: number
}) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);

    useEffect(() => {
        translateX.value = withRepeat(
            withSequence(
                withTiming(20, { duration, easing: Easing.inOut(Easing.sin) }),
                withTiming(-20, { duration, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
        translateY.value = withRepeat(
            withSequence(
                withTiming(-30, { duration: duration * 1.2, easing: Easing.inOut(Easing.sin) }),
                withTiming(30, { duration: duration * 1.2, easing: Easing.inOut(Easing.sin) })
            ),
            -1,
            true
        );
        scale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: duration * 1.5 }),
                withTiming(0.9, { duration: duration * 1.5 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ],
    }));

    return (
        <Animated.View 
            style={[
                styles.blobBase, 
                { 
                    width: size, 
                    height: size, 
                    borderRadius: size / 2,
                    left: initialPos.x,
                    top: initialPos.y,
                    backgroundColor: color,
                },
                animatedStyle
            ]}
        >
            <LinearGradient
                colors={[color, 'transparent']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
            />
        </Animated.View>
    );
};

/**
 * Noise Overlay Component
 * Simulates film grain for a premium texture
 */
const NoiseOverlay = () => (
    <Image 
        source={GRAIN_TEXTURE} 
        style={[StyleSheet.absoluteFill, { opacity: 0.04 }]} 
        contentFit="cover"
    />
);

/**
 * Geometric Shape for Weekly Mix
 */
const GeometricShape = ({ 
    color, 
    size, 
    initialPos, 
    variant,
    rotation = 0,
    dominant = false
}: { 
    color: string, 
    size: number, 
    initialPos: { x: number, y: number },
    variant: 'daily' | 'weekly',
    rotation?: number,
    dominant?: boolean
}) => {
    const isDaily = variant === 'daily';
    const rotate = useSharedValue(rotation);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);

    useEffect(() => {
        const randomDelay = Math.random() * 2000;
        
        const rotationDuration = isDaily 
            ? (dominant ? 18000 : 22000) 
            : (dominant ? 30000 : 35000);
            
        const scaleDuration = isDaily ? 6000 : 8000;
        const movementDuration = isDaily ? 8000 : 12000;

        const startAnimations = () => {
            rotate.value = withRepeat(
                withTiming(rotation + (dominant ? 120 : 60), { 
                    duration: rotationDuration, 
                    easing: isDaily ? Easing.inOut(Easing.sin) : Easing.linear 
                }),
                -1,
                true
            );

            scale.value = withRepeat(
                withTiming(isDaily ? 1.12 : 1.05, { 
                    duration: scaleDuration,
                    easing: Easing.inOut(Easing.sin)
                }),
                -1,
                true
            );

            if (isDaily) {
                translateX.value = withRepeat(
                    withSequence(
                        withTiming(15, { duration: movementDuration, easing: Easing.inOut(Easing.sin) }),
                        withTiming(-15, { duration: movementDuration, easing: Easing.inOut(Easing.sin) })
                    ),
                    -1,
                    true
                );
                translateY.value = withRepeat(
                    withSequence(
                        withTiming(-20, { duration: movementDuration * 1.2, easing: Easing.inOut(Easing.sin) }),
                        withTiming(20, { duration: movementDuration * 1.2, easing: Easing.inOut(Easing.sin) })
                    ),
                    -1,
                    true
                );
            }
        };

        const timeout = setTimeout(startAnimations, randomDelay);
        return () => clearTimeout(timeout);
    }, [isDaily, dominant]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate: `${rotate.value}deg` },
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ],
    }));

    return (
        <Animated.View 
            style={[
                styles.geometricBase, 
                { 
                    width: size, 
                    height: size * (dominant ? 0.8 : 0.6), 
                    left: initialPos.x,
                    top: initialPos.y,
                    backgroundColor: color,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.15)',
                    zIndex: dominant ? 2 : 1,
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: dominant ? 0.35 : 0.15,
                    shadowRadius: 20,
                },
                animatedStyle
            ]}
        >
            <BlurView intensity={dominant ? 40 : 20} style={StyleSheet.absoluteFill} tint="light" />
        </Animated.View>
    );
};

export const MixCover = React.memo(({ variant, style }: MixCoverProps) => {
    const isDaily = variant === 'daily';

    // Design Tokens
    const config = useMemo(() => {
        if (isDaily) {
            return {
                baseGradient: ['#db2777', '#be185d', '#000'] as string[],
                blobs: [],
                shapes: [
                    { color: 'rgba(244, 114, 182, 0.5)', size: 320, pos: { x: -60, y: 30 }, rotation: 15, dominant: true },
                    { color: 'rgba(251, 191, 36, 0.4)', size: 250, pos: { x: 120, y: 150 }, rotation: -20 },
                    { color: 'rgba(252, 165, 165, 0.3)', size: 200, pos: { x: 40, y: 220 }, rotation: 45 },
                ],
                label: 'DAILY MIX',
                subtitle: "Today's Energy",
                brandColor: '#e890bc',
            };
        }
        return {
            baseGradient: ['#1e1b4b', '#312e81', '#09090b'] as string[],
            blobs: [],
            shapes: [
                { color: 'rgba(167, 139, 250, 0.5)', size: 320, pos: { x: -60, y: 30 }, rotation: 15, dominant: true },
                { color: 'rgba(124, 58, 237, 0.4)', size: 250, pos: { x: 120, y: 150 }, rotation: -20 },
                { color: 'rgba(196, 181, 253, 0.3)', size: 200, pos: { x: 40, y: 220 }, rotation: 45 },
            ],
            label: 'WEEKLY MIX',
            subtitle: 'Your Recap',
            brandColor: '#a78bfa',
        };
    }, [isDaily]);

    return (
        <View style={[styles.container, style]}>
            {/* 1. Base Gradient */}
            <LinearGradient
                colors={config.baseGradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* 2. Abstract Content (Unified Geometric Glass for both) */}
            {config.shapes.map((shape, i) => (
                <GeometricShape 
                    key={`${variant}-shape-${i}`}
                    color={shape.color}
                    size={shape.size}
                    initialPos={shape.pos}
                    variant={variant}
                    rotation={shape.rotation}
                    dominant={shape.dominant}
                />
            ))}

            {/* 3. Texture Overlay (Grain) */}
            <NoiseOverlay />

            {/* 4. Glassmorphism for Weekly */}
            {!isDaily && (
                <LinearGradient
                    colors={['rgba(255,255,255,0.05)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                />
            )}

            {/* 5. Vignette for text readability */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.vignette}
            />

            {/* 6. Typography Badge */}
            <View style={styles.textContainer}>
                <Text style={styles.label}>{config.label}</Text>
                <Text style={styles.subtitle}>{config.subtitle}</Text>
            </View>

            {/* 7. Branding Mark (Top Right) */}
            <View style={styles.brandMark}>
                <Image 
                    source={VIBRA_LOGO} 
                    style={styles.logo} 
                    contentFit="contain"
                    tintColor={config.brandColor}
                />
            </View>
        </View>
    );
});

MixCover.displayName = 'MixCover';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: '#000',
        overflow: 'hidden',
        // Slight shadow for depth
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    blobBase: {
        position: 'absolute',
        opacity: 0.25,
    },
    geometricBase: {
        position: 'absolute',
        opacity: 0.4,
        borderRadius: 4,
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#fff',
    },
    vignette: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '65%',
    },
    textContainer: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
    },
    label: {
        color: '#fff',
        fontSize: 29,
        fontWeight: '700',
        letterSpacing: -1.2,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
        letterSpacing: 0.2,
        textTransform: 'uppercase',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    brandMark: {
        position: 'absolute',
        right: 0,
        top: 5,
        width: 40,
        height: 20,
    },
    logo: {
        width: '100%',
        height: '100%',
        opacity: 0.8,
    }
});
