// components/SaveToPlaylistButton.tsx
import React, { useMemo, useRef } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Plus, Check } from 'lucide-react-native';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlaylistStore } from '@/stores/usePlaylistStore';
import AddTrackBottomSheet, { AddTrackBottomSheetRef } from './AddTrackBottomSheet';
import Colors from '@/constants/Colors';

interface SaveToPlaylistButtonProps {
    track: any;
    size?: number;
    color?: string;
    activeColor?: string;
    iconColor?: string;
    checkmarkColor?: string;
}

export const SaveToPlaylistButton = React.memo(({
    track,
    size = 24,
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
                {isSaved ? (
                    <View style={[styles.iconCircleActive, { width: size, height: size, borderRadius: size / 2 }]}>
                        <Check
                            size={size * 0.6}
                            color={checkmarkColor || iconColor}
                            strokeWidth={3}
                        />
                    </View>
                ) : (
                    <View style={[styles.iconCircle, { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(1.5, size * 0.09) }]}>
                        <Plus
                            size={size * 0.7}
                            color={Colors.textPrimary}
                            strokeWidth={3}
                        />
                    </View>
                )}
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
    iconCircle: {
        width: 22,
        height: 22,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.textPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircleActive: {
        width: 22,
        height: 22,
        borderRadius: 12,
        backgroundColor: Colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SaveToPlaylistButton;
