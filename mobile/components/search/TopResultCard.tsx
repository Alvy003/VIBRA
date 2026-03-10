import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import { usePlayerStore } from '@/stores/usePlayerStore';

interface TopResultCardProps {
    song: any;
}

export const TopResultCard = React.memo(({ song }: TopResultCardProps) => {
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
        <View style={styles.container}>
            <Text style={styles.heading}>Top Result</Text>
            <TouchableOpacity onPress={handlePlay} activeOpacity={0.85} style={styles.card}>
                <Image
                    source={song.imageUrl}
                    style={styles.artwork}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                />
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={2}>{song.title}</Text>
                    <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
                    <View style={styles.songBadge}>
                        <Text style={styles.songBadgeText}>SONG</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handlePlay} style={styles.playBtn} activeOpacity={0.8}>
                    <Play size={24} color="#fff" fill="#fff" />
                </TouchableOpacity>
            </TouchableOpacity>
        </View>
    );
});

TopResultCard.displayName = 'TopResultCard';

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    heading: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        letterSpacing: -0.3,
    },
    card: {
        backgroundColor: '#18181b',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    artwork: {
        width: 80,
        height: 80,
        borderRadius: 10,
    },
    info: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    artist: {
        color: '#a1a1aa',
        fontSize: 13,
        marginBottom: 8,
    },
    songBadge: {
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 3,
        alignSelf: 'flex-start',
    },
    songBadgeText: {
        color: '#9333ea',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    playBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#9333ea',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#9333ea',
        shadowOpacity: 0.5,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
});
