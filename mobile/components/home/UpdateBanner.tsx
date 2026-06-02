import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/design';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

interface UpdateBannerProps {
    apkLink: string;
    version: string;
}

export const UpdateBanner = ({ apkLink, version }: UpdateBannerProps) => {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    const handleUpdate = () => {
        Linking.openURL(apkLink).catch(err => {
            console.error('Failed to open update link:', err);
        });
    };

    return (
        <Animated.View 
            entering={FadeInUp.delay(500)} 
            exiting={FadeOutUp}
            style={styles.container}
        >
            <BlurView intensity={60} tint="dark" style={styles.blur}>
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="cloud-download-outline" size={24} color="#a855f7" />
                    </View>
                    
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>Update Available</Text>
                        <Text style={styles.subtitle}>Version {version} is now ready with new features.</Text>
                    </View>

                    <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
                        <Text style={styles.updateText}>Update</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.closeButton} onPress={() => setVisible(false)}>
                        <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                </View>
            </BlurView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: Platform.OS === 'ios' ? 10 : 10, // Adjust for status bar/header
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        zIndex: 100,
    },
    blur: {
        padding: 12,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(168, 85, 247, 0.15)', // Purple tint
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginTop: 1,
    },
    updateButton: {
        backgroundColor: '#a855f7',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    updateText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    }
});
