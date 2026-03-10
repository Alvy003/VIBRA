import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSearchStore } from '@/stores/useSearchStore';
import { SearchHeader } from '@/components/search/SearchHeader';
import { IdleDiscovery } from '@/components/search/IdleDiscovery';
import { SearchSuggestions } from '@/components/search/SearchSuggestions';
import { AudioSearchModal } from '@/components/search/AudioSearchModal';

export default function SearchScreen() {
    const router = useRouter();
    const query = useSearchStore((s) => s.query);
    const setQuery = useSearchStore((s) => s.setQuery);
    const fetchSuggestions = useSearchStore((s) => s.fetchSuggestions);
    const addRecentSearch = useSearchStore((s) => s.addRecentSearch);
    const [micModalVisible, setMicModalVisible] = useState(false);

    /** Called when user taps a suggestion or presses Enter */
    const handleSearch = useCallback(
        (term: string) => {
            const trimmed = term.trim();
            if (!trimmed) return;
            setQuery(trimmed);
            fetchSuggestions(trimmed); // keep suggestions current
            addRecentSearch(trimmed);
            router.push({ pathname: '/search-results', params: { q: trimmed } } as any);
        },
        [router, setQuery, fetchSuggestions, addRecentSearch]
    );

    /** Audio search found a song — navigate to results */
    const handleAudioResult = useCallback(
        (q: string) => {
            setMicModalVisible(false);
            handleSearch(q);
        },
        [handleSearch]
    );

    const showSuggestions = query.trim().length > 1;

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <SearchHeader onMicPress={() => setMicModalVisible(true)} />

            <View style={styles.content}>
                {showSuggestions ? (
                    <SearchSuggestions onSelect={handleSearch} />
                ) : (
                    <IdleDiscovery onSearchTerm={handleSearch} />
                )}
            </View>

            <AudioSearchModal
                visible={micModalVisible}
                onClose={() => setMicModalVisible(false)}
                onResult={handleAudioResult}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
    },
});
