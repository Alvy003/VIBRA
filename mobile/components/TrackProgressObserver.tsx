import React, { useEffect, useRef } from 'react';
import TrackPlayer from 'react-native-track-player';
import { LyricLine } from '@/lib/lyrics';

interface TrackProgressObserverProps {
    syncedLines: LyricLine[];
    onIndexChange: (index: number) => void;
}

const TrackProgressObserver = React.memo(({
    syncedLines,
    onIndexChange
}: TrackProgressObserverProps) => {
    const lastIndex = useRef<number>(-1);
    const isSeeking = useRef<boolean>(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const checkProgress = async () => {
            if (!syncedLines || syncedLines.length === 0) {
                if (lastIndex.current !== -1) {
                    lastIndex.current = -1;
                    onIndexChange(-1);
                }
                return;
            }

            try {
                const { position } = await TrackPlayer.getProgress();
                
                // Find active lyric line
                let newIndex = -1;
                for (let i = 0; i < syncedLines.length; i++) {
                    if (position >= syncedLines[i].time) {
                        newIndex = i;
                    } else {
                        break; // Lyrics are sorted by time usually
                    }
                }

                if (newIndex !== lastIndex.current) {
                    lastIndex.current = newIndex;
                    onIndexChange(newIndex);
                }
            } catch (err) {
                // Silently handle if TrackPlayer isn't ready
            }
        };

        interval = setInterval(checkProgress, 200);

        return () => clearInterval(interval);
    }, [syncedLines, onIndexChange]);

    return null;
});

TrackProgressObserver.displayName = 'TrackProgressObserver';
export default TrackProgressObserver;
