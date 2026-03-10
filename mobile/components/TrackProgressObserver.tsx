import React, { useEffect, useRef } from 'react';
import { useProgress } from 'react-native-track-player';
import { LyricLine } from '@/lib/lyrics';

interface TrackProgressObserverProps {
    syncedLines: LyricLine[];
    onIndexChange: (index: number) => void;
    onDurationChange: (duration: number) => void;
}

const TrackProgressObserver = React.memo(({
    syncedLines,
    onIndexChange,
    onDurationChange
}: TrackProgressObserverProps) => {
    const progress = useProgress();
    const lastIndex = useRef<number>(-1);

    useEffect(() => {
        if (progress.duration > 0) {
            onDurationChange(progress.duration);
        }
    }, [progress.duration, onDurationChange]);

    useEffect(() => {
        if (!syncedLines || syncedLines.length === 0) {
            if (lastIndex.current !== -1) {
                lastIndex.current = -1;
                onIndexChange(-1);
            }
            return;
        }

        const currentPosition = progress.position;

        // Find active lyric line
        let newIndex = -1;
        for (let i = 0; i < syncedLines.length; i++) {
            if (currentPosition >= syncedLines[i].time) {
                newIndex = i;
            } else {
                break; // Lyrics are sorted by time usually
            }
        }

        if (newIndex !== lastIndex.current) {
            lastIndex.current = newIndex;
            onIndexChange(newIndex);
        }
    }, [progress.position, syncedLines, onIndexChange]);

    return null;
});

TrackProgressObserver.displayName = 'TrackProgressObserver';
export default TrackProgressObserver;
