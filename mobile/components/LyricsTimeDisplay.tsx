import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useProgress } from 'react-native-track-player';

const formatTimeHelpers = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const LyricsTimeDisplay = React.memo(() => {
    const progress = useProgress();
    return (
        <View style={styles.lyricsTimeContainer}>
            <Text style={styles.lyricsTimeText}>{formatTimeHelpers(progress.position)}</Text>
            <Text style={styles.lyricsTimeText}>{formatTimeHelpers(progress.duration)}</Text>
        </View>
    );
});

LyricsTimeDisplay.displayName = 'LyricsTimeDisplay';
export default LyricsTimeDisplay;

const styles = StyleSheet.create({
    lyricsTimeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 25,
    },
    lyricsTimeText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '500',
        fontVariant: ['tabular-nums'],
    }
});
