// lib/trackPlayerSetup.ts
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
  Event,
} from 'react-native-track-player';

let isSetup = false;

export async function setupPlayer(): Promise<boolean> {
  if (isSetup) return true;

  try {
    await TrackPlayer.setupPlayer({
      // Buffer settings for smooth playback
      minBuffer: 15,        // Minimum buffer in seconds
      maxBuffer: 50,        // Maximum buffer in seconds
      playBuffer: 2.5,      // Start playing when this much is buffered
      backBuffer: 30,       // Keep this much behind current position

      // iOS specific
      waitForBuffer: true,
      autoHandleInterruptions: true,
    });

    await TrackPlayer.updateOptions({
      // Android notification settings
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        alwaysPauseOnInterruption: true,
      },

      // Capabilities for lock screen controls
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],

      // Compact notification capabilities
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],

      // Progress updating
      progressUpdateEventInterval: 1,
    });

    // Set default repeat mode
    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    isSetup = true;
    console.log('[TrackPlayer] Setup complete');
    return true;
  } catch (error) {
    console.error('[TrackPlayer] Setup failed:', error);
    return false;
  }
}

export async function resetPlayer(): Promise<void> {
  try {
    await TrackPlayer.reset();
  } catch (error) {
    console.error('[TrackPlayer] Reset failed:', error);
  }
}

export { isSetup };