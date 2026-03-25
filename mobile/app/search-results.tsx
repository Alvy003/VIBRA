import React, { useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
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
import { AlbumResultRow } from '@/components/search/AlbumResultRow';
import { ArtistResultRow } from '@/components/search/ArtistResultRow';
import { Skeleton } from '@/components/Skeleton';

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

// ── Loading skeleton ─────────────────────────────────────────────
const SearchSkeleton = () => (
    <View style={{ padding: 16, gap: 20 }}>
        <Skeleton width="100%" height={160} borderRadius={12} />
        <View style={{ gap: 12 }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Skeleton width={48} height={48} borderRadius={4} />
                    <View style={{ flex: 1, gap: 6 }}>
                        <Skeleton width="60%" height={16} />
                        <Skeleton width="40%" height={12} />
                    </View>
                </View>
            ))}
        </View>
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
    
    // Deduplicate songs to prevent duplicate key errors
    const uniqueSongs = useMemo(() => {
        const seen = new Set();
        return songs.filter(s => {
            const id = s.videoId || s._id || s.externalId;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [songs]);

    const topSong = uniqueSongs[0] || null;
    const remainingSongs = uniqueSongs.slice(1);

    const hasContent = uniqueSongs.length > 0 || albums.length > 0 || artists.length > 0;

    const renderSong = useCallback(
        ({ item }: { item: any }) => <SongResultCard song={item} />,
        []
    );

    const renderAlbum = useCallback(
        ({ item }: { item: any }) => <AlbumResultRow album={item} />,
        []
    );

    const renderArtist = useCallback(
        ({ item }: { item: any }) => <ArtistResultRow artist={item} />,
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
            {isSearching && <SearchSkeleton />}

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
                                <TopResultCard result={topSong} type="song" />
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
            {!isSearching && !results && <SearchSkeleton />}
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
