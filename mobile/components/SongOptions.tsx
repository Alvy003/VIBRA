// components/SongOptions.tsx
//
// Lightweight trigger component. No longer owns a BottomSheet or AddTrackBottomSheet.
// All modal logic lives in GlobalSongOptionsHost (mounted once at root).
//
// Two usage modes:
//   1. <SongOptions song={track} />          → renders MoreVertical trigger button
//   2. <SongOptions song={track} trigger={<CustomUI />} /> → custom trigger UI
//   3. ref.open(song) / ref.close()          → imperative API (QuickPicksGrid, etc.)
//
import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MoreVertical } from 'lucide-react-native';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';

export interface SongOptionsRef {
    open: (song?: any) => void;
    close: () => void;
}

interface SongOptionsProps {
    song?: any;
    trigger?: React.ReactNode;
}

const SongOptions = React.forwardRef<SongOptionsRef, SongOptionsProps>(
    ({ song: initialSong, trigger }, ref) => {
        const openSongOptions = usePlayerUIStore(s => s.openSongOptions);
        const closeSongOptions = usePlayerUIStore(s => s.closeSongOptions);

        const handleOpen = useCallback((overrideSong?: any) => {
            const target = overrideSong || initialSong;
            if (target) openSongOptions(target);
        }, [initialSong, openSongOptions]);

        // Preserve imperative ref API so QuickPicksGrid and any other callers
        // that use ref.open(song) continue working without changes.
        React.useImperativeHandle(ref, () => ({
            open: (newSong?: any) => handleOpen(newSong),
            close: closeSongOptions,
        }), [handleOpen, closeSongOptions]);

        // If neither song nor trigger is provided, render nothing.
        if (!initialSong && !trigger) return null;

        return (
            <TouchableOpacity
                onPress={() => handleOpen()}
                style={styles.triggerBtn}
                activeOpacity={0.7}
            >
                {trigger ?? <MoreVertical size={20} color="#b3b3b3" />}
            </TouchableOpacity>
        );
    }
);

SongOptions.displayName = 'SongOptions';

const styles = StyleSheet.create({
    triggerBtn: {
        padding: 8,
        marginRight: -8,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SongOptions;
