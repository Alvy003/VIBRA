import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import Colors from '@/constants/Colors';
import { BlurView } from 'expo-blur';
import { COLORS, RADIUS } from '@/constants/design';
import * as Haptics from 'expo-haptics';

interface CreatePlaylistModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}

export const CreatePlaylistModal = ({ visible, onClose, onCreate }: CreatePlaylistModalProps) => {
    const [name, setName] = useState('');

    const handleCreate = () => {
        if (!name.trim()) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onCreate(name.trim());
        setName('');
        onClose();
    };

    const handleCancel = () => {
        setName('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.container}
                    >
                        <View style={styles.content}>
                            <Text style={styles.title}>Give your playlist a name</Text>

                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="My playlist"
                                    placeholderTextColor={Colors.textMuted}
                                    autoFocus
                                    selectionColor={Colors.accent}
                                />
                                <View style={styles.underline} />
                            </View>

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    onPress={handleCancel}
                                    style={styles.button}
                                >
                                    <Text style={styles.buttonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleCreate}
                                    disabled={!name.trim()}
                                    style={[
                                        styles.createButton,
                                        !name.trim() && styles.buttonDisabled
                                    ]}
                                >
                                    <Text style={[
                                        styles.createButtonText,
                                        !name.trim() && styles.textDisabled
                                    ]}>
                                        Create
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
    backgroundColor: Colors.blackAlpha50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '100%',
        alignItems: 'center',
    },
    content: {
        width: '85%',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 40,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 60,
        alignItems: 'center',
    },
    input: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        width: '100%',
        paddingVertical: 10,
    },
    underline: {
        height: 1,
        backgroundColor: Colors.textMuted,
        width: '100%',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 20,
    },
    button: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: Colors.textMuted,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    createButton: {
        paddingHorizontal: 40,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: Colors.accent,
    },
    buttonDisabled: {
        backgroundColor: Colors.border,
        borderColor: Colors.border,
    },
    createButtonText: {
        color: Colors.background,
        fontSize: 16,
        fontWeight: '600',
    },
    textDisabled: {
        color: Colors.textMuted,
    }
});
