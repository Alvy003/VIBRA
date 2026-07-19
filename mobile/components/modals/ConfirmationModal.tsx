import Colors from '@/constants/Colors';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
    variant?: 'default' | 'danger';
}

export default function ConfirmationModal({
    visible,
    title,
    message,
    confirmLabel,
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    isDestructive = false,
    variant = 'default'
}: ConfirmationModalProps) {
    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <Animated.View 
                    style={StyleSheet.absoluteFill}
                >
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' }} />
                </Animated.View>

                <Animated.View 
                    style={styles.container}
                >

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={onCancel}
                            style={styles.button}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelText}>{cancelLabel}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onConfirm}
                            style={[
                                styles.button,
                            ]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.confirmText, (variant === 'danger' || isDestructive) && { color: Colors.error }]}>{confirmLabel}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: Math.min(SCREEN_WIDTH * 0.85, 320),
        borderRadius: 4,
        padding: 26,
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: Colors.surface,
    },
    title: {
        color: Colors.textPrimary,
        fontSize: 15,
        fontWeight: '600',
        alignSelf: 'flex-start',
        marginBottom: 15,
        marginTop: 5,
    },
    message: {
        color: Colors.textSecondary,
        fontSize: 13.5,
        fontWeight: '500',
        alignSelf: 'flex-start',
        lineHeight: 20,
        marginBottom: 28,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 30,
        width: '100%',
        marginTop: 8,
    },
    button: {
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    cancelText: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    confirmText: {
        color: Colors.accent,
        fontSize: 14,
        fontWeight: '600',
    },
});
