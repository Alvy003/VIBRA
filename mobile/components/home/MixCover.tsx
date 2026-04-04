import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withSequence,
    Easing,
    interpolate
} from 'react-native-reanimated';

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

export const MixCover = React.memo(({ variant, style }: MixCoverProps) => {
    const isDaily = variant === 'daily';

    // Design Tokens
    const config = useMemo(() => {
        if (isDaily) {
            return {
                baseGradient: ['#7e22ce', '#db2777', '#f59e0b'] as string[],
                blobs: [
                    { color: '#f472b6', size: 200, pos: { x: -20, y: -20 }, duration: 7000 },
                    { color: '#fbbf24', size: 180, pos: { x: 100, y: 80 }, duration: 9000 },
                    { color: '#8b5cf6', size: 220, pos: { x: -40, y: 120 }, duration: 11000 },
                ],
                label: 'DAILY MIX',
                subtitle: "Today's Energy",
                glassOpacity: 0,
            };
        }
        return {
            baseGradient: ['#310a5b', '#4c1d95', '#310a5b'] as string[],
            blobs: [
                { color: '#9333ea', size: 240, pos: { x: -30, y: 20 }, duration: 15000 },
                { color: '#7c3aed', size: 220, pos: { x: 80, y: 100 }, duration: 18000 },
            ],
            label: 'WEEKLY MIX',
            subtitle: 'Your Recap',
            glassOpacity: 0.08,
        };
    }, [variant]);

    return (
        <View style={[styles.container, style]}>
            {/* Layer 1: Base Gradient */}
            <LinearGradient
                colors={config.baseGradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Layer 2: Animated Blobs */}
            {config.blobs.map((blob, i) => (
                <AnimatedBlob 
                    key={`${variant}-blob-${i}`}
                    color={blob.color}
                    size={blob.size}
                    initialPos={blob.pos}
                    duration={blob.duration}
                />
            ))}

            {/* Layer 3: Glass Overlay (Weekly only) */}
            {config.glassOpacity > 0 && (
                <View style={[styles.glassOverlay, { opacity: config.glassOpacity }]} />
            )}

            {/* Layer 4: Vignette for text readability */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.vignette}
            />

            {/* Layer 5: Typography (Bottom-Left) */}
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
        opacity: 0.35,
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
        height: '60%',
    },
    textContainer: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
    },
    label: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
        textTransform: 'uppercase',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 2,
    }
});
