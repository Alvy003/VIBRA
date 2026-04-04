import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Share } from 'react-native';
import { 
    BottomSheetModal, 
    BottomSheetView, 
    BottomSheetBackdrop 
} from '@gorhom/bottom-sheet';
import { 
    Pencil, 
    Share2, 
    Download, 
    CheckCircle2, 
    Music,
    Trash2,
    PlusCircle
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface PlaylistOptionsProps {
    playlist: any;
    isDiscovery?: boolean;
    isDownloaded?: boolean;
    onEdit?: () => void;
    onDownload?: () => void;
    onDelete?: () => void;
    trigger?: React.ReactNode;
}

const ACCENT_COLOR = '#8B5CF6';

export default function PlaylistOptions({ 
    playlist, 
    isDiscovery, 
    isDownloaded, 
    onEdit, 
    onDownload,
    onDelete,
    trigger 
}: PlaylistOptionsProps) {
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['45%'], []);

    const handlePresentModalPress = useCallback(() => {
        bottomSheetModalRef.current?.present();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleCloseModal = useCallback(() => {
        bottomSheetModalRef.current?.dismiss();
    }, []);

    const handleShare = async () => {
        handleCloseModal();
        try {
            const message = `Check out this playlist on Vibra: ${playlist?.name || playlist?.title}\n\nListen here: https://vibra.app/playlist/${playlist?._id || playlist?.externalId}`;
            await Share.share({
                message,
                title: playlist?.name || playlist?.title,
            });
        } catch (error) {
            console.error('Error sharing:', error);
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

    const menuItems = [
        ...(!isDiscovery && onEdit ? [{ 
            icon: Pencil, 
            label: 'Edit Playlist', 
            onPress: () => { handleCloseModal(); onEdit(); } 
        }] : []),
        { 
            icon: isDownloaded ? CheckCircle2 : Download, 
            label: isDownloaded ? 'Downloaded' : 'Download Playlist', 
            onPress: () => { handleCloseModal(); onDownload?.(); },
            active: isDownloaded,
            color: isDownloaded ? ACCENT_COLOR : '#d1cdcd'
        },
        { icon: Share2, label: 'Share', onPress: handleShare },
        ...(!isDiscovery && onDelete ? [{ 
            icon: Trash2, 
            label: 'Delete Playlist', 
            onPress: () => { handleCloseModal(); onDelete(); },
            color: '#ef4444'
        }] : []),
    ];

    return (
        <>
            <TouchableOpacity onPress={handlePresentModalPress}>
                {trigger}
            </TouchableOpacity>

            <BottomSheetModal
                ref={bottomSheetModalRef}
                index={0}
                snapPoints={snapPoints}
                backdropComponent={renderBackdrop}
                backgroundStyle={{ backgroundColor: '#121212' }}
                handleIndicatorStyle={{ backgroundColor: '#404040', width: 40 }}
            >
                <BottomSheetView style={styles.contentContainer}>
                    <View style={styles.header}>
                        <View style={styles.artworkContainer}>
                            {playlist?.imageUrl ? (
                                <Image
                                    source={{ uri: playlist.imageUrl }}
                                    style={styles.artwork}
                                />
                            ) : (
                                <View style={styles.artworkPlaceholder}>
                                    <Music size={24} color="#52525b" />
                                </View>
                            )}
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.title} numberOfLines={1}>{playlist?.name || playlist?.title}</Text>
                            <Text style={styles.subtitle} numberOfLines={1}>
                                {isDiscovery ? 'Mix for you' : 'Local Playlist'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.menuContainer}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={item.onPress}
                                style={styles.menuItem}
                            >
                                <View style={styles.iconWrapper}>
                                    <item.icon size={22} color={item.color || "#d1cdcd"} />
                                </View>
                                <Text style={[
                                    styles.menuLabel,
                                    item.active && { color: ACCENT_COLOR }
                                ]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </BottomSheetView>
            </BottomSheetModal>
        </>
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
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#262626',
        marginBottom: 8,
    },
    artworkContainer: {
        width: 50,
        height: 50,
        borderRadius: 6,
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    artworkPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        marginLeft: 16,
        flex: 1,
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    subtitle: {
        color: '#a3a3a3',
        fontSize: 13,
        marginTop: 2,
    },
    menuContainer: {
        marginTop: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
    },
    iconWrapper: {
        width: 32,
        alignItems: 'center',
    },
    menuLabel: {
        color: '#e5e5e5',
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 12,
    },
});
