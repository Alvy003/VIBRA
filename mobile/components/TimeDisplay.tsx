import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useProgress } from 'react-native-track-player';

const formatTimeHelpers = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TimeDisplay = React.memo(() => {
    const progress = useProgress();
    return (
        <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTimeHelpers(progress.position)}</Text>
            <Text style={styles.timeText}>{formatTimeHelpers(progress.duration)}</Text>
        </View>
    );
});

TimeDisplay.displayName = 'TimeDisplay';
export default TimeDisplay;

const styles = StyleSheet.create({
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 25,
        marginBottom: 12,
        marginTop: 0,
    },
    timeText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    }
});
