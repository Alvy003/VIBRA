import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';

const ACCENT_COLOR = '#7B2CF5';

interface EditPlaylistModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (name: string, description: string) => void;
    initialName: string;
    initialDescription: string;
}

export default function EditPlaylistModal({
    visible,
    onClose,
    onSave,
    initialName,
    initialDescription
}: EditPlaylistModalProps) {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim(), description.trim());
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.container}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View className="bg-zinc-900 rounded-3xl p-6 w-full max-w-[340px] border border-zinc-800 shadow-2xl">
                                <View className="flex-row justify-between items-center mb-6">
                                    <Text className="text-white text-xl font-bold">Edit details</Text>
                                    <TouchableOpacity onPress={onClose}>
                                        <X size={24} color="#a1a1aa" />
                                    </TouchableOpacity>
                                </View>

                                <View className="space-y-4">
                                    <View>
                                        <Text className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Playlist Name</Text>
                                        <TextInput
                                            className="bg-zinc-800 text-white p-4 rounded-xl text-lg font-medium border border-zinc-700/50"
                                            value={name}
                                            onChangeText={setName}
                                            placeholder="Enter playlist name"
                                            placeholderTextColor="#71717a"
                                            autoFocus
                                            maxLength={50}
                                        />
                                    </View>

                                    <View>
                                        <Text className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Description (Optional)</Text>
                                        <TextInput
                                            className="bg-zinc-800 text-white p-4 rounded-xl text-base h-24 border border-zinc-700/50"
                                            value={description}
                                            onChangeText={setDescription}
                                            placeholder="Add an optional description"
                                            placeholderTextColor="#71717a"
                                            multiline
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                            maxLength={150}
                                        />
                                    </View>
                                </View>

                                <View className="mt-8 flex-row space-x-3">
                                    <TouchableOpacity
                                        onPress={onClose}
                                        className="flex-1 py-4 items-center justify-center rounded-xl bg-zinc-800"
                                    >
                                        <Text className="text-white font-bold text-base">Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleSave}
                                        disabled={!name.trim()}
                                        style={{ backgroundColor: name.trim() ? ACCENT_COLOR : '#4c1d95' }}
                                        className="flex-2 py-4 items-center justify-center rounded-xl"
                                    >
                                        <Text className="text-white font-bold text-base px-8">Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '100%',
        alignItems: 'center',
    }
});
