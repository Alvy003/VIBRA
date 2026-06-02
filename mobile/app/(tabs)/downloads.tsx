import React, { useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Download } from 'lucide-react-native';
import { useDownloadStore, DownloadedSong } from '@/stores/useDownloadStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { TrackListItem } from '@/components/TrackListItem';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    Extrapolate,
} from 'react-native-reanimated';
import { FlashList as OriginalFlashList } from '@shopify/flash-list';
import { SharpPlay, SharpPause, SharpShuffle } from '@/components/SharpIcons';
import CollectionOptions, { CollectionOptionsRef } from '@/components/CollectionOptions';
import Colors from '@/constants/Colors';
import { DownloadedIcon } from '@/components/DownloadedIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT_COLOR = Colors.accent;
const AnimatedFlashList = Animated.createAnimatedComponent(OriginalFlashList) as any;

interface DownloadsHeaderProps {
    count: number;
    onPlayAll: (shuffle?: boolean) => void;
    onToggleShuffle: () => void;
    shuffleMode: boolean;
    isCurrentPlaying: boolean;
    onPause: () => void;
}

const DownloadsHeader = React.memo<DownloadsHeaderProps>(({
    count,
    onPlayAll,
    onToggleShuffle,
    shuffleMode,
    isCurrentPlaying,
    onPause,
}) => (
    <View style={[styles.headerContent, { backgroundColor: '#1e293b' }]}>
        {/* Modern Slate/Blue Gradient for Downloads - Blending from transparent to background */}
        <LinearGradient
            colors={[
                'transparent',
                'rgba(9, 9, 11, 0.05)',
                'rgba(9, 9, 11, 0.15)',
                'rgba(9, 9, 11, 0.3)',
                'rgba(9, 9, 11, 0.5)',
                'rgba(9, 9, 11, 0.7)',
                'rgba(9, 9, 11, 0.85)',
                Colors.background,
                Colors.background,
            ]}
            locations={[0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.78, 0.9, 1]}
            style={styles.headerGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
        />
        
        <View style={styles.titleSection}>
            <Text style={styles.titleText}>Offline Music</Text>
            <View style={styles.metadataRow}>
                <Text style={styles.metadataText}>{count} tracks available</Text>
            </View>
        </View>

        <View style={styles.actionBar}>
            {/* Left Controls: Just a branded icon */}
            <View style={styles.leftControls}>
                <DownloadedIcon size={22} />
            </View>

            {/* Right Controls: Shuffle and Play */}
            <View style={styles.rightControls}>
                <TouchableOpacity onPress={onToggleShuffle} activeOpacity={0.7} style={styles.iconButton}>
                    <View style={styles.shuffleContainer}>
                        <SharpShuffle size={26} color={shuffleMode ? ACCENT_COLOR : Colors.whiteAlpha60} />
                        {shuffleMode && <View style={styles.shuffleDot} />}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={isCurrentPlaying ? onPause : () => onPlayAll(false)}
                    style={styles.playButton}
                    activeOpacity={0.8}
                >
                    {isCurrentPlaying ? (
                        <SharpPause size={28} color="black" />
                    ) : (
                        <SharpPlay size={28} color="black" style={{ marginLeft: 3 }} />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    </View>
));

export default function DownloadsScreen() {
    const router = useRouter();
    const listRef = useRef<any>(null);
    const optionsRef = useRef<CollectionOptionsRef>(null);
    
    const { downloadedSongs } = useDownloadStore();
    const { 
        currentTrack, 
        isPlaying, 
        initializeQueue, 
        pauseTrack, 
        shuffleMode, 
        toggleShuffle 
    } = usePlayerStore();

    const songs = useMemo(() => {
        return Object.values(downloadedSongs).sort((a, b) => b.downloadedAt - a.downloadedAt);
    }, [downloadedSongs]);

    const isCurrentPlaying = useMemo(() => {
        return songs.some(s => s.id === currentTrack?.id) && isPlaying;
    }, [songs, currentTrack?.id, isPlaying]);

    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const handleBack = useCallback(() => {
        // Explicitly return to Library to ensure tab consistency 
        router.push('/(tabs)/library');
    }, [router]);

    const handlePlayAll = useCallback(async (shuffle = false) => {
        if (songs.length === 0) return;
        const queueSongs = shuffle ? [...songs].sort(() => Math.random() - 0.5) : songs;
        const playerTracks = queueSongs.map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            url: s.localUri,
            artwork: s.artwork,
            duration: s.duration
        }));
        await initializeQueue(playerTracks, 0, { type: 'playlist', id: 'downloads', title: 'Offline Music' });
    }, [songs, initializeQueue]);

    const handlePlayTrack = useCallback((song: DownloadedSong, index: number) => {
        const playerTracks = songs.map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            url: s.localUri,
            artwork: s.artwork,
            duration: s.duration
        }));
        initializeQueue(playerTracks, index, { type: 'playlist', id: 'downloads', title: 'Offline Music' });
    }, [songs, initializeQueue]);

    // Animated styles for sticky header
    const stickyHeaderStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [80, 140], [0, 1], Extrapolate.CLAMP);
        return { opacity };
    });

    const headerTitleStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [120, 160], [0, 1], Extrapolate.CLAMP);
        const translateY = interpolate(scrollY.value, [120, 160], [10, 0], Extrapolate.CLAMP);
        return { opacity, transform: [{ translateY }] };
    });

    const headerPlayButtonStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [140, 180], [0, 1], Extrapolate.CLAMP);
        const scale = interpolate(scrollY.value, [140, 180], [0.6, 1], Extrapolate.CLAMP);
        return { opacity, transform: [{ scale }] };
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            {/* Back Button */}
            <View style={styles.backButtonContainer}>
                <SafeAreaView edges={['top']}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ArrowLeft size={26} color={Colors.textPrimary} />
                    </TouchableOpacity>
                </SafeAreaView>
            </View>

            {/* Sticky Header */}
            <Animated.View style={[styles.stickyHeader, stickyHeaderStyle]}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
                {/* Branded Gradient Overlay for Sticky Header */}
                <LinearGradient
                    colors={['#1e293b', Colors.background]}
                    style={StyleSheet.absoluteFill}                    
                />
                <SafeAreaView edges={['top']} style={styles.stickyHeaderContent}>
                    <View style={{ width: 40 }} />
                    <Animated.View style={[styles.stickyTitleContainer, headerTitleStyle]}>
                        <Text style={styles.stickyTitle} numberOfLines={1}>Offline Music</Text>
                    </Animated.View>
                    <Animated.View style={headerPlayButtonStyle}>
                        <TouchableOpacity
                            onPress={isCurrentPlaying ? pauseTrack : () => handlePlayAll(false)}
                            style={styles.stickyPlayButton}
                        >
                            {isCurrentPlaying ? (
                                <SharpPause size={22} color="black" />
                            ) : (
                                <SharpPlay size={22} color="black" style={{ marginLeft: 2 }} />
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </SafeAreaView>
            </Animated.View>

            <AnimatedFlashList
                ref={listRef}
                data={songs}
                keyExtractor={(item: any) => item.id}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                renderItem={({ item, index }: any) => (
                    <TrackListItem
                        track={item}
                        index={index}
                        isCurrent={currentTrack?.id === item.id}
                        onPress={() => handlePlayTrack(item, index)}
                    />
                )}
                ListHeaderComponent={
                    <DownloadsHeader
                        count={songs.length}
                        onPlayAll={handlePlayAll}
                        onToggleShuffle={toggleShuffle}
                        shuffleMode={shuffleMode}
                        isCurrentPlaying={isCurrentPlaying}
                        onPause={pauseTrack}
                    />
                }
                estimatedItemSize={70}
                contentContainerStyle={{ paddingBottom: 160 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                         <Download size={48} color={Colors.whiteAlpha20} />
                         <Text style={styles.emptyText}>No downloaded songs yet</Text>
                    </View>
                }
            />
            
            <CollectionOptions ref={optionsRef} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    backButtonContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        pointerEvents: 'box-none',
    },
    backButton: {
        width: 44,
        height: 44,
        marginLeft: 8,
        marginTop: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stickyHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 90,
        zIndex: 90,
    },
    stickyHeaderContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
    },
    stickyTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    stickyTitle: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
    },
    stickyPlayButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: ACCENT_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        paddingTop: 100,
        paddingBottom: 24,
        paddingHorizontal: 16,
    },
    headerGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    titleSection: {
        marginBottom: 24,
    },
    titleText: {
        color: Colors.textPrimary,
        fontSize: 25,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    metadataRow: {
        marginTop: 4,
    },
    metadataText: {
        color: Colors.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    leftControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 3
    },
    downloadIconBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    iconButton: {
        padding: 4,
    },
    shuffleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    shuffleDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: ACCENT_COLOR,
        position: 'absolute',
        bottom: -8,
    },
    playButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: ACCENT_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    emptyContainer: {
        paddingVertical: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: Colors.textSecondary,
        marginTop: 16,
        fontSize: 15,
        fontWeight: '500',
    }
});
