import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import BottomSheet from '@/components/BottomSheet';

interface UpdateBannerProps {
    apkLink: string;
    version: string;
}

export const UpdateBanner = ({ apkLink, version }: UpdateBannerProps) => {
    const [visible, setVisible] = useState(true);

    const handleUpdate = () => {
        Linking.openURL(apkLink).catch(err => {
            console.error('Failed to open update link:', err);
        });
        setVisible(false);
    };

    const Header = (
        <View style={styles.header}>
            <View style={styles.iconContainer}>
                <Ionicons name="cloud-download-outline" size={32} color={Colors.accent} />
            </View>
            <Text style={styles.title}>Update Available</Text>
            <Text style={styles.subtitle}>Version {version} is now ready to install.</Text>
        </View>
    );

    return (
        <BottomSheet
            isOpen={visible}
            onClose={() => setVisible(false)}
            snapPoints={['37%']}
            header={Header}
        >
            <View style={styles.content}>
                <Text style={styles.message}>
                    A new version of Vibra is available with exciting new features, performance improvements, and bug fixes.
                </Text>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setVisible(false)}>
                        <Text style={styles.cancelText}>Update later</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
                        <Text style={styles.updateText}>Update</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
        paddingTop: 10,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.primaryAlpha10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        color: Colors.textPrimary,
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    subtitle: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
        marginTop: 4,
        textAlign: 'center',
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    message: {
        color: Colors.textMuted,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cancelText: {
        color: Colors.accent,
        fontSize: 14,
        fontWeight: '500',
    },
    updateButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    updateText: {
        color: Colors.black,
        fontSize: 14,
        fontWeight: '600',
    },
});
