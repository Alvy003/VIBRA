import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Sparkles, Music, Plus, Link2, Youtube, Music2 } from 'lucide-react-native';
import BottomSheet from '../BottomSheet';
import { COLORS, RADIUS } from '@/constants/design';
import * as Haptics from 'expo-haptics';

interface LibraryPlusMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onOptionSelected: (option: 'ai' | 'spotify' | 'youtube' | 'new') => void;
}

export const LibraryPlusMenu = ({ isOpen, onClose, onOptionSelected }: LibraryPlusMenuProps) => {
    const handleOption = (option: 'ai' | 'spotify' | 'youtube' | 'new') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onOptionSelected(option);
        onClose();
    };

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            snapPoints={['36%']}
            backgroundColor="#121212"
        >
            <View style={styles.content}>
                <TouchableOpacity
                    style={styles.option}
                    onPress={() => handleOption('new')}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#27272a' }]}>
                        <Music size={22} color="#a1a1aa" />
                    </View>
                    <View style={styles.optionTextContainer}>
                        <Text style={styles.optionTitle}>New Playlist</Text>
                        <Text style={styles.optionSubtitle}>Start a fresh empty collection</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.option}
                    onPress={() => handleOption('spotify')}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#27272a' }]}>
                        <Link2 size={24} color="#a1a1aa" />
                    </View>
                    <View style={styles.optionTextContainer}>
                        <Text style={styles.optionTitle}>Import Music</Text>
                        <Text style={styles.optionSubtitle}>Paste link from Spotify or YouTube</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.option}
                    onPress={() => handleOption('ai')}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#27272a' }]}>
                        <Sparkles size={22} color="#a1a1aa" />
                    </View>
                    <View style={styles.optionTextContainer}>
                        <Text style={styles.optionTitle}>AI Playlist</Text>
                        <Text style={styles.optionSubtitle}>Create a perfect mix with Vibra AI</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: 5,
        gap: 4,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    platformIcon: {
        width: 24,
        height: 24,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    optionSubtitle: {
        color: '#a1a1aa',
        fontSize: 12,
        marginTop: 2,
    },
});
