import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Keyboard,
    Dimensions,
} from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import BottomSheet, { BottomSheetRef } from '../BottomSheet';
import { resolveAssetUrl } from '@/lib/url';
import { Image } from 'expo-image';
import { Music, Trash } from 'lucide-react-native';
import Colors from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT_COLOR = Colors.accent;

interface EditPlaylistModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (name: string, description: string) => void;
    initialName: string;
    initialDescription: string;
    initialImageUrl?: string;
    onDelete?: () => void;
}

export default function EditPlaylistModal({
    visible,
    onClose,
    onSave,
    initialName,
    initialDescription,
    initialImageUrl,
    onDelete
}: EditPlaylistModalProps) {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const bottomSheetRef = React.useRef<BottomSheetRef>(null);

    useEffect(() => {
        if (visible) {
            setName(initialName);
            setDescription(initialDescription);
        }
    }, [visible, initialName, initialDescription]);

    useEffect(() => {
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            if (visible) {
                bottomSheetRef.current?.snapTo(0);
            }
        });

        return () => hideSubscription.remove();
    }, [visible]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim(), description.trim());
            onClose();
        }
    };

    const Header = (
        <View style={styles.header}>
            <TouchableOpacity
                onPress={onClose}
                style={styles.cancelButton}
                activeOpacity={0.7}
            >
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Edit Details</Text>
            </View>
            <TouchableOpacity
                onPress={handleSave}
                disabled={!name.trim()}
                activeOpacity={0.8}
                style={styles.saveButtonContainer}
            >
                <Text style={[
                    styles.saveButtonText,
                    !name.trim() && { color: Colors.textMuted }
                ]}>
                    Save
                </Text>
            </TouchableOpacity>
        </View>
    );

    const Footer = onDelete ? (
        <View style={styles.footer}>
            <TouchableOpacity 
                onPress={onDelete}
                style={styles.deleteButton}
                activeOpacity={0.7}
            >
                <Trash size={18} color={Colors.textSecondary} />
                <Text style={styles.deleteButtonText}>Delete Playlist</Text>
            </TouchableOpacity>
        </View>
    ) : undefined;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            isOpen={visible}
            onClose={onClose}
            snapPoints={['35%', '65%']}
            header={Header}
            footer={Footer}
            enablePanDownToClose={true}
            keyboardBehavior="extend"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustPan"
        >
            <View style={styles.content}>
                <View style={styles.formContainer}>
                    <View style={styles.artworkContainer}>
                        {initialImageUrl ? (
                            <Image 
                                source={{ uri: resolveAssetUrl(initialImageUrl) }}
                                style={styles.artwork}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={styles.artworkPlaceholder}>
                                <Music size={32} color={Colors.textMuted} />
                            </View>
                        )}
                    </View>

                    <View style={styles.inputsWrapper}>
                        <BottomSheetTextInput
                            style={styles.textInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="Playlist Name"
                            placeholderTextColor={Colors.textMuted}
                            maxLength={40}
                            selectionColor={ACCENT_COLOR}
                        />
                        <BottomSheetTextInput
                            style={[styles.textInput, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Description (Optional)"
                            placeholderTextColor={Colors.textMuted}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            maxLength={120}
                            selectionColor={ACCENT_COLOR}
                        />
                    </View>
                </View>
            </View>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        paddingTop: 8,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        padding: 20,
    },
    formContainer: {
        flexDirection: 'row',
        gap: 20,
    },
    artworkContainer: {
        width: 110,
        height: 110,
        borderRadius: 4,
        backgroundColor: Colors.whiteAlpha08,
        overflow: 'hidden',
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    artworkPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputsWrapper: {
        flex: 1,
        gap: 12,
    },
    textInput: {
        color: Colors.textPrimary,
        fontSize: 14,
        fontWeight: '500',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: Colors.whiteAlpha10,
        borderRadius: 8,
    },
    textArea: {
        height: 70,
        textAlignVertical: 'top',
    },
    cancelButton: {
        flex: 1,
        alignItems: 'flex-start',
    },
    cancelButtonText: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    saveButtonContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    saveButtonText: {
        color: ACCENT_COLOR,
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        paddingBottom: 20,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteButtonText: {
        color: Colors.whiteAlpha60,
        fontSize: 14,
        fontWeight: '500',
    },
});
