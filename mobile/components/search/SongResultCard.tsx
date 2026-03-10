import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface SongResultCardProps {
    song: any;
}

const areEqual = (prev: SongResultCardProps, next: SongResultCardProps) =>
    prev.song.videoId === next.song.videoId &&
    prev.song._id === next.song._id &&
    prev.song.externalId === next.song.externalId;

export const SongResultCard = React.memo(({ song }: SongResultCardProps) => {
    const playTrack = usePlayerStore((s) => s.playTrack);

    const handlePlay = () => {
        playTrack({
            id: song.videoId || song._id || song.externalId,
            url: song.streamUrl || song.audioUrl || '',
            title: song.title,
            artist: song.artist,
            artwork: song.imageUrl,
            duration: song.duration,
            source: song.source || (song.videoId ? 'youtube' : 'jiosaavn'),
        } as any);
    };

    return (
        <TouchableOpacity onPress={handlePlay} activeOpacity={0.7} style={styles.row}>
            <Image
                source={song.imageUrl}
                style={styles.artwork}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={song.imageUrl}
                transition={150}
            />
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
                <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
            </View>
            <TouchableOpacity onPress={handlePlay} style={styles.playBtn} activeOpacity={0.7}>
                <Play size={16} color="#9333ea" fill="#9333ea" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}, areEqual);

SongResultCard.displayName = 'SongResultCard';

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    artwork: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: '#18181b',
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        color: '#e4e4e7',
        fontSize: 14,
        fontWeight: '600',
    },
    artist: {
        color: '#71717a',
        fontSize: 12,
        marginTop: 2,
    },
    playBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
