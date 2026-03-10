import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useArtistStore } from '@/stores/useArtistStore';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ArtistModal = React.memo(() => {
    const insets = useSafeAreaInsets();
    const currentTrack = usePlayerStore((state) => state.currentTrack);
    const artistCache = useArtistStore((state) => state.artistCache);
    const isArtistModalVisible = usePlayerUIStore((state) => state.isArtistModalVisible);
    const setArtistModalVisible = usePlayerUIStore((state) => state.setArtistModalVisible);

    if (!currentTrack?.artist) return null;

    const artistInfo = currentTrack.artist ? artistCache[currentTrack.artist] : undefined;
    if (!artistInfo) return null;

    const hasArtistImage = !!(artistInfo?.imageUrl);
    const backgroundImage = artistInfo?.imageUrl || currentTrack.artwork;

    const formatListeners = (count?: number) => {
        if (!count) return null;
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M monthly listeners`;
        }
        if (count >= 1000) {
            return `${(count / 1000).toFixed(0)}K monthly listeners`;
        }
        return `${count} monthly listeners`;
    };

    return (
        <Modal
            visible={isArtistModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setArtistModalVisible(false)}
        >
            <View style={styles.artistModalContainer}>
                {/* Header Image */}
                <View style={styles.artistModalImageContainer}>
                    <Image
                        source={typeof backgroundImage === 'string' ? { uri: backgroundImage } : backgroundImage}
                        style={styles.artistModalImage}
                        contentFit="cover"
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)', '#121212']}
                        locations={[0.3, 0.7, 1]}
                        style={styles.artistModalImageGradient}
                    />

                    {/* Close Button */}
                    <TouchableOpacity
                        style={[styles.artistModalCloseButton, { top: insets.top + 8 }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setArtistModalVisible(false);
                        }}
                        activeOpacity={0.7}
                    >
                        <ChevronDown size={28} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <Animated.ScrollView
                    style={styles.artistModalContent}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.artistModalName}>{artistInfo?.name || currentTrack?.artist?.split(',')[0].trim()}</Text>

                    {artistInfo?.listeners && (
                        <Text style={styles.artistModalListeners}>
                            {formatListeners(artistInfo.listeners)}
                        </Text>
                    )}

                    {artistInfo?.fullBio && (
                        <View style={styles.artistModalBioSection}>
                            <Text style={styles.artistModalBioTitle}>About</Text>
                            <Text style={styles.artistModalBioText}>{artistInfo.fullBio}</Text>
                        </View>
                    )}
                </Animated.ScrollView>
            </View>
        </Modal>
    );
});

ArtistModal.displayName = 'ArtistModal';
export default ArtistModal;

const styles = StyleSheet.create({
    artistModalContainer: {
        flex: 1,
        backgroundColor: '#121212',
    },
    artistModalImageContainer: {
        height: SCREEN_HEIGHT * 0.45,
        position: 'relative',
    },
    artistModalImage: {
        width: '100%',
        height: '100%',
    },
    artistModalImageGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    artistModalCloseButton: {
        position: 'absolute',
        left: 16,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 22,
    },
    artistModalContent: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: -40,
    },
    artistModalName: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 8,
    },
    artistModalListeners: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 24,
    },
    artistModalBioSection: {
        marginTop: 8,
    },
    artistModalBioTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
    },
    artistModalBioText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15,
        lineHeight: 24,
    },
});
