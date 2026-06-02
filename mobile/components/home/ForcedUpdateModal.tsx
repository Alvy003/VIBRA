import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Modal, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/design';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ForcedUpdateModalProps {
    visible: boolean;
    apkLink: string;
    version: string;
}

export const ForcedUpdateModal = ({ visible, apkLink, version }: ForcedUpdateModalProps) => {
    const handleUpdate = () => {
        Linking.openURL(apkLink).catch(err => {
            console.error('Failed to open update link:', err);
        });
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                
                <Animated.View entering={FadeIn.delay(200)} style={styles.container}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="rocket-outline" size={48} color="#a855f7" />
                    </View>
                    
                    <Text style={styles.title}>New Version Available</Text>
                    <Text style={styles.versionTag}>v{version}</Text>
                    
                    <Text style={styles.message}>
                        To keep Vibra running smoothly and securely, we require you to update to the latest version.
                    </Text>

                    <View style={styles.featuresList}>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={18} color="#a855f7" />
                            <Text style={styles.featureText}>Performance Improvements</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={18} color="#a855f7" />
                            <Text style={styles.featureText}>Security Enhancements</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={18} color="#a855f7" />
                            <Text style={styles.featureText}>Bug Fixes & Stability</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
                        <Text style={styles.updateText}>Update Now</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                    
                    <Text style={styles.footerText}>You will be redirected to the download page.</Text>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    container: {
        width: '85%',
        padding: 24,
        borderRadius: 28,
        backgroundColor: '#18181b',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
    },
    versionTag: {
        color: '#a855f7',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    message: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 22,
    },
    featuresList: {
        width: '100%',
        marginTop: 24,
        marginBottom: 32,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    featureText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        marginLeft: 10,
        fontWeight: '500',
    },
    updateButton: {
        backgroundColor: '#8b12fcff',
        width: '100%',
        height: 46,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        // shadowColor: '#a855f7',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    updateText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    footerText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 16,
    }
});
