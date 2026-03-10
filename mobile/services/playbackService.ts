// services/playbackService.ts
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { usePlayerStore } from '@/stores/usePlayerStore';

// This runs in a separate JS context for background playback
export async function PlaybackService() {
    console.log('[PlaybackService] Service is successfully booting up');

    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        console.log('[PlaybackService] -> RemotePlay Event Fired!');
        try {
            await TrackPlayer.play();
            usePlayerStore.setState({ isPlaying: true });
        } catch (err) {
            console.error('[PlaybackService] Play error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemotePause, async () => {
        console.log('[PlaybackService] -> RemotePause Event Fired!');
        try {
            await TrackPlayer.pause();
            usePlayerStore.setState({ isPlaying: false });
        } catch (err) {
            console.error('[PlaybackService] Pause error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        console.log('[PlaybackService] -> RemoteNext Event Fired!');
        try {
            await usePlayerStore.getState().playNext();
        } catch (err) {
            console.error('[PlaybackService] Next error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        console.log('[PlaybackService] -> RemotePrevious Event Fired!');
        try {
            await usePlayerStore.getState().playPrevious();
        } catch (err) {
            console.error('[PlaybackService] Previous error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
        try {
            await TrackPlayer.seekTo(event.position);
        } catch (err) {
            console.error('[PlaybackService] Seek error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        try {
            await TrackPlayer.stop();
            usePlayerStore.setState({ isPlaying: false, currentTrack: null });
        } catch (err) {
            console.error('[PlaybackService] Stop error:', err);
        }
    });

    // Handle playback state changes
    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
        const { state } = event;

        if (state === State.Playing) {
            usePlayerStore.setState({ isPlaying: true });
        } else if (state === State.Paused || state === State.Stopped) {
            usePlayerStore.setState({ isPlaying: false });
        } else if (state === State.Error) {
            console.error('[PlaybackService] Playback error');
            // Try to recover by playing next track
            const store = usePlayerStore.getState();
            if (store.queue.length > store.currentIndex + 1) {
                await store.playNext();
            }
        }
    });

    // Handle track changes
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
        if (event.track) {
            const index = event.index ?? -1;
            usePlayerStore.setState({
                currentTrack: event.track,
                currentIndex: index,
            });

            // Background preload upcoming track URLs to prevent auto-play failure
            usePlayerStore.getState().preloadUpcomingTracks();
        }
    });

    // Handle queue ending
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (event) => {
        const store = usePlayerStore.getState();

        if (store.repeatMode === 'queue' && store.queue.length > 0) {
            // Restart queue
            await TrackPlayer.skip(0);
            await TrackPlayer.play();
        } else {
            usePlayerStore.setState({ isPlaying: false });
        }
    });

    // Handle playback errors
    TrackPlayer.addEventListener(Event.PlaybackError, async (event) => {
        console.error('[PlaybackService] Playback error:', event);

        // Try to recover
        const store = usePlayerStore.getState();
        const currentTrack = store.currentTrack;

        // For YouTube tracks, try refreshing the URL
        if (currentTrack && (currentTrack as any).source === 'youtube') {
            try {
                const newUrl = await store.resolveAudioUrl(currentTrack);
                if (newUrl) {
                    const index = await TrackPlayer.getActiveTrackIndex();
                    if (index !== undefined) {
                        await TrackPlayer.remove(index);
                        await TrackPlayer.add([{ ...currentTrack, url: newUrl }], index);
                        await TrackPlayer.skip(index);
                        await TrackPlayer.play();
                        return;
                    }
                }
            } catch (e) {
                console.error('[PlaybackService] Recovery failed:', e);
            }
        }

        // If recovery fails, skip to next
        if (store.queue.length > store.currentIndex + 1) {
            await store.playNext();
        }
    });
}