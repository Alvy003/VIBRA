import Colors from '@/constants/Colors';
import * as Sentry from '@sentry/react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ForcedUpdateModalProps {
    visible: boolean;
    apkLink: string;
    version: string;
}

export const ForcedUpdateModal = ({ visible, apkLink, version }: ForcedUpdateModalProps) => {
    const handleUpdate = () => {
        Linking.openURL(apkLink).catch(err => {
            Sentry.captureException(err);
        });
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                
                <Animated.View entering={FadeIn.delay(200)} style={styles.container}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="cloud-download-outline" size={48} color={Colors.accent} />
                    </View>
                    
                    <Text style={styles.title}>New Version Available</Text>
                    <Text style={styles.versionTag}>v{version}</Text>
                    
                    <Text style={styles.message}>
                        To keep Vibra running smoothly and securely, we require you to update to the latest version.
                    </Text>

                    <View style={styles.featuresList}>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={15} color={Colors.accent} />
                            <Text style={styles.featureText}>Performance Improvements</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={15} color={Colors.accent} />
                            <Text style={styles.featureText}>Security Enhancements</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={15} color={Colors.accent} />
                            <Text style={styles.featureText}>Bug Fixes & Stability</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
                        <Text style={styles.updateText}>Download Update</Text>
                        <Ionicons name="arrow-forward" size={18} color={Colors.black} style={{ marginLeft: 8 }} />
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
        backgroundColor: Colors.blackAlpha70,
    },
    container: {
        width: '85%',
        padding: 24,
        borderRadius: 28,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.whiteAlpha10,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.primaryAlpha10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: Colors.textPrimary,
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
    },
    versionTag: {
        color: Colors.accent,
        fontSize: 12.5,
        fontWeight: '600',
        marginTop: 4,
        backgroundColor: Colors.primaryAlpha10,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 12,
    },
    message: {
        color: Colors.textSecondary,
        fontSize: 12,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 20,
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
        color: Colors.textPrimary,
        fontSize: 12.5,
        marginLeft: 6,
        fontWeight: '500',
        opacity: 0.7,
    },
    updateButton: {
        backgroundColor: Colors.accent,
        width: '100%',
        height: 40,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    updateText: {
        color: Colors.black,
        fontSize: 14,
        fontWeight: '600',
    },
    footerText: {
        color: Colors.textMuted,
        fontSize: 10,
        marginTop: 10,
    }
});
