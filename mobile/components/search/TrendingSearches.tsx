import React, { useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { TrendingUp } from 'lucide-react-native';

const TRENDING = [
    'Arijit Singh',
    'Diljit Dosanjh',
    'AP Dhillon',
    'The Weeknd',
    'Drake',
    'Kesariya',
    'Levitating',
    'Sid Sriram',
];

interface TrendingSearchesProps {
    onPress: (term: string) => void;
}

export const TrendingSearches = React.memo(({ onPress }: TrendingSearchesProps) => (
    <View style={styles.container}>
        <View style={styles.header}>
            <TrendingUp size={15} color="#f97316" />
            <Text style={styles.title}>Trending</Text>
        </View>
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
        >
            {TRENDING.map((term) => (
                <TouchableOpacity
                    key={term}
                    onPress={() => onPress(term)}
                    style={styles.chip}
                    activeOpacity={0.7}
                >
                    <Text style={styles.chipText}>{term}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    </View>
));

TrendingSearches.displayName = 'TrendingSearches';

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    chips: {
        gap: 8,
        paddingRight: 4,
    },
    chip: {
        backgroundColor: '#18181b',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    chipText: {
        color: '#d4d4d8',
        fontSize: 13,
        fontWeight: '600',
    },
});
