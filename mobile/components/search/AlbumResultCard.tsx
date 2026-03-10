import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

interface AlbumResultCardProps {
    album: any;
}

export const AlbumResultCard = React.memo(({ album }: AlbumResultCardProps) => {
    const router = useRouter();

    const handlePress = () => {
        const rawId = album.id || album._id;
        if (rawId?.startsWith('jiosaavn_')) {
            const cleanId = rawId.replace('jiosaavn_album_', '');
            router.push(`/album/external/jiosaavn/${cleanId}` as any);
        } else {
            router.push(`/album/${rawId}` as any);
        }
    };

    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={styles.card}>
            <Image
                source={album.imageUrl}
                style={styles.artwork}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={album.imageUrl}
                transition={150}
            />
            <Text style={styles.title} numberOfLines={2}>{album.title}</Text>
            {album.artist ? (
                <Text style={styles.artist} numberOfLines={1}>{album.artist}</Text>
            ) : null}
        </TouchableOpacity>
    );
});

AlbumResultCard.displayName = 'AlbumResultCard';

const styles = StyleSheet.create({
    card: {
        width: 130,
        marginRight: 14,
    },
    artwork: {
        width: 130,
        height: 130,
        borderRadius: 10,
        backgroundColor: '#18181b',
        marginBottom: 8,
    },
    title: {
        color: '#e4e4e7',
        fontSize: 13,
        fontWeight: '600',
    },
    artist: {
        color: '#71717a',
        fontSize: 11,
        marginTop: 2,
    },
});
