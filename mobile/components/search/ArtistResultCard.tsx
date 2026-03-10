import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

interface ArtistResultCardProps {
    artist: any;
}

export const ArtistResultCard = React.memo(({ artist }: ArtistResultCardProps) => {
    const router = useRouter();

    const handlePress = () => {
        const rawId = artist.id || artist._id;
        if (rawId?.startsWith('jiosaavn_')) {
            const cleanId = rawId.replace('jiosaavn_artist_', '');
            router.push(`/artist/external/jiosaavn/${cleanId}` as any);
        }
    };

    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={styles.card}>
            <Image
                source={artist.imageUrl}
                style={styles.artwork}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={artist.imageUrl}
                transition={150}
            />
            <Text style={styles.name} numberOfLines={2}>{artist.title || artist.name}</Text>
            <Text style={styles.label}>Artist</Text>
        </TouchableOpacity>
    );
});

ArtistResultCard.displayName = 'ArtistResultCard';

const styles = StyleSheet.create({
    card: {
        width: 110,
        marginRight: 16,
        alignItems: 'center',
    },
    artwork: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#18181b',
        marginBottom: 10,
    },
    name: {
        color: '#e4e4e7',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    label: {
        color: '#71717a',
        fontSize: 11,
        marginTop: 2,
        textAlign: 'center',
    },
});
