import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';

export const OfflineDownloadsCard = () => {
    const router = useRouter();

    return (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/downloads')}
        >
            <View style={styles.container}>
                <Text style={styles.headerTitle}>While you're offline</Text>
                <View style={styles.textContainer}>
                    <Text style={styles.subtitle}>
                        View and play your downloaded tracks while you're offline.
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: -0.3,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.surfaceLighter,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    subtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
    }
});
