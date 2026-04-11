import TrackPlayer, { Event, State, Capability, AppKilledPlaybackBehavior } from 'react-native-track-player';

// Minimalistic PlaybackService to isolate event bridge issues
export async function PlaybackService() {
    // console.warn('[PlaybackService] Service is booting (Headless Context)...');

    // Heartbeat for verification
    setInterval(async () => {
        try {
            const state = await TrackPlayer.getPlaybackState();
            // console.log('[PlaybackService] Heartbeat - State:', state.state);
        } catch (e) { }
    }, 5000);

    // --- RE-REGISTER CAPABILITIES FROM BACKGROUND ---
    // This helps Android 13/14 bridge the gap between main app and headless task
    try {
        await TrackPlayer.updateOptions({
            icon: require('../assets/images/vibra-512.png'),
            android: {
                appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
                alwaysPauseOnInterruption: true,
                // @ts-ignore
                stopForegroundServiceOnPause: false,
            },
            capabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
                Capability.SeekTo,
                Capability.Stop,
            ],
            compactCapabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
            ],
            notificationCapabilities: [
                Capability.Play,
                Capability.Pause,
                Capability.SkipToNext,
                Capability.SkipToPrevious,
                Capability.SeekTo,
                Capability.Stop,
            ],
        });
        // console.warn('[PlaybackService] updateOptions applied from background.');
    } catch (e) {
        // console.error('[PlaybackService] Failed to updateOptions:', e);
    }

    // --- Remote Event Listeners (using direct strings to be safe) ---

    // @ts-ignore
    TrackPlayer.addEventListener('remote-play', async () => {
        // console.warn('[PlaybackService] EVENT: remote-play');
        await TrackPlayer.play();
    });

    // @ts-ignore
    TrackPlayer.addEventListener('remote-pause', async () => {
        // console.warn('[PlaybackService] EVENT: remote-pause');
        await TrackPlayer.pause();
    });

    // @ts-ignore
    TrackPlayer.addEventListener('remote-next', async () => {
        // console.warn('[PlaybackService] EVENT: remote-next');
        await TrackPlayer.skipToNext();
    });

    // @ts-ignore
    TrackPlayer.addEventListener('remote-previous', async () => {
        // console.warn('[PlaybackService] EVENT: remote-previous');
        await TrackPlayer.skipToPrevious();
    });

    // @ts-ignore
    TrackPlayer.addEventListener('remote-stop', async () => {
        // console.warn('[PlaybackService] EVENT: remote-stop');
        await TrackPlayer.stop();
    });

    // @ts-ignore
    TrackPlayer.addEventListener('remote-seek', async (event: any) => {
        // console.warn('[PlaybackService] EVENT: remote-seek ->', event.position);
        await TrackPlayer.seekTo(event.position);
    });

    // @ts-ignore
    TrackPlayer.addEventListener('remote-jump-forward', async (event: any) => {
        // console.warn('[PlaybackService] EVENT: remote-jump-forward');
        const pos = await TrackPlayer.getPosition();
        await TrackPlayer.seekTo(pos + (event.interval || 15));
    });

    // @ts-ignore
    TrackPlayer.addEventListener('remote-jump-backward', async (event: any) => {
        // console.warn('[PlaybackService] EVENT: remote-jump-backward');
        const pos = await TrackPlayer.getPosition();
        await TrackPlayer.seekTo(Math.max(0, pos - (event.interval || 15)));
    });

    // --- Observer Listeners ---
    TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
        // console.log('[PlaybackService] Native State Change:', event.state);
    });

    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
        // console.log('[PlaybackService] Native Track Change:', event.track?.title || 'None');
    });

    // console.warn('[PlaybackService] Listeners registered successfully.');
}
