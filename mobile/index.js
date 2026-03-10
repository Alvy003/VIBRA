import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import TrackPlayer from 'react-native-track-player';

// MUST be here, outside of any React tree, so the background service starts even if the app is killed
TrackPlayer.registerPlaybackService(() => require('./services/playbackService').PlaybackService);

export function App() {
    const ctx = require.context('./app');
    return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
