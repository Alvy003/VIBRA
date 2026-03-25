import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
console.warn('[Index] Entry point evaluated');
import TrackPlayer from 'react-native-track-player';

import { PlaybackService } from './services/playbackService';

// MUST be here, outside of any React tree, so the background service starts even if the app is killed
TrackPlayer.registerPlaybackService(() => PlaybackService);

export function App() {
    const ctx = require.context('./app');
    return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
