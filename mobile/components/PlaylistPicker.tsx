// components/PlaylistPicker.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image, TextInput } from 'react-native';
import { 
    BottomSheetModal, 
    BottomSheetView, 
    BottomSheetBackdrop,
    BottomSheetFlatList
} from '@gorhom/bottom-sheet';
import { Plus, Music, X, Check } from 'lucide-react-native';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import { resolveAssetUrl } from '@/lib/url';

interface PlaylistPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (playlistId: string) => void;
}

export default function PlaylistPicker({ visible, onClose, onSelect }: PlaylistPickerProps) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const { playlists, createPlaylist } = usePlaylistStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    // Handle visibility via ref when prop changes
    React.useEffect(() => {
        if (visible) {
            bottomSheetModalRef.current?.present();
        } else {
            bottomSheetModalRef.current?.dismiss();
        }
    }, [visible]);

    const snapPoints = useMemo(() => ['60%', '80%'], []);

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;
        try {
            const newPlaylist = await createPlaylist(newPlaylistName);
            setNewPlaylistName('');
            setIsCreating(false);
            onSelect(newPlaylist._id);
        } catch (error) {
            console.error("Failed to create playlist", error);
        }
    };

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={styles.playlistItem}
            onPress={() => onSelect(item._id)}
        >
            <View style={styles.playlistImageContainer}>
                {item.imageUrl ? (
                    <Image 
                        source={{ uri: resolveAssetUrl(item.imageUrl) }} 
                        style={styles.playlistImage} 
                    />
                ) : (
                    <View style={styles.playlistPlaceholder}>
                        <Music size={24} color="#52525b" />
                    </View>
                )}
            </View>
            <View style={styles.playlistInfo}>
                <Text style={styles.playlistName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.playlistCount}>{item.songs?.length || 0} songs</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            onDismiss={onClose}
            backgroundStyle={{ backgroundColor: '#121212' }}
            handleIndicatorStyle={{ backgroundColor: '#404040' }}
        >
            <BottomSheetView style={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Add to Playlist</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color="#a3a3a3" />
                    </TouchableOpacity>
                </View>

                {isCreating ? (
                    <View style={styles.createContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Playlist Name"
                            placeholderTextColor="#52525b"
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            autoFocus
                        />
                        <View style={styles.createActions}>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.cancelButton]} 
                                onPress={() => setIsCreating(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.confirmButton]} 
                                onPress={handleCreatePlaylist}
                            >
                                <Text style={styles.confirmButtonText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity 
                        style={styles.createNewButton}
                        onPress={() => setIsCreating(true)}
                    >
                        <View style={styles.plusIconContainer}>
                            <Plus size={24} color="white" />
                        </View>
                        <Text style={styles.createNewText}>Create New Playlist</Text>
                    </TouchableOpacity>
                )}

                <BottomSheetFlatList
                    data={playlists}
                    keyExtractor={(item: { _id: any; }) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        !isCreating ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No playlists found</Text>
                            </View>
                        ) : null
                    }
                />
            </BottomSheetView>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    createNewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 16,
    },
    plusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#262626',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    createNewText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 40,
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    playlistImageContainer: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
        marginRight: 16,
    },
    playlistImage: {
        width: '100%',
        height: '100%',
    },
    playlistPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playlistInfo: {
        flex: 1,
    },
    playlistName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    playlistCount: {
        color: '#737373',
        fontSize: 14,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyText: {
        color: '#52525b',
        fontSize: 16,
    },
    createContainer: {
        marginBottom: 24,
    },
    input: {
        backgroundColor: '#262626',
        borderRadius: 12,
        padding: 16,
        color: 'white',
        fontSize: 16,
        marginBottom: 16,
    },
    createActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    actionButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    cancelButton: {
        backgroundColor: '#262626',
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: '#8B5CF6',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});
