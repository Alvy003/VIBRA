import React, { useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Music2, Mic2, Headphones, Dumbbell, Leaf, Guitar, Zap, Globe, Disc } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with gaps

interface Genre {
    id: string;
    label: string;
    color: string;
    secondaryColor: string;
    icon: React.ComponentType<any>;
}

const GENRES: Genre[] = [
    { id: 'pop', label: 'Pop', color: '#7c3aed', secondaryColor: '#9333ea', icon: Music2 },
    { id: 'hiphop', label: 'Hip Hop', color: '#d97706', secondaryColor: '#f59e0b', icon: Mic2 },
    { id: 'bollywood', label: 'Bollywood', color: '#dc2626', secondaryColor: '#ef4444', icon: Disc },
    { id: 'chill', label: 'Chill', color: '#0891b2', secondaryColor: '#06b6d4', icon: Leaf },
    { id: 'workout', label: 'Workout', color: '#16a34a', secondaryColor: '#22c55e', icon: Dumbbell },
    { id: 'indie', label: 'Indie', color: '#c2410c', secondaryColor: '#ea580c', icon: Guitar },
    { id: 'rock', label: 'Rock', color: '#1d4ed8', secondaryColor: '#3b82f6', icon: Zap },
    { id: 'electronic', label: 'Electronic', color: '#7e22ce', secondaryColor: '#a855f7', icon: Globe },
];

interface GenreGridProps {
    onGenrePress: (genre: string) => void;
}

const GenreCard = React.memo(({ genre, onPress }: { genre: Genre; onPress: () => void }) => {
    const IconComponent = genre.icon;
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[styles.card, { backgroundColor: genre.color, width: CARD_WIDTH }]}
        >
            <Text style={styles.cardLabel}>{genre.label}</Text>
            <View style={[styles.iconBg, { backgroundColor: genre.secondaryColor }]}>
                <IconComponent size={22} color="rgba(255,255,255,0.9)" />
            </View>
        </TouchableOpacity>
    );
});

GenreCard.displayName = 'GenreCard';

export const GenreGrid = React.memo(({ onGenrePress }: GenreGridProps) => {
    const renderItem = useCallback(
        ({ item }: { item: Genre }) => (
            <GenreCard genre={item} onPress={() => onGenrePress(item.label)} />
        ),
        [onGenrePress]
    );

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Browse categories</Text>
            <FlatList
                data={GENRES}
                numColumns={2}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                columnWrapperStyle={styles.row}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
        </View>
    );
});

GenreGrid.displayName = 'GenreGrid';

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginTop: 28,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 14,
        letterSpacing: -0.3,
    },
    row: {
        justifyContent: 'space-between',
    },
    card: {
        height: 80,
        borderRadius: 10,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    cardLabel: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.2,
        flex: 1,
    },
    iconBg: {
        width: 44,
        height: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '15deg' }],
    },
});
