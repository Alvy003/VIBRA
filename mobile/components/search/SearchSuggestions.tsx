import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Search, Music, Disc, User } from 'lucide-react-native';
import { useSearchStore } from '@/stores/useSearchStore';

interface SearchSuggestionsProps {
    onSelect: (text: string) => void;
}

const MAX_PER_SECTION = 4;

export const SearchSuggestions = React.memo(({ onSelect }: SearchSuggestionsProps) => {
    const suggestions = useSearchStore((s) => s.suggestions);
    const isSuggesting = useSearchStore((s) => s.isSuggesting);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
        }).start();
    }, []);

    const songs = suggestions?.songs?.slice(0, MAX_PER_SECTION) || [];
    const artists = suggestions?.artists?.slice(0, MAX_PER_SECTION) || [];
    const albums = suggestions?.albums?.slice(0, MAX_PER_SECTION) || [];

    const hasContent = songs.length + artists.length + albums.length > 0;

    if (isSuggesting && !hasContent) {
        return (
            <View style={styles.loadingRow}>
                <Text style={styles.loadingText}>Searching...</Text>
            </View>
        );
    }

    if (!hasContent) return null;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews
            >
                {songs.length > 0 && (
                    <Section title="Songs" icon={<Music size={13} color="#9333ea" />}>
                        {songs.map((item: any) => (
                            <SuggestionRow
                                key={item.videoId || item._id || item.externalId}
                                imageUrl={item.imageUrl}
                                primary={item.title}
                                secondary={item.artist}
                                shape="square"
                                onPress={() => onSelect(item.title)}
                            />
                        ))}
                    </Section>
                )}

                {artists.length > 0 && (
                    <Section title="Artists" icon={<User size={13} color="#9333ea" />}>
                        {artists.map((item: any) => (
                            <SuggestionRow
                                key={item.id || item._id}
                                imageUrl={item.imageUrl}
                                primary={item.title || item.name}
                                shape="circle"
                                onPress={() => onSelect(item.title || item.name)}
                            />
                        ))}
                    </Section>
                )}

                {albums.length > 0 && (
                    <Section title="Albums" icon={<Disc size={13} color="#9333ea" />}>
                        {albums.map((item: any) => (
                            <SuggestionRow
                                key={item.id || item._id}
                                imageUrl={item.imageUrl}
                                primary={item.title}
                                secondary={item.artist}
                                shape="square"
                                onPress={() => onSelect(item.title)}
                            />
                        ))}
                    </Section>
                )}
                <View style={{ height: 120 }} />
            </ScrollView>
        </Animated.View>
    );
});

SearchSuggestions.displayName = 'SearchSuggestions';

// ── Sub-components ──────────────────────────────────────────────

const Section = ({
    title,
    icon,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) => (
    <View style={styles.section}>
        <View style={styles.sectionHeader}>
            {icon}
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {children}
    </View>
);

const SuggestionRow = React.memo(
    ({
        imageUrl,
        primary,
        secondary,
        shape,
        onPress,
    }: {
        imageUrl?: string;
        primary: string;
        secondary?: string;
        shape: 'square' | 'circle';
        onPress: () => void;
    }) => (
        <TouchableOpacity onPress={onPress} style={styles.row} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
                {imageUrl ? (
                    <Image
                        source={imageUrl}
                        style={[styles.thumb, shape === 'circle' && styles.thumbCircle]}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                    />
                ) : (
                    <View style={[styles.thumb, styles.thumbFallback, shape === 'circle' && styles.thumbCircle]}>
                        <Search size={14} color="#52525b" />
                    </View>
                )}
                <View style={styles.rowText}>
                    <Text style={styles.primary} numberOfLines={1}>{primary}</Text>
                    {secondary ? (
                        <Text style={styles.secondary} numberOfLines={1}>{secondary}</Text>
                    ) : null}
                </View>
            </View>
        </TouchableOpacity>
    )
);

SuggestionRow.displayName = 'SuggestionRow';

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingRow: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    loadingText: {
        color: '#52525b',
        fontSize: 14,
    },
    section: {
        marginTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 6,
    },
    sectionTitle: {
        color: '#71717a',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    thumb: {
        width: 46,
        height: 46,
        borderRadius: 6,
        backgroundColor: '#18181b',
    },
    thumbCircle: {
        borderRadius: 23,
    },
    thumbFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowText: {
        flex: 1,
    },
    primary: {
        color: '#e4e4e7',
        fontSize: 14,
        fontWeight: '600',
    },
    secondary: {
        color: '#71717a',
        fontSize: 12,
        marginTop: 2,
    },
});
