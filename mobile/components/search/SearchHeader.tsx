import React, { useRef, useCallback } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Text,
} from 'react-native';
import { Search, X, AudioLines } from 'lucide-react-native';
import { useSearchStore } from '@/stores/useSearchStore';

interface SearchHeaderProps {
    onMicPress: () => void;
}

export const SearchHeader = React.memo(({ onMicPress }: SearchHeaderProps) => {
    const query = useSearchStore((s) => s.query);
    const setQuery = useSearchStore((s) => s.setQuery);
    const fetchSuggestions = useSearchStore((s) => s.fetchSuggestions);
    const clearSearch = useSearchStore((s) => s.clearSearch);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearScale = useRef(new Animated.Value(0)).current;

    const handleChange = useCallback(
        (text: string) => {
            setQuery(text);

            // Animate clear button
            Animated.spring(clearScale, {
                toValue: text.length > 0 ? 1 : 0,
                useNativeDriver: true,
                tension: 200,
                friction: 14,
            }).start();

            // Debounce suggestions fetch
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                fetchSuggestions(text);
            }, 250);
        },
        [setQuery, fetchSuggestions, clearScale]
    );

    const handleClear = useCallback(() => {
        clearSearch();
        Animated.spring(clearScale, {
            toValue: 0,
            useNativeDriver: true,
            tension: 200,
            friction: 14,
        }).start();
    }, [clearSearch, clearScale]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Search</Text>
            <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                    <Search size={18} color="#71717a" style={styles.searchIcon} />
                    <TextInput
                        value={query}
                        onChangeText={handleChange}
                        placeholder="What do you want to listen to?"
                        placeholderTextColor="#52525b"
                        style={styles.input}
                        returnKeyType="search"
                        autoCorrect={false}
                        autoCapitalize="none"
                        selectionColor="#9333ea"
                        onSubmitEditing={() => {
                            if (query.trim().length > 0) {
                                useSearchStore.getState().addRecentSearch(query.trim());
                            }
                        }}
                    />
                    <Animated.View style={[styles.clearBtn, { transform: [{ scale: clearScale }] }]}>
                        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <X size={16} color="#71717a" />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
                <TouchableOpacity onPress={onMicPress} style={styles.micBtn} activeOpacity={0.7}>
                    <AudioLines size={20} color="#71717a" />
                </TouchableOpacity>
            </View>
        </View>
    );
});

SearchHeader.displayName = 'SearchHeader';

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
        backgroundColor: '#000',
    },
    title: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 14,
        letterSpacing: -0.5,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181b',
        borderRadius: 30,
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
    },
    searchIcon: {
        marginLeft: 14,
        marginRight: 8,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
        height: '100%',
    },
    clearBtn: {
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    micBtn: {
        width: 48,
        height: 48,
        borderRadius: 30,
        backgroundColor: '#18181b',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
    },
});
