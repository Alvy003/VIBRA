// components/SaveToPlaylistButton.tsx
import React, { useMemo, useRef } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import AddTrackBottomSheet, { AddTrackBottomSheetRef } from './AddTrackBottomSheet';
import Colors from '@/constants/Colors';
import SaveStateIcon, { SaveStateVariant } from './SaveStateIcon';
import { useNetworkStore } from '@/stores/useNetworkStore';
import { useToastStore } from '@/stores/useToastStore';

interface SaveToPlaylistButtonProps {
    track: any;
    variant?: SaveStateVariant;
    color?: string;
    activeColor?: string;
    iconColor?: string;
    checkmarkColor?: string;
}

export const SaveToPlaylistButton = React.memo(({
    track,
    variant = "large",
    iconColor = "#000000",
    checkmarkColor
}: SaveToPlaylistButtonProps) => {
    const bottomSheetRef = useRef<AddTrackBottomSheetRef>(null);
    const { toggleLikeSong, likedSongs, isSongLiked, isSongMatch } = useMusicStore();
    const { playlists } = usePlaylistStore();

    const isLiked = useMemo(() => isSongLiked(track), [likedSongs, track]);

    const isInAnyPlaylist = useMemo(() => {
        return playlists.some(p =>
            p.userId && p.songs?.some((s: any) => isSongMatch(track, s))
        );
    }, [playlists, track]);

    const isSaved = isLiked || isInAnyPlaylist;

    const handlePress = async () => {
        if (!useNetworkStore.getState().isOnline) {
            useToastStore.getState().showToast({
                message: "Available when you're back online.",
                iconType: 'none',
                duration: 2500
            });
            return;
        }

        if (isSaved) {
            // If already saved (liked or in playlist), open the sheet for more options
            bottomSheetRef.current?.open(track);
        } else {
            // First time: quick save to Liked Songs
            await toggleLikeSong(track);
        }
    };

    return (
        <>
            <TouchableOpacity
                onPress={handlePress}
                onLongPress={() => bottomSheetRef.current?.open(track)}
                activeOpacity={0.7}
                style={styles.container}
            >
                <SaveStateIcon
                    variant={variant}
                    isSaved={isSaved}
                    checkmarkColor={checkmarkColor || iconColor}
                    outlineColor={Colors.textPrimary}
                />
            </TouchableOpacity>

            <AddTrackBottomSheet ref={bottomSheetRef} />
        </>
    );
});

const styles = StyleSheet.create({
    container: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SaveToPlaylistButton;