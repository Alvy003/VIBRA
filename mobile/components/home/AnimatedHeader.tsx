import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, interpolate, Extrapolation, SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface AnimatedHeaderProps {
    scrollY: SharedValue<number>;
    userImageUrl?: string;
}

export const AnimatedHeader = React.memo(({ scrollY, userImageUrl }: AnimatedHeaderProps) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [0, 80, 140],
            [0, 0.85, 1],
            Extrapolation.CLAMP
        ),
    }));

    const borderStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            scrollY.value,
            [100, 160],
            [0, 0.1],
            Extrapolation.CLAMP
        ),
    }));

    return (
        <View style={[styles.wrapper, { paddingTop: insets.top }]}>
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#09090b' }]}>
                <Animated.View style={[StyleSheet.absoluteFillObject, backgroundStyle]} />
            </View>
            <Animated.View style={[styles.border, borderStyle]} />

            <View style={styles.content}>
                <View style={styles.left}>
                    <Image
                        source={require('@/assets/images/vibra.png')}
                        style={styles.logo}
                        cachePolicy="memory"
                    />
                    <Text style={styles.brandText}>VIBRA</Text>
                </View>

                <View style={styles.right}>
                    <TouchableOpacity
                        onPress={() => router.push('/search' as any)}
                        style={styles.iconButton}
                        activeOpacity={0.7}
                    >
                        <Search size={17} color="#d4d4d8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/profile' as any)}
                        style={styles.avatarButton}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={{ uri: userImageUrl || 'https://avatar.iran.liara.run/public/boy', width: 100, height: 100 }}
                            style={styles.avatar}
                            cachePolicy="memory-disk"
                            transition={200}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

AnimatedHeader.displayName = 'AnimatedHeader';

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        overflow: 'hidden',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logo: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    brandText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 13,
        letterSpacing: 0.5,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    border: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#fff',
    },
});
