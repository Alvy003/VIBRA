import React, { useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { History, X } from 'lucide-react-native';
import { useSearchStore } from '@/stores/useSearchStore';

interface RecentSearchesProps {
    onPress: (term: string) => void;
}

export const RecentSearches = React.memo(({ onPress }: RecentSearchesProps) => {
    const recentSearches = useSearchStore((s) => s.recentSearches);
    const removeRecentSearch = useSearchStore((s) => s.removeRecentSearch);

    const handleRemove = useCallback(
        (term: string) => removeRecentSearch(term),
        [removeRecentSearch]
    );

    if (!recentSearches.length) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Recent searches</Text>
            {recentSearches.map((term) => (
                <View key={term} style={styles.row}>
                    <TouchableOpacity
                        style={styles.rowContent}
                        onPress={() => onPress(term)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconWrap}>
                            <History size={16} color="#71717a" />
                        </View>
                        <Text style={styles.term} numberOfLines={1}>
                            {term}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleRemove(term)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <X size={14} color="#52525b" />
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );
});

RecentSearches.displayName = 'RecentSearches';

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginTop: 24,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    rowContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#18181b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    term: {
        color: '#a1a1aa',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
});
