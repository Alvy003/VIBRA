import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { TrendingSearches } from './TrendingSearches';
import { GenreGrid } from './GenreGrid';
import { RecentSearches } from './RecentSearches';

interface IdleDiscoveryProps {
    onSearchTerm: (term: string) => void;
}

export const IdleDiscovery = React.memo(({ onSearchTerm }: IdleDiscoveryProps) => {
    const handleTerm = useCallback(
        (term: string) => onSearchTerm(term),
        [onSearchTerm]
    );

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            keyboardShouldPersistTaps="handled"
        >
            <RecentSearches onPress={handleTerm} />
            <TrendingSearches onPress={handleTerm} />
            <GenreGrid onGenrePress={handleTerm} />
            <View style={styles.footer} />
        </ScrollView>
    );
});

IdleDiscovery.displayName = 'IdleDiscovery';

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingBottom: 20 },
    footer: { height: 120 },
});
