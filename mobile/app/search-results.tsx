import React, { useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { ArrowLeft, SearchX } from 'lucide-react-native';
import { useSearchStore } from '@/stores/useSearchStore';
import { TopResultCard } from '@/components/search/TopResultCard';
import { SongResultCard } from '@/components/search/SongResultCard';
import { AlbumResultCard } from '@/components/search/AlbumResultCard';
import { ArtistResultCard } from '@/components/search/ArtistResultCard';

// ── Section header ───────────────────────────────────────────────
const SectionHeader = React.memo(({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
));

// ── Empty state ──────────────────────────────────────────────────
const EmptyState = ({ query }: { query: string }) => (
    <View style={styles.emptyContainer}>
        <SearchX size={56} color="#27272a" />
        <Text style={styles.emptyTitle}>No results for</Text>
        <Text style={styles.emptyQuery}>"{query}"</Text>
        <Text style={styles.emptyHint}>Check spelling or try a different search</Text>
    </View>
);

// ── Main screen ──────────────────────────────────────────────────
export default function SearchResultsScreen() {
    const { q } = useLocalSearchParams<{ q: string }>();
    const router = useRouter();
    const fetchResults = useSearchStore((s) => s.fetchResults);
    const results = useSearchStore((s) => s.results);
    const isSearching = useSearchStore((s) => s.isSearching);

    useEffect(() => {
        if (q) {
            fetchResults(q);
        }
    }, [q]);

    const songs = results?.songs || [];
    const albums = results?.albums || [];
    const artists = results?.artists || [];
    const topSong = songs[0] || null;
    const remainingSongs = songs.slice(1);

    const hasContent = songs.length > 0 || albums.length > 0 || artists.length > 0;

    const renderSong = useCallback(
        ({ item }: { item: any }) => <SongResultCard song={item} />,
        []
    );

    const renderAlbum = useCallback(
        ({ item }: { item: any }) => <AlbumResultCard album={item} />,
        []
    );

    const renderArtist = useCallback(
        ({ item }: { item: any }) => <ArtistResultCard artist={item} />,
        []
    );

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            {/* Header bar */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <ArrowLeft size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerQuery} numberOfLines={1}>{q}</Text>
            </View>

            {/* Loading state */}
            {isSearching && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#9333ea" />
                    <Text style={styles.loadingText}>Searching Vibra...</Text>
                </View>
            )}

            {/* Results */}
            {!isSearching && results && (
                hasContent ? (
                    <ScrollView
                        style={styles.scroll}
                        showsVerticalScrollIndicator={false}
                        removeClippedSubviews
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Top Result */}
                        {topSong && (
                            <View style={styles.section}>
                                <TopResultCard song={topSong} />
                            </View>
                        )}

                        {/* Songs — FlashList */}
                        {remainingSongs.length > 0 && (
                            <View style={styles.section}>
                                <SectionHeader title="Songs" />
                                <View style={{ minHeight: remainingSongs.length * 66 }}>
                                    <FlashList
                                        data={remainingSongs}
                                        renderItem={renderSong}
                                        keyExtractor={(item) => item.videoId || item._id || item.externalId || Math.random().toString()}
                                        scrollEnabled={false}
                                        overrideProps={{ estimatedItemSize: 66 }}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Albums — horizontal rail */}
                        {albums.length > 0 && (
                            <View style={styles.section}>
                                <SectionHeader title="Albums" />
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.rail}
                                    data={albums}
                                    keyExtractor={(item) => item.id || item._id}
                                    renderItem={renderAlbum}
                                    removeClippedSubviews
                                />
                            </View>
                        )}

                        {/* Artists — horizontal rail */}
                        {artists.length > 0 && (
                            <View style={styles.section}>
                                <SectionHeader title="Artists" />
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.rail}
                                    data={artists}
                                    keyExtractor={(item) => item.id || item._id}
                                    renderItem={renderArtist}
                                    removeClippedSubviews
                                />
                            </View>
                        )}

                        <View style={styles.bottomPad} />
                    </ScrollView>
                ) : (
                    <EmptyState query={q || ''} />
                )
            )}

            {/* No results yet (first load, before search) */}
            {!isSearching && !results && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#9333ea" />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#18181b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerQuery: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
        letterSpacing: -0.3,
    },
    scroll: {
        flex: 1,
    },
    section: {
        marginTop: 20,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 10,
        paddingHorizontal: 16,
    },
    rail: {
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#52525b',
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 8,
    },
    emptyTitle: {
        color: '#71717a',
        fontSize: 16,
        marginTop: 16,
    },
    emptyQuery: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    emptyHint: {
        color: '#3f3f46',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 4,
    },
    bottomPad: {
        height: 120,
    },
});
